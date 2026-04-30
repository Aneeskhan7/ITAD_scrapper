import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { classifyPage } from './classifier';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const DLQ_STREAM = 'dlq-stream';

// ── Seed keywords loaded at startup ────────────────────────────────────────
let KEYWORDS: string[] = [];

async function loadKeywords() {
  const patterns = await prisma.targetPattern.findMany({
    where: { status: { in: ['active', 'pinned'] } },
    select: { keyword: true },
  });
  KEYWORDS = patterns.map(p => p.keyword);
}

// ── Link prioritization (5 signals) ────────────────────────────────────────
function scoreUrl(url: string, anchorText: string, depth: number, historicalDomains: Set<string>): number {
  let score = 0;
  const combined = (url + ' ' + anchorText).toLowerCase();

  // 40% — keyword match
  const kwMatch = KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));
  score += kwMatch ? 0.40 : 0;

  // 20% — structural depth (fewer segments = higher score)
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean).length;
    score += 0.20 * (1 / (segments + 1));
  } catch { /* invalid url */ }

  // 20% — freshness (URL contains year/date pattern)
  const freshnessPattern = /\b(2024|2025|2026|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
  score += freshnessPattern.test(url) ? 0.20 : 0;

  // 15% — historical yield (domain seen before producing results)
  try {
    const domain = new URL(url).hostname;
    score += historicalDomains.has(domain) ? 0.15 : 0;
  } catch { /* invalid url */ }

  // 5% — sibling context (always minor boost if page is internal)
  score += 0.05;

  return Math.min(1, score);
}

// ── Scraper ─────────────────────────────────────────────────────────────────
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  }
  return browser;
}

async function fetchPage(url: string): Promise<{ title: string; body: string; links: Array<{ url: string; text: string }> }> {
  const b = await getBrowser();
  const page: Page = await b.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    const title = await page.title();
    const body = await page.evaluate(() => document.body?.innerText ?? '');
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map(a => ({
        url: (a as HTMLAnchorElement).href,
        text: (a as HTMLAnchorElement).innerText?.slice(0, 100) ?? '',
      }))
    );
    return { title, body, links };
  } finally {
    await page.close();
  }
}

function fetchPageStatic(html: string, baseUrl: string): { title: string; body: string; links: Array<{ url: string; text: string }> } {
  const $ = cheerio.load(html);
  const title = $('title').text().trim();
  const body = $('body').text().replace(/\s+/g, ' ').trim();
  const links: Array<{ url: string; text: string }> = [];
  $('a[href]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    try { links.push({ url: new URL(href, baseUrl).href, text: $(el).text().slice(0, 100) }); } catch { /* skip */ }
  });
  return { title, body, links };
}

// ── Worker ──────────────────────────────────────────────────────────────────
async function processJob(job: Job) {
  const { jobId, websiteId, projectId, userId, url, depth, crawlBudget } = job.data as {
    jobId: string; websiteId: string; projectId: string; userId: string;
    url: string; depth: number; crawlBudget: number;
  };

  await prisma.job.update({ where: { id: jobId }, data: { status: 'active', startedAt: new Date() } });
  await prisma.website.update({ where: { id: websiteId }, data: { status: 'crawling' } });

  const historicalDomains = new Set<string>(
    (await prisma.result.findMany({ where: { projectId }, select: { url: true }, take: 500 }))
      .map(r => { try { return new URL(r.url).hostname; } catch { return ''; } })
      .filter(Boolean)
  );

  await loadKeywords();

  const visited = new Set<string>();
  const queue: Array<{ url: string; text: string; score: number; currentDepth: number }> = [
    { url, text: '', score: 1, currentDepth: 0 },
  ];
  let pagesScraped = 0;
  let startedAt = Date.now();

  while (queue.length > 0 && pagesScraped < crawlBudget) {
    // Sort by score descending, take highest priority
    queue.sort((a, b) => b.score - a.score);
    const current = queue.shift()!;

    if (visited.has(current.url)) continue;
    visited.add(current.url);

    let pageData: { title: string; body: string; links: Array<{ url: string; text: string }> };
    try {
      pageData = await fetchPage(current.url);
    } catch (err) {
      console.warn(`[scraper] fetch failed: ${current.url} — ${(err as Error).message}`);
      continue;
    }

    pagesScraped++;

    // Classify with Ollama
    const classification = await classifyPage(current.url, pageData.title, pageData.body);

    // Store result if high-value
    if (classification.classification === 'bidding' || classification.classification === 'selling') {
      await prisma.result.create({
        data: {
          websiteId, projectId, userId,
          url: current.url,
          title: pageData.title,
          bodySnippet: pageData.body.slice(0, 500),
          classification: classification.classification,
          confidence: classification.confidence,
          reason: classification.reason,
        },
      });
    }

    // Queue child links if not at max depth
    if (current.currentDepth < depth) {
      const origin = (() => { try { return new URL(url).origin; } catch { return ''; } })();
      for (const link of pageData.links) {
        if (!visited.has(link.url) && link.url.startsWith(origin)) {
          const score = scoreUrl(link.url, link.text, current.currentDepth + 1, historicalDomains);
          queue.push({ url: link.url, text: link.text, score, currentDepth: current.currentDepth + 1 });
        }
      }
    }
  }

  // Calculate yield rate
  const valueResults = await prisma.result.count({
    where: { websiteId, classification: { in: ['bidding', 'selling'] } },
  });
  const yieldRate = pagesScraped > 0 ? (valueResults / pagesScraped) * 100 : 0;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'completed', pagesScraped, completedAt: new Date(), duration: Date.now() - startedAt },
  });
  await prisma.website.update({
    where: { id: websiteId },
    data: { status: 'idle', lastCrawled: new Date(), totalPages: pagesScraped, yieldRate },
  });

  console.log(`[scraper] ✓ ${url} — ${pagesScraped} pages, ${valueResults} results`);
}

async function handleFailure(job: Job, error: Error) {
  const { jobId, websiteId, projectId, userId, url } = job.data as Record<string, string>;

  let errorType = 'unknown';
  const msg = error.message.toLowerCase();
  if (msg.includes('timeout')) errorType = 'timeout';
  else if (msg.includes('403') || msg.includes('blocked')) errorType = '403_blocked';
  else if (msg.includes('proxy')) errorType = 'proxy_exhaustion';
  else if (msg.includes('parse')) errorType = 'parse_failure';
  else if (msg.includes('enotfound') || msg.includes('expired')) errorType = 'domain_expired';

  // Push to DLQ stream
  await redis.xadd(DLQ_STREAM, '*',
    'jobId', jobId, 'websiteId', websiteId, 'projectId', projectId,
    'userId', userId, 'url', url, 'errorType', errorType,
    'payload', JSON.stringify(job.data), 'occurredAt', new Date().toISOString()
  );

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'failed', errorType, errorDetail: error.message, completedAt: new Date() },
  });
  await prisma.website.update({ where: { id: websiteId }, data: { status: 'failed' } });

  console.error(`[scraper] ✗ DLQ: ${url} (${errorType})`);
}

const worker = new Worker('scrape-queue', processJob, {
  connection: redis,
  concurrency: 3,
});

worker.on('failed', (job, err) => {
  if (job && job.attemptsMade >= 3) handleFailure(job, err).catch(console.error);
});

worker.on('error', err => console.error('[worker]', err.message));

console.log('[scraper] worker started');
