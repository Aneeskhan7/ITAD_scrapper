import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { scrapeQueue } from '../lib/bullmq';
import { verifyJWT, requireAdmin } from '../middleware/auth';

const router = Router();
router.use(verifyJWT, requireAdmin);

// ── Agents ──────────────────────────────────────────────
router.get('/agents', async (_req, res, next) => {
  try {
    const agents = await prisma.agentRegistry.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(agents);
  } catch (err) { next(err); }
});

router.post('/agents/:id/drain', async (req, res, next) => {
  try {
    await prisma.agentRegistry.updateMany({ where: { agentId: req.params.id }, data: { status: 'draining' } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/agents/:id/terminate', async (req, res, next) => {
  try {
    await prisma.agentRegistry.updateMany({
      where: { agentId: req.params.id },
      data: { status: 'terminated', currentJob: null, currentUrl: null, cpuPercent: 0 },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Queue ────────────────────────────────────────────────
router.get('/queue/stats', async (_req, res, next) => {
  try {
    const counts = await scrapeQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    res.json({
      depth: (counts.waiting ?? 0) + (counts.active ?? 0),
      processing: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
    });
  } catch (err) { next(err); }
});

router.get('/queue/jobs', async (req: any, res: any, next: any) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const where = status && status !== 'all' ? { status } : {};
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json({ jobs });
  } catch (err) { next(err); }
});

// ── Admin DLQ ────────────────────────────────────────────
router.get('/dlq', async (req: any, res: any, next: any) => {
  try {
    const errorType = req.query.errorType as string | undefined;
    const where = errorType ? { errorType } : {};
    const events = await prisma.dlqEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ events });
  } catch (err) { next(err); }
});

router.get('/dlq/stats', async (_req: any, res: any, next: any) => {
  try {
    const [total, pending] = await Promise.all([
      prisma.dlqEvent.count(),
      prisma.dlqEvent.count({ where: { status: 'pending' } }),
    ]);
    const failureRate = total > 0 ? pending / total : 0;
    res.json({ total, pending, failureRate });
  } catch (err) { next(err); }
});

router.post('/dlq/:id/retry', async (req: any, res: any, next: any) => {
  try {
    const event = await prisma.dlqEvent.findUnique({ where: { id: req.params.id } });
    if (!event) { res.status(404).json({ error: 'Not found' }); return; }
    await scrapeQueue.add('scrape', event.payload as Record<string, unknown>, { priority: 5 });
    await prisma.dlqEvent.update({ where: { id: event.id }, data: { status: 'retried', resolvedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/dlq/retry-all', async (_req, res, next) => {
  try {
    const pending = await prisma.dlqEvent.findMany({ where: { status: 'pending' } });
    for (const e of pending) await scrapeQueue.add('scrape', e.payload as Record<string, unknown>, { priority: 5 });
    await prisma.dlqEvent.updateMany({ where: { status: 'pending' }, data: { status: 'retried', resolvedAt: new Date() } });
    res.json({ count: pending.length });
  } catch (err) { next(err); }
});

// ── Proxies ──────────────────────────────────────────────
router.get('/proxies', async (_req, res, next) => {
  try {
    const proxies = await prisma.proxyHealth.findMany({ orderBy: [{ tier: 'asc' }, { successRate: 'desc' }] });
    res.json(proxies);
  } catch (err) { next(err); }
});

router.post('/proxies/:id/demote', async (req: any, res: any, next: any) => {
  try {
    const proxy = await prisma.proxyHealth.findUnique({ where: { id: req.params.id } });
    if (!proxy || proxy.tier >= 3) { res.status(400).json({ error: 'Cannot demote' }); return; }
    await prisma.proxyHealth.update({ where: { id: req.params.id }, data: { tier: proxy.tier + 1, status: 'idle' } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/proxies/:id/restore', async (req, res, next) => {
  try {
    await prisma.proxyHealth.update({
      where: { id: req.params.id },
      data: { status: 'active', successRate: 0.70, cooldownUntil: null },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── AI Classifier ────────────────────────────────────────
const aiModeStore = { mode: 'auto' as 'auto' | 'manual' };

router.get('/ai/stats', async (_req: any, res: any, next: any) => {
  try {
    const [total, byClass] = await Promise.all([
      prisma.result.count(),
      prisma.result.groupBy({ by: ['classification'], _count: { _all: true } }),
    ]);
    const dist: Record<string, number> = { bidding: 0, selling: 0, informational: 0, irrelevant: 0 };
    for (const row of byClass) dist[row.classification] = (row._count as any)._all ?? 0;

    const confidenceAgg = await prisma.result.aggregate({ _avg: { confidence: true } });
    res.json({
      totalClassifications: total,
      bidding: dist.bidding,
      selling: dist.selling,
      informational: dist.informational,
      irrelevant: dist.irrelevant,
      avgConfidence: confidenceAgg._avg.confidence ?? 0,
      avgLatencyMs: 180,
      fallbackCount: 0,
      mode: aiModeStore.mode,
    });
  } catch (err) { next(err); }
});

router.post('/ai/mode', async (req: any, res: any, next: any) => {
  try {
    const { mode } = z.object({ mode: z.enum(['auto', 'manual']) }).parse(req.body);
    aiModeStore.mode = mode;
    res.json({ mode });
  } catch (err) { next(err); }
});

router.post('/ai/test', async (req: any, res: any, next: any) => {
  try {
    const { url, title, bodySnippet } = z.object({
      url: z.string(),
      title: z.string().optional().default(''),
      bodySnippet: z.string().optional().default(''),
    }).parse(req.body);

    const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL ?? 'llama3.2';
    const prompt = `Classify this web page for an ITAD procurement intelligence system.\nURL: ${url}\nTitle: ${title}\nContent: ${bodySnippet.slice(0, 500)}\n\nRespond with JSON only:\n{"classification": "bidding|selling|informational|irrelevant", "confidence": 0.0-1.0, "reason": "one sentence"}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await response.json() as { response: string };
      const result = JSON.parse(data.response);
      res.json(result);
    } catch {
      clearTimeout(timeout);
      res.json({ classification: 'informational', confidence: 0, reason: 'Ollama unavailable or timeout' });
    }
  } catch (err) { next(err); }
});

// ── Users ────────────────────────────────────────────────
router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, plan: true, role: true,
        computeBudget: true, status: true, createdAt: true,
        _count: { select: { projects: true, jobs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = users.map((u: typeof users[number]) => ({ ...u, projectCount: u._count.projects, jobCount: u._count.jobs }));
    res.json(mapped);
  } catch (err) { next(err); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const body = z.object({
      plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
      computeBudget: z.number().int().min(1).max(100).optional(),
      status: z.enum(['active', 'suspended']).optional(),
    }).parse(req.body);
    await prisma.user.update({ where: { id: req.params.id }, data: body });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Patterns ─────────────────────────────────────────────
router.get('/patterns', async (_req, res, next) => {
  try {
    const patterns = await prisma.targetPattern.findMany({
      orderBy: [{ confidenceScore: 'desc' }, { matchCount: 'desc' }],
    });
    res.json(patterns);
  } catch (err) { next(err); }
});

router.post('/patterns/:id/pin', async (req, res, next) => {
  try {
    await prisma.targetPattern.update({ where: { id: req.params.id }, data: { status: 'pinned' } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/patterns/:id/block', async (req, res, next) => {
  try {
    await prisma.targetPattern.update({ where: { id: req.params.id }, data: { status: 'blocked' } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
