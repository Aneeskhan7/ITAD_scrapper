import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { verifyJWT } from '../middleware/auth';
import safeRegex from 'safe-regex';

const router = Router();
router.use(verifyJWT);

const PLAN_LIMITS: Record<string, number> = {
  starter: 10,
  pro: 100,
  premium: 500,
  enterprise: 9999,
};

const CreateSchema = z.object({
  projectId: z.string().min(1),
  websiteId: z.string().min(1).optional().nullable(),
  keyword: z.string().trim().min(1).max(200),
  matchMode: z.enum(['contains', 'exact', 'regex', 'fuzzy']).default('contains'),
  caseSensitive: z.boolean().default(false),
});

const UpdateSchema = z.object({
  keyword: z.string().trim().min(1).max(200).optional(),
  matchMode: z.enum(['contains', 'exact', 'regex', 'fuzzy']).optional(),
  caseSensitive: z.boolean().optional(),
  status: z.enum(['active', 'paused']).optional(),
});

// GET /api/keywords?projectId=&websiteId=
router.get('/', async (req, res, next) => {
  try {
    const { projectId, websiteId } = req.query;
    const keywords = await prisma.watchKeyword.findMany({
      where: {
        userId: req.user!.userId,
        ...(projectId ? { projectId: String(projectId) } : {}),
        ...(websiteId ? { websiteId: String(websiteId) } : {}),
      },
      include: {
        project: { select: { name: true } },
        website: { select: { url: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(keywords);
  } catch (err) { next(err); }
});

// POST /api/keywords
router.post('/', async (req, res, next) => {
  try {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors.map(e => e.message).join(', ') }); return; }
    const body = parsed.data;

    const project = await prisma.project.findFirst({
      where: { id: body.projectId, userId: req.user!.userId },
    });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

    if (body.websiteId) {
      const website = await prisma.website.findFirst({
        where: { id: body.websiteId, userId: req.user!.userId, projectId: body.projectId },
      });
      if (!website) { res.status(404).json({ error: 'Website not found' }); return; }
    }

    if (body.matchMode === 'regex' && !safeRegex(body.keyword)) {
      res.status(400).json({ error: 'Regex pattern is potentially unsafe (ReDoS risk). Simplify the pattern.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { plan: true } });
    const limit = PLAN_LIMITS[user?.plan ?? 'starter'] ?? 10;
    const count = await prisma.watchKeyword.count({ where: { userId: req.user!.userId } });
    if (count >= limit) {
      res.status(403).json({ error: `Keyword limit reached (${limit} on ${user?.plan} plan).` });
      return;
    }

    const keyword = await prisma.watchKeyword.create({
      data: {
        userId: req.user!.userId,
        projectId: body.projectId,
        websiteId: body.websiteId ?? null,
        keyword: body.keyword,
        matchMode: body.matchMode,
        caseSensitive: body.caseSensitive,
      },
      include: {
        project: { select: { name: true } },
        website: { select: { url: true } },
      },
    });
    res.status(201).json(keyword);
  } catch (err) { next(err); }
});

// PATCH /api/keywords/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors.map(e => e.message).join(', ') }); return; }
    const body = parsed.data;

    if (body.matchMode === 'regex' && body.keyword && !safeRegex(body.keyword)) {
      res.status(400).json({ error: 'Regex pattern is potentially unsafe (ReDoS risk). Simplify the pattern.' });
      return;
    }

    const result = await prisma.watchKeyword.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: body,
    });
    if (result.count === 0) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/keywords/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.watchKeyword.deleteMany({ where: { id: req.params.id, userId: req.user!.userId } });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
