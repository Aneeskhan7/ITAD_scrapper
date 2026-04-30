import { prisma } from '../../backend/src/lib/prisma';

const LEARNING_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Minimum occurrences before promoting a candidate to the corpus
const MIN_MATCH_THRESHOLD = 5;

// Regex patterns that indicate procurement-related anchor/URL text
const PROCUREMENT_SIGNALS = [
  /bid/i, /rfp/i, /rfq/i, /tender/i, /solicitation/i, /procurement/i,
  /auction/i, /surplus/i, /itad/i, /disposal/i, /decommission/i,
  /award/i, /contract/i, /quote/i, /proposal/i, /opportunity/i,
];

interface CandidateTerm {
  term: string;
  count: number;
}

async function extractCandidatesFromResults(): Promise<CandidateTerm[]> {
  const recentResults = await prisma.result.findMany({
    where: {
      classification: { in: ['bidding', 'selling'] },
      confidence: { gte: 0.75 },
      foundAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { title: true, url: true },
    take: 500,
  });

  const termCounts = new Map<string, number>();

  for (const result of recentResults) {
    const text = `${result.title ?? ''} ${result.url}`.toLowerCase();
    const words = text.match(/\b[a-z]{4,20}\b/g) ?? [];

    for (const word of words) {
      if (PROCUREMENT_SIGNALS.some(re => re.test(word))) {
        termCounts.set(word, (termCounts.get(word) ?? 0) + 1);
      }
    }
  }

  return Array.from(termCounts.entries())
    .filter(([, count]) => count >= MIN_MATCH_THRESHOLD)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
}

async function upsertLearnedPatterns(candidates: CandidateTerm[]) {
  const existingKeywords = await prisma.targetPattern.findMany({
    select: { keyword: true },
  });
  const existingSet = new Set(existingKeywords.map(p => p.keyword));

  let added = 0;
  let updated = 0;

  for (const { term, count } of candidates) {
    if (existingSet.has(term)) {
      await prisma.targetPattern.update({
        where: { keyword: term },
        data: {
          matchCount: { increment: count },
          lastMatched: new Date(),
          confidenceScore: { increment: 0.01 },
        },
      });
      updated++;
    } else {
      const confidence = Math.min(0.5 + (count / 50) * 0.4, 0.9);
      await prisma.targetPattern.create({
        data: {
          keyword: term,
          source: 'learned',
          confidenceScore: confidence,
          matchCount: count,
          firstSeen: new Date(),
          lastMatched: new Date(),
          status: 'active',
        },
      });
      added++;
    }
  }

  return { added, updated };
}

async function pruneStalePatterns() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const pruned = await prisma.targetPattern.updateMany({
    where: {
      source: 'learned',
      status: 'active',
      lastMatched: { lt: cutoff },
      matchCount: { lt: 10 },
    },
    data: { status: 'archived' },
  });

  return pruned.count;
}

async function run() {
  console.log('[pattern-learner] Starting pattern learning cycle');

  try {
    const candidates = await extractCandidatesFromResults();
    console.log(`[pattern-learner] Found ${candidates.length} candidate terms`);

    const { added, updated } = await upsertLearnedPatterns(candidates);
    console.log(`[pattern-learner] Patterns: +${added} new, ${updated} updated`);

    const pruned = await pruneStalePatterns();
    if (pruned > 0) console.log(`[pattern-learner] Archived ${pruned} stale patterns`);
  } catch (err) {
    console.error('[pattern-learner] Error:', err);
  }
}

run().then(() => {
  setInterval(run, LEARNING_INTERVAL_MS);
  console.log(`[pattern-learner] Scheduled every ${LEARNING_INTERVAL_MS / 60000}min`);
});
