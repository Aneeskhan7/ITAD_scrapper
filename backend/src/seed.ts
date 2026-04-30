import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from './lib/prisma';

async function seed() {
  console.log('[seed] Starting...');

  // Admin user
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'Admin@123456', 12);
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? 'admin@itadintel.io' },
    update: {},
    create: {
      name: 'Admin',
      email: process.env.ADMIN_EMAIL ?? 'admin@itadintel.io',
      passwordHash: adminHash,
      role: 'admin',
      plan: 'enterprise',
      computeBudget: 50,
    },
  });

  // Demo user
  const demoHash = await bcrypt.hash('Demo@123456', 12);
  await prisma.user.upsert({
    where: { email: 'john@itadintel.io' },
    update: {},
    create: { name: 'John Doe', email: 'john@itadintel.io', passwordHash: demoHash, plan: 'pro', computeBudget: 20 },
  });

  // Seed keyword patterns
  const keywords = [
    { keyword: 'bids', confidenceScore: 0.99, matchCount: 18421 },
    { keyword: 'procurement', confidenceScore: 0.98, matchCount: 15902 },
    { keyword: 'rfp', confidenceScore: 0.97, matchCount: 12841 },
    { keyword: 'rfq', confidenceScore: 0.96, matchCount: 9200 },
    { keyword: 'auction', confidenceScore: 0.96, matchCount: 8100 },
    { keyword: 'surplus', confidenceScore: 0.95, matchCount: 7200 },
    { keyword: 'sealed-bid', confidenceScore: 0.94, matchCount: 4100 },
    { keyword: 'invitation-to-bid', confidenceScore: 0.93, matchCount: 3800 },
    { keyword: 'surplus-disposal', source: 'learned', confidenceScore: 0.88, matchCount: 3412 },
    { keyword: 'asset-liquidation', source: 'learned', confidenceScore: 0.82, matchCount: 1298 },
  ];

  for (const kw of keywords) {
    await prisma.targetPattern.upsert({
      where: { keyword: kw.keyword },
      update: {},
      create: { ...kw, source: (kw as Record<string, unknown>).source as string ?? 'seed' },
    });
  }

  // Seed proxy pool
  const proxies = [
    { proxyUrl: 'http://prx-r-001:8080', tier: 1, proxyType: 'residential', ipDisplay: '104.28.x.x', successRate: 0.96, status: 'active' },
    { proxyUrl: 'http://prx-r-002:8080', tier: 1, proxyType: 'residential', ipDisplay: '185.93.x.x', successRate: 0.94, status: 'active' },
    { proxyUrl: 'http://prx-r-003:8080', tier: 1, proxyType: 'residential', ipDisplay: '45.142.x.x', successRate: 0.42, status: 'quarantined' },
    { proxyUrl: 'http://prx-d-001:8080', tier: 2, proxyType: 'datacenter', ipDisplay: '198.12.x.x', successRate: 0.81, status: 'active' },
    { proxyUrl: 'http://prx-d-002:8080', tier: 2, proxyType: 'datacenter', ipDisplay: '162.33.x.x', successRate: 0.78, status: 'active' },
    { proxyUrl: 'http://prx-d-003:8080', tier: 2, proxyType: 'datacenter', ipDisplay: '205.251.x.x', successRate: 0.55, status: 'idle' },
    { proxyUrl: 'http://pool-a:8080', tier: 3, proxyType: 'rotating', ipDisplay: 'pool-A', successRate: 0.63, status: 'active' },
    { proxyUrl: 'http://pool-b:8080', tier: 3, proxyType: 'rotating', ipDisplay: 'pool-B', successRate: 0.58, status: 'active' },
  ];

  for (const proxy of proxies) {
    await prisma.proxyHealth.upsert({ where: { proxyUrl: proxy.proxyUrl }, update: {}, create: proxy });
  }

  // Seed agent registry
  const agents = [
    { agentId: 'agt-001', status: 'active', cpuPercent: 34 },
    { agentId: 'agt-002', status: 'active', cpuPercent: 28 },
    { agentId: 'agt-003', status: 'active', cpuPercent: 51 },
    { agentId: 'agt-004', status: 'active', cpuPercent: 45 },
    { agentId: 'agt-005', status: 'active', cpuPercent: 22 },
    { agentId: 'agt-006', status: 'idle', cpuPercent: 0 },
    { agentId: 'agt-007', status: 'active', cpuPercent: 18 },
    { agentId: 'agt-008', status: 'idle', cpuPercent: 0 },
  ];

  for (const agent of agents) {
    await prisma.agentRegistry.upsert({ where: { agentId: agent.agentId }, update: agent, create: agent });
  }

  console.log('[seed] Done.');
  await prisma.$disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
