import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_URL = 'https://httpbin.org/status/200';
const CHECK_INTERVAL = 5 * 60_000; // 5 minutes
const QUARANTINE_THRESHOLD = 0.50;

async function checkProxy(proxyUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    // In production you'd pass proxy via agent; here we simulate
    const res = await fetch(TEST_URL, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function runHealthChecks() {
  const proxies = await prisma.proxyHealth.findMany({ where: { status: { not: 'quarantined' } } });

  for (const proxy of proxies) {
    const ok = await checkProxy(proxy.proxyUrl);
    const total = proxy.totalRequests + 1;
    const successRate = ((proxy.successRate * proxy.totalRequests) + (ok ? 1 : 0)) / total;

    const updates: Record<string, unknown> = { successRate, totalRequests: total, lastUsed: new Date() };

    if (successRate < QUARANTINE_THRESHOLD && total > 5) {
      updates.status = 'quarantined';
      updates.cooldownUntil = new Date(Date.now() + 10 * 60_000);
      console.log(`[proxy-health] quarantined ${proxy.ipDisplay} (rate: ${(successRate * 100).toFixed(0)}%)`);
    } else {
      updates.status = 'active';
    }

    await prisma.proxyHealth.update({ where: { id: proxy.id }, data: updates });
  }

  // Release proxies past cooldown
  await prisma.proxyHealth.updateMany({
    where: { status: 'quarantined', cooldownUntil: { lt: new Date() } },
    data: { status: 'idle', cooldownUntil: null },
  });

  console.log(`[proxy-health] checked ${proxies.length} proxies`);
}

async function run() {
  console.log('[proxy-health] started');
  while (true) {
    await runHealthChecks().catch(err => console.error('[proxy-health]', err.message));
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
  }
}

run().catch(err => { console.error(err); process.exit(1); });
