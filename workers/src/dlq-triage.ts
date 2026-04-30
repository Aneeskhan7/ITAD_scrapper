import 'dotenv/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const scrapeQueue = new Queue('scrape-queue', { connection: redis });
const DLQ_STREAM = 'dlq-stream';
const CONSUMER_GROUP = 'dlq-triage';
const CONSUMER_NAME = 'triage-1';

const TRANSIENT_ERRORS = new Set(['timeout', 'proxy_exhaustion', '5xx']);
const PERMANENT_ERRORS = new Set(['404', 'domain_expired']);

async function setup() {
  try {
    await redis.xgroup('CREATE', DLQ_STREAM, CONSUMER_GROUP, '0', 'MKSTREAM');
  } catch { /* group already exists */ }
}

async function triage() {
  const messages = await redis.xreadgroup(
    'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
    'COUNT', '10', 'BLOCK', '1000', 'STREAMS', DLQ_STREAM, '>'
  ) as Array<[string, Array<[string, string[]]>]> | null;

  if (!messages) return;

  for (const [_stream, entries] of messages) {
    for (const [msgId, fields] of entries) {
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) data[fields[i]] = fields[i + 1];

      const { projectId, websiteId, userId, url, errorType, payload } = data;
      if (!projectId || !userId || !url) continue;

      let parsedPayload: Record<string, unknown> = {};
      try { parsedPayload = JSON.parse(payload); } catch { /* skip */ }

      // Write to PostgreSQL
      await prisma.dlqEvent.create({
        data: { projectId, websiteId, userId, url, errorType, payload: parsedPayload, status: 'pending' },
      }).catch(() => { /* may already exist */ });

      // Auto-triage transient errors
      if (TRANSIENT_ERRORS.has(errorType)) {
        const delay = 5 * 60_000; // 5 min backoff
        await scrapeQueue.add('scrape', parsedPayload, { delay, priority: 8 });
        console.log(`[dlq-triage] auto-retry (transient): ${url}`);
      } else if (PERMANENT_ERRORS.has(errorType)) {
        await prisma.dlqEvent.updateMany({
          where: { url, status: 'pending' },
          data: { status: 'archived', resolvedAt: new Date() },
        });
        console.log(`[dlq-triage] archived (permanent): ${url}`);
      }

      await redis.xack(DLQ_STREAM, CONSUMER_GROUP, msgId);
    }
  }
}

async function run() {
  await setup();
  console.log('[dlq-triage] started');
  while (true) {
    await triage().catch(err => console.error('[dlq-triage]', err.message));
    await new Promise(r => setTimeout(r, 30_000));
  }
}

run().catch(err => { console.error(err); process.exit(1); });
