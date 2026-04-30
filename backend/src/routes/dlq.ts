import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { scrapeQueue } from '../lib/bullmq';
import { verifyJWT } from '../middleware/auth';

const router = Router();
router.use(verifyJWT);

router.get('/', async (req, res, next) => {
  try {
    const events = await prisma.dlqEvent.findMany({
      where: { userId: req.user!.userId },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(events);
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const [pending, resolved, archived, total, jobs24h, failedJobs24h] = await Promise.all([
      prisma.dlqEvent.count({ where: { userId, status: 'pending' } }),
      prisma.dlqEvent.count({ where: { userId, status: 'retried' } }),
      prisma.dlqEvent.count({ where: { userId, status: 'archived' } }),
      prisma.dlqEvent.count({ where: { userId } }),
      prisma.job.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
      prisma.job.count({ where: { userId, status: 'failed', createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
    ]);
    const failureRate = jobs24h > 0 ? ((failedJobs24h / jobs24h) * 100).toFixed(1) + '%' : '0%';
    res.json({ pending, resolved, archived, total, failureRate });
  } catch (err) { next(err); }
});

router.post('/:id/retry', async (req, res, next) => {
  try {
    const event = await prisma.dlqEvent.findFirst({
      where: { id: req.params.id, userId: req.user!.userId, status: 'pending' },
    });
    if (!event) { res.status(404).json({ error: 'Not found' }); return; }

    const payload = event.payload as Record<string, unknown>;
    await scrapeQueue.add('scrape', payload, { priority: 5 });
    await prisma.dlqEvent.update({
      where: { id: event.id },
      data: { status: 'retried', resolvedAt: new Date(), retry1At: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/:id/archive', async (req, res, next) => {
  try {
    await prisma.dlqEvent.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { status: 'archived', resolvedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/retry-all', async (req, res, next) => {
  try {
    const pending = await prisma.dlqEvent.findMany({
      where: { userId: req.user!.userId, status: 'pending' },
    });
    for (const event of pending) {
      const payload = event.payload as Record<string, unknown>;
      await scrapeQueue.add('scrape', payload, { priority: 5 });
    }
    await prisma.dlqEvent.updateMany({
      where: { userId: req.user!.userId, status: 'pending' },
      data: { status: 'retried', resolvedAt: new Date() },
    });
    res.json({ count: pending.length });
  } catch (err) { next(err); }
});

export default router;
