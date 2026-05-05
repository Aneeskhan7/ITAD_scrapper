/**
 * One-shot backfill: enqueues recent Result rows onto keyword-scan-queue.
 * Run with: npx tsx src/scripts/backfill-scans.ts [--days=7] [--projectId=xxx]
 *
 * Safe to re-run — the scanner uses skipDuplicates on insert.
 */
import 'dotenv/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const scanQueue = new Queue('keyword-scan-queue', { connection: redis });

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(a => a.replace(/^--/, '').split('=') as [string, string])
  );

  const days = parseInt(args['days'] ?? '7', 10);
  const projectId = args['projectId'] ?? undefined;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  console.log(`[backfill] Enqueuing Results since ${since.toISOString()}${projectId ? ` for project ${projectId}` : ''}`);

  const results = await prisma.result.findMany({
    where: {
      foundAt: { gte: since },
      fullText: { not: null },
      ...(projectId ? { projectId } : {}),
    },
    select: { id: true },
    orderBy: { foundAt: 'asc' },
  });

  console.log(`[backfill] Found ${results.length} result(s) to enqueue`);

  for (const r of results) {
    await scanQueue.add('scan', { resultId: r.id });
  }

  console.log(`[backfill] Done — ${results.length} jobs added to keyword-scan-queue`);
  await redis.quit();
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('[backfill] Fatal:', err);
  process.exit(1);
});
