import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { scrapeQueue } from '../lib/bullmq';
import { verifyJWT } from '../middleware/auth';

const router = Router();
router.use(verifyJWT);

// targetPagePatterns: URL-path substrings (e.g. "/procurement"). Stored lowercased + leading-slash-normalised.
const PathPatternSchema = z.array(
  z.string().trim().min(1).max(120)
).max(50).default([]);

const CreateSchema = z.object({
  url: z.string().url(),
  depth: z.number().int().min(1).max(5).default(2),
  crawlBudget: z.number().int().min(10).max(1000).default(200),
  schedule: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  targetPagePatterns: PathPatternSchema,
});

const UpdateSchema = z.object({
  depth: z.number().int().min(1).max(5).optional(),
  crawlBudget: z.number().int().min(10).max(1000).optional(),
  schedule: z.string().optional().nullable(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  status: z.enum(['idle', 'crawling', 'queued', 'failed', 'paused']).optional(),
  targetPagePatterns: PathPatternSchema.optional(),
});

function normalisePatterns(patterns: string[]): string[] {
  return Array.from(new Set(
    patterns
      .map(p => p.trim().toLowerCase())
      .map(p => p.startsWith('/') ? p : `/${p}`)
      .filter(p => p.length > 1)
  ));
}

router.get('/project/:projectId', async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.user!.userId },
    });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

    const websites = await prisma.website.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { jobs: true, results: true } } },
    });
    res.json(websites);
  } catch (err) { next(err); }
});

router.post('/project/:projectId', async (req, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, userId: req.user!.userId },
    });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

    const body = CreateSchema.parse(req.body);
    const website = await prisma.website.create({
      data: {
        url: body.url,
        depth: body.depth,
        crawlBudget: body.crawlBudget,
        schedule: body.schedule,
        priority: body.priority,
        targetPagePatterns: normalisePatterns(body.targetPagePatterns),
        projectId: req.params.projectId,
        userId: req.user!.userId,
      },
    });
    res.status(201).json(website);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const website = await prisma.website.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        jobs: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { results: true } },
      },
    });
    if (!website) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(website);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = UpdateSchema.parse(req.body);
    const data = {
      ...body,
      ...(body.targetPagePatterns ? { targetPagePatterns: normalisePatterns(body.targetPagePatterns) } : {}),
    };
    await prisma.website.updateMany({ where: { id: req.params.id, userId: req.user!.userId }, data });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.website.deleteMany({ where: { id: req.params.id, userId: req.user!.userId } });
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/:id/crawl', async (req, res, next) => {
  try {
    const website = await prisma.website.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    if (!website) { res.status(404).json({ error: 'Not found' }); return; }
    if (website.status === 'crawling') { res.status(409).json({ error: 'Already crawling' }); return; }

    const job = await prisma.job.create({
      data: {
        websiteId: website.id, projectId: website.projectId, userId: req.user!.userId,
        url: website.url, status: 'pending',
      },
    });

    await scrapeQueue.add('scrape', {
      jobId: job.id, websiteId: website.id, projectId: website.projectId,
      userId: req.user!.userId, url: website.url, depth: website.depth,
      crawlBudget: website.crawlBudget,
      targetPagePatterns: website.targetPagePatterns ?? [],
    }, { priority: website.priority === 'high' ? 1 : website.priority === 'medium' ? 5 : 10 });

    await prisma.website.update({ where: { id: website.id }, data: { status: 'queued' } });
    res.json({ jobId: job.id });
  } catch (err) { next(err); }
});

router.get('/:id/jobs', async (req, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { websiteId: req.params.id, userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(jobs);
  } catch (err) { next(err); }
});

router.get('/:id/results', async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const [results, total] = await Promise.all([
      prisma.result.findMany({
        where: { websiteId: req.params.id, userId: req.user!.userId },
        orderBy: { foundAt: 'desc' },
        take: limit, skip: (page - 1) * limit,
      }),
      prisma.result.count({ where: { websiteId: req.params.id, userId: req.user!.userId } }),
    ]);
    res.json({ results, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

export default router;
