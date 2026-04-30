import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { verifyJWT } from '../middleware/auth';

const router = Router();
router.use(verifyJWT);

router.get('/', async (_req, res, next) => {
  try {
    const patterns = await prisma.targetPattern.findMany({
      where: { status: { not: 'archived' } },
      orderBy: [{ confidenceScore: 'desc' }, { matchCount: 'desc' }],
    });
    res.json(patterns);
  } catch (err) { next(err); }
});

export default router;
