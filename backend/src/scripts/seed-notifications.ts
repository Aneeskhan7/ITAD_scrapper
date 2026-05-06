import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'user' } });
  if (!user) { console.error('No regular user found — register one first'); process.exit(1); }

  const now = new Date();
  const mins = (n: number) => new Date(now.getTime() - n * 60_000);

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        type: 'keyword_hit',
        title: 'Keyword match: "government surplus auction"',
        body: 'Found on gsa.gov — GSA Surplus Property Auction — Q2 2025',
        link: '/app/hits',
        payload: { keyword: 'government surplus auction', url: 'https://gsa.gov/auctions/q2-2025' },
        createdAt: mins(3),
      },
      {
        userId: user.id,
        type: 'keyword_hit',
        title: 'Keyword match: "IT asset disposal bid"',
        body: 'Found on publicsurplus.com — Lot #4821: Dell Optiplex Bulk Lot',
        link: '/app/hits',
        payload: { keyword: 'IT asset disposal bid', url: 'https://publicsurplus.com/lot/4821' },
        createdAt: mins(17),
      },
      {
        userId: user.id,
        type: 'crawl_complete',
        title: 'Crawl complete: publicsurplus.com',
        body: '142 pages scanned · 9 new discoveries · 0 errors',
        link: '/app/results',
        payload: { websiteUrl: 'https://publicsurplus.com', pages: 142, discoveries: 9 },
        createdAt: mins(32),
        readAt: mins(25),
      },
      {
        userId: user.id,
        type: 'keyword_hit',
        title: 'Keyword match: "decommission servers"',
        body: 'Found on bidsync.com — City of Phoenix IT Decommission RFP',
        link: '/app/hits',
        payload: { keyword: 'decommission servers', url: 'https://bidsync.com/rfp/phoenix-it' },
        createdAt: mins(61),
      },
      {
        userId: user.id,
        type: 'dlq_alert',
        title: 'DLQ alert: 3 failed jobs',
        body: 'govplanet.com returned 403 on 3 consecutive attempts',
        link: '/app/dlq',
        payload: { errorType: '403_blocked', domain: 'govplanet.com', count: 3 },
        createdAt: mins(90),
        readAt: mins(80),
      },
      {
        userId: user.id,
        type: 'keyword_hit',
        title: 'Keyword match: "network equipment liquidation"',
        body: 'Found on ironplanet.com — Cisco / Juniper Network Liquidation Batch',
        link: '/app/hits',
        payload: { keyword: 'network equipment liquidation', url: 'https://ironplanet.com/lot/cisco-juniper-batch' },
        createdAt: mins(150),
        readAt: mins(140),
      },
      {
        userId: user.id,
        type: 'discovery_complete',
        title: 'New discovery: bidding page found',
        body: 'ironplanet.com/lot/8844 classified as bidding (93% confidence)',
        link: '/app/results',
        payload: { classification: 'bidding', confidence: 0.93, url: 'https://ironplanet.com/lot/8844' },
        createdAt: mins(200),
        readAt: mins(190),
      },
    ],
    skipDuplicates: false,
  });

  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  const total  = await prisma.notification.count({ where: { userId: user.id } });
  console.log(`[seed-notifications] ✓ inserted notifications for ${user.email}`);
  console.log(`  total: ${total}  unread: ${unread}`);
}

main().finally(() => prisma.$disconnect());
