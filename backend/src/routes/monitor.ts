import { Router, Request, Response } from 'express';
import { verifyJWT } from '../middleware/auth';
import { scrapeQueue } from '../lib/bullmq';
import { prisma } from '../lib/prisma';

const router = Router();
const clients = new Set<Response>();

export function broadcastMonitorEvent(data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

router.get('/stream', verifyJWT, async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL ?? '*');
  res.flushHeaders();

  clients.add(res);

  const send = async () => {
    try {
      const [counts, activeAgents, dlqPending] = await Promise.all([
        scrapeQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
        prisma.agentRegistry.count({ where: { status: 'active' } }),
        prisma.dlqEvent.count({ where: { status: 'pending' } }),
      ]);
      res.write(`data: ${JSON.stringify({
        type: 'stats',
        queueDepth: (counts.waiting ?? 0) + (counts.active ?? 0),
        activeAgents,
        dlqPending,
        processing: counts.active ?? 0,
        completed24h: counts.completed ?? 0,
      })}\n\n`);
    } catch { /* ignore errors on dead connections */ }
  };

  await send();
  const interval = setInterval(send, 5000);

  req.on('close', () => {
    clearInterval(interval);
    clients.delete(res);
  });
});

export default router;
