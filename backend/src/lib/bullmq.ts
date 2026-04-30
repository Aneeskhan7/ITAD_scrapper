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

export const DLQ_STREAM = 'dlq-stream';
