import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import safeRegex from 'safe-regex';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = new PrismaClient();

const MAX_HITS_PER_KEYWORD = 20;
const CONTEXT_WINDOW = 200; // chars on each side of match

// ── Match helpers ────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface MatchResult {
  matchedText: string;
  position: number;
  context: string;
}

function extractContext(text: string, start: number, end: number): string {
  const ctxStart = Math.max(0, start - CONTEXT_WINDOW);
  const ctxEnd = Math.min(text.length, end + CONTEXT_WINDOW);
  return text.slice(ctxStart, ctxEnd);
}

function matchContains(text: string, keyword: string, caseSensitive: boolean): MatchResult[] {
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? keyword : keyword.toLowerCase();
  const results: MatchResult[] = [];
  let offset = 0;
  while (results.length < MAX_HITS_PER_KEYWORD) {
    const idx = haystack.indexOf(needle, offset);
    if (idx === -1) break;
    results.push({
      matchedText: text.slice(idx, idx + keyword.length),
      position: idx,
      context: extractContext(text, idx, idx + keyword.length),
    });
    offset = idx + 1;
  }
  return results;
}

function matchExact(text: string, keyword: string, caseSensitive: boolean): MatchResult[] {
  const flags = caseSensitive ? 'g' : 'gi';
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, flags);
  const results: MatchResult[] = [];
  let m: RegExpExecArray | null;
  while (results.length < MAX_HITS_PER_KEYWORD && (m = pattern.exec(text)) !== null) {
    results.push({
      matchedText: m[0],
      position: m.index,
      context: extractContext(text, m.index, m.index + m[0].length),
    });
  }
  return results;
}

function matchRegex(text: string, rawPattern: string, caseSensitive: boolean): MatchResult[] {
  if (rawPattern.length > 200) {
    console.warn(`[scanner] regex pattern too long (${rawPattern.length} chars), skipping`);
    return [];
  }
  if (!safeRegex(rawPattern)) {
    console.warn(`[scanner] unsafe regex rejected: ${rawPattern}`);
    return [];
  }
  let pattern: RegExp;
  try {
    const flags = caseSensitive ? 'g' : 'gi';
    pattern = new RegExp(rawPattern, flags);
  } catch {
    console.warn(`[scanner] invalid regex: ${rawPattern}`);
    return [];
  }

  const results: MatchResult[] = [];
  const deadline = Date.now() + 50; // 50ms hard cap
  let m: RegExpExecArray | null;
  while (results.length < MAX_HITS_PER_KEYWORD && (m = pattern.exec(text)) !== null) {
    if (Date.now() > deadline) {
      console.warn(`[scanner] regex timed out on pattern: ${rawPattern}`);
      break;
    }
    results.push({
      matchedText: m[0],
      position: m.index,
      context: extractContext(text, m.index, m.index + m[0].length),
    });
    // Guard against zero-length match infinite loop
    if (m[0].length === 0) pattern.lastIndex++;
  }
  return results;
}

// ── Worker ───────────────────────────────────────────────────────────────────

async function processJob(job: Job) {
  const { resultId } = job.data as { resultId: string };

  const result = await prisma.result.findUnique({
    where: { id: resultId },
    select: { id: true, userId: true, projectId: true, websiteId: true, url: true, title: true, fullText: true },
  });

  if (!result || !result.fullText) {
    console.warn(`[scanner] result ${resultId} not found or has no fullText — skipping`);
    return;
  }

  const keywords = await prisma.watchKeyword.findMany({
    where: {
      userId: result.userId,
      status: 'active',
      OR: [
        // Applies to all websites in this project
        { projectId: result.projectId, websiteId: null },
        // Applies to this specific website
        { projectId: result.projectId, websiteId: result.websiteId },
      ],
    },
  });

  if (keywords.length === 0) return;

  const hitsToInsert: Array<{
    watchKeywordId: string;
    userId: string;
    websiteId: string;
    projectId: string;
    resultId: string;
    pageUrl: string;
    pageTitle: string | null;
    matchedText: string;
    context: string;
    position: number;
  }> = [];

  const hitCountByKeyword = new Map<string, number>();

  for (const kw of keywords) {
    let matches: MatchResult[] = [];

    switch (kw.matchMode) {
      case 'contains':
        matches = matchContains(result.fullText, kw.keyword, kw.caseSensitive);
        break;
      case 'exact':
        matches = matchExact(result.fullText, kw.keyword, kw.caseSensitive);
        break;
      case 'regex':
        matches = matchRegex(result.fullText, kw.keyword, kw.caseSensitive);
        break;
      case 'fuzzy':
        // Deferred: pg_trgm similarity match — implement in Step 3.x
        console.warn(`[scanner] fuzzy matchMode not yet implemented for keyword ${kw.id}, skipping`);
        continue;
      default:
        console.warn(`[scanner] unknown matchMode "${kw.matchMode}" for keyword ${kw.id}`);
        continue;
    }

    if (matches.length === 0) continue;

    hitCountByKeyword.set(kw.id, matches.length);

    for (const match of matches) {
      hitsToInsert.push({
        watchKeywordId: kw.id,
        userId: result.userId,
        websiteId: result.websiteId,
        projectId: result.projectId,
        resultId: result.id,
        pageUrl: result.url,
        pageTitle: result.title ?? null,
        matchedText: match.matchedText,
        context: match.context,
        position: match.position,
      });
    }
  }

  if (hitsToInsert.length === 0) return;

  // Idempotent batch insert — unique on (watchKeywordId, resultId, position)
  await prisma.keywordHit.createMany({
    data: hitsToInsert,
    skipDuplicates: true,
  });

  // Update hitCount and lastHitAt per keyword
  // We use skipDuplicates so actual new rows may be fewer, but for
  // hitCount we track the newly matched count (not the persisted count)
  // to avoid a second round-trip querying what was skipped.
  await Promise.all(
    Array.from(hitCountByKeyword.entries()).map(([kwId, count]) =>
      prisma.watchKeyword.update({
        where: { id: kwId },
        data: { hitCount: { increment: count }, lastHitAt: new Date() },
      })
    )
  );

  const totalNew = hitsToInsert.length;
  const kwCount = hitCountByKeyword.size;
  console.log(`[scanner] ✓ result ${resultId} — ${totalNew} hit(s) across ${kwCount} keyword(s)`);
}

const worker = new Worker('keyword-scan-queue', processJob, {
  connection: redis,
  concurrency: 5,
});

worker.on('failed', (job, err) => {
  console.error(`[scanner] ✗ job ${job?.id} failed: ${err.message}`);
});

worker.on('error', err => console.error('[scanner]', err.message));

console.log('[scanner] worker started');
