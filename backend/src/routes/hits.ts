import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifyJWT } from '../middleware/auth';

const router = Router();
router.use(verifyJWT);

// GET /api/hits?status=&keywordId=&websiteId=&from=&to=&limit=&page=
router.get('/', async (req, res, next) => {
  try {
    const { status, keywordId, websiteId, from, to } = req.query;
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const page = Math.max(Number(req.query.page ?? 1), 1);

    const where: Record<string, unknown> = { userId: req.user!.userId };
    if (status) where.status = String(status);
    if (keywordId) where.watchKeywordId = String(keywordId);
    if (websiteId) where.websiteId = String(websiteId);
    if (from || to) {
      where.foundAt = {
        ...(from ? { gte: new Date(String(from)) } : {}),
        ...(to ? { lte: new Date(String(to)) } : {}),
      };
    }

    const [hits, total] = await Promise.all([
      prisma.keywordHit.findMany({
        where,
        include: { watchKeyword: { select: { keyword: true, matchMode: true, caseSensitive: true } } },
        orderBy: { foundAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.keywordHit.count({ where }),
    ]);

    res.json({ hits, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /api/hits/stats
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [newLast24h, totalLast30d, totalRelevant, byKeyword] = await Promise.all([
      prisma.keywordHit.count({ where: { userId, status: 'new', foundAt: { gte: yesterday } } }),
      prisma.keywordHit.count({ where: { userId, foundAt: { gte: thirtyDaysAgo } } }),
      prisma.keywordHit.count({ where: { userId, status: 'relevant' } }),
      prisma.watchKeyword.findMany({
        where: { userId, hitCount: { gt: 0 } },
        select: { keyword: true, hitCount: true },
        orderBy: { hitCount: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      newLast24h,
      totalLast30d,
      totalRelevant,
      topKeyword: byKeyword[0]?.keyword ?? '—',
      byKeyword,
    });
  } catch (err) { next(err); }
});

// POST /api/hits/:id/mark-relevant
router.post('/:id/mark-relevant', async (req, res, next) => {
  try {
    const result = await prisma.keywordHit.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { status: 'relevant' },
    });
    if (result.count === 0) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/hits/:id/dismiss
router.post('/:id/dismiss', async (req, res, next) => {
  try {
    const result = await prisma.keywordHit.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { status: 'dismissed' },
    });
    if (result.count === 0) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
