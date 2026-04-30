import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifyJWT } from '../middleware/auth';

const router = Router();
router.use(verifyJWT);

router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const type = req.query.type as string | undefined;
    const projectId = req.query.projectId as string | undefined;

    const where: Record<string, unknown> = { userId };
    if (type && ['bidding', 'selling', 'informational', 'irrelevant'].includes(type)) where.classification = type;
    if (projectId) where.projectId = projectId;

    const [results, total] = await Promise.all([
      prisma.result.findMany({ where, orderBy: { foundAt: 'desc' }, take: limit, skip: (page - 1) * limit }),
      prisma.result.count({ where }),
    ]);
    res.json({ results, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

export default router;
