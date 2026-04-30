import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifyJWT } from '../middleware/auth';

const router = Router();
router.use(verifyJWT);

const CreateSchema = z.object({ name: z.string().min(1), description: z.string().optional() });
const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user!.userId },
      include: {
        _count: { select: { websites: true, dlqEvents: true } },
        websites: { select: { status: true, jobs: { select: { id: true }, where: { status: 'active' } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = projects.map(p => ({
      id: p.id, name: p.name, description: p.description, status: p.status, createdAt: p.createdAt,
      websiteCount: p._count.websites,
      dlqCount: p._count.dlqEvents,
      activeAgents: p.websites.reduce((sum, w) => sum + w.jobs.length, 0),
      jobCount: 0,
    }));
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = CreateSchema.parse(req.body);
    const project = await prisma.project.create({
      data: { ...body, userId: req.user!.userId },
    });
    res.status(201).json(project);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: { _count: { select: { websites: true, dlqEvents: true } } },
    });
    if (!project) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(project);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = UpdateSchema.parse(req.body);
    const project = await prisma.project.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: body,
    });
    if (!project.count) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.project.deleteMany({ where: { id: req.params.id, userId: req.user!.userId } });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
