import { Queue } from 'bullmq';
import { redis } from './redis';

export const scrapeQueue = new Queue('scrape-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
  },
});

// Step 3 — scanner queue. Producer hooks: scraper (after Result persist) + manual backfill.
// Consumer: workers/src/keyword-scanner.ts
export const KEYWORD_SCAN_QUEUE = 'keyword-scan-queue';

export const keywordScanQueue = new Queue(KEYWORD_SCAN_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 200 },
  },
});

export const DLQ_STREAM = 'dlq-stream';
