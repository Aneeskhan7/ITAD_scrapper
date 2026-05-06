import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { verifyJWT } from '../middleware/auth';
import type { AuthPayload } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Dedicated subscriber connection — cannot share with other operations
const redisSub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

// userId -> set of open SSE response objects
const userClients = new Map<string, Set<express.Response>>();

function addClient(userId: string, res: express.Response) {
  if (!userClients.has(userId)) userClients.set(userId, new Set());
  userClients.get(userId)!.add(res);
}

function removeClient(userId: string, res: express.Response) {
  userClients.get(userId)?.delete(res);
  if (userClients.get(userId)?.size === 0) userClients.delete(userId);
}

redisSub.subscribe('user-notifications', err => {
  if (err) console.error('[notifications] Redis subscribe error:', err.message);
  else console.log('[notifications] subscribed to user-notifications channel');
});

redisSub.on('message', (_channel, message) => {
  try {
    const { userId, notification } = JSON.parse(message);
    const clients = userClients.get(userId);
    if (!clients?.size) return;
    const data = `data: ${JSON.stringify(notification)}\n\n`;
    clients.forEach(res => { try { res.write(data); } catch {} });
  } catch (e) {
    console.error('[notifications] pub/sub error:', e);
  }
});

// GET /api/notifications/stream?token=xxx — SSE (EventSource can't send headers)
router.get('/stream', (req, res) => {
  const token = req.query.token as string;
  if (!token) { res.status(401).json({ error: 'Missing token' }); return; }

  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthPayload;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const userId = payload.userId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  addClient(userId, res);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(heartbeat); }
  }, 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userId, res);
  });
});

// GET /api/notifications/unread-count
router.get('/unread-count', verifyJWT, async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.userId, readAt: null },
  });
  res.json({ count });
});

// GET /api/notifications?unread=true&limit=30
router.get('/', verifyJWT, async (req, res) => {
  const { unread, limit = '30' } = req.query;
  const where: Parameters<typeof prisma.notification.findMany>[0]['where'] = {
    userId: req.user!.userId,
  };
  if (unread === 'true') where.readAt = null;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit), 100),
  });
  res.json(notifications);
});

// POST /api/notifications/:id/read
router.post('/:id/read', verifyJWT, async (req, res) => {
  const n = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!n) { res.status(404).json({ error: 'Not found' }); return; }
  if (!n.readAt) {
    await prisma.notification.update({ where: { id: n.id }, data: { readAt: new Date() } });
  }
  res.json({ ok: true });
});

// POST /api/notifications/read-all
router.post('/read-all', verifyJWT, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

// DELETE /api/notifications/:id
router.delete('/:id', verifyJWT, async (req, res) => {
  const n = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!n) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.notification.delete({ where: { id: n.id } });
  res.json({ ok: true });
});

export default router;
