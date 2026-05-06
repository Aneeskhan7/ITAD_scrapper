import 'dotenv/config';
import { Worker, Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? 'ITAD Intel <onboarding@resend.dev>';
const APP_URL = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');

// ── Email template ────────────────────────────────────────────────────────────

interface HitGroup {
  keyword: string;
  hits: Array<{ pageUrl: string; pageTitle: string | null; context: string; matchedText: string }>;
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(context: string, matchedText: string): string {
  const escaped = esc(context);
  const needle = esc(matchedText).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(
    new RegExp(needle, 'i'),
    `<mark style="background:#fef08a;color:#713f12;padding:1px 2px;border-radius:2px;font-weight:600">${esc(matchedText)}</mark>`
  );
}

function buildDigestEmail(opts: { userName: string; totalCount: number; groups: HitGroup[]; frequency: 'hourly' | 'daily' }) {
  const { userName, totalCount, groups, frequency } = opts;

  const groupsHtml = groups.map(g => {
    const shownHits = g.hits.slice(0, 3);
    const extraCount = g.hits.length - shownHits.length;

    const hitsHtml = shownHits.map(h => {
      return `
      <tr><td style="padding:12px 0;border-bottom:1px solid #f3f4f6">
        ${h.pageTitle ? `<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111827">${esc(h.pageTitle)}</p>` : ''}
        <p style="margin:0 0 8px;font-size:11px;color:#6b7280;font-family:monospace;word-break:break-all">${esc(h.pageUrl)}</p>
        <p style="margin:0;font-size:12px;color:#374151;line-height:1.6;font-family:monospace;background:#f9fafb;padding:8px 10px;border-radius:5px;border:1px solid #e5e7eb">…${highlight(h.context, h.matchedText)}…</p>
      </td></tr>`;
    }).join('');

    return `
    <tr><td style="padding:18px 0 0">
      <div style="display:inline-block;background:#e4f5ed;color:#1a9e57;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;font-family:monospace;margin-bottom:10px">⊕ ${esc(g.keyword)}</div>
      <table width="100%" cellpadding="0" cellspacing="0">${hitsHtml}</table>
      ${extraCount > 0 ? `<p style="margin:6px 0 0;font-size:12px;color:#6b7280">+${extraCount} more for this keyword — <a href="${APP_URL}/app/hits" style="color:#1a9e57">view in dashboard</a></p>` : ''}
    </td></tr>`;
  }).join('');

  const windowLabel = frequency === 'hourly' ? 'the last hour' : 'the last 24 hours';
  const subject = `${totalCount} new keyword match${totalCount === 1 ? '' : 'es'} — ITAD Intel ${frequency === 'hourly' ? 'Hourly' : 'Daily'} Digest`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

        <tr><td style="background:#0f1117;padding:22px 32px">
          <span style="font-size:20px;font-weight:800;color:#ffffff">ITAD<span style="color:#1a9e57">Intel</span></span>
        </td></tr>

        <tr><td style="background:#e4f5ed;border-bottom:2px solid #bbf7d0;padding:14px 32px">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1a9e57">
            ⊕ ${frequency === 'hourly' ? 'Hourly' : 'Daily'} Digest — ${totalCount} new match${totalCount === 1 ? '' : 'es'}
          </span>
        </td></tr>

        <tr><td style="padding:28px 32px">
          <p style="margin:0 0 6px;font-size:15px;color:#374151">Hi ${esc(userName)},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151">
            Your keywords matched <strong>${totalCount} page${totalCount === 1 ? '' : 's'}</strong> during ${windowLabel}.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0">${groupsHtml}</table>

          <table cellpadding="0" cellspacing="0" style="margin-top:28px;margin-bottom:24px">
            <tr><td style="background:#1a9e57;border-radius:8px;padding:12px 28px">
              <a href="${APP_URL}/app/hits" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Review all hits →</a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
            You're receiving this ${frequency} digest because it's enabled in your account.<br>
            <a href="${APP_URL}/app/settings" style="color:#1a9e57">Change digest frequency</a>
          </p>
        </td></tr>

        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center">
          <span style="font-size:11px;color:#9ca3af">ITAD Intel · Keyword Intelligence Platform</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ── Digest processor ──────────────────────────────────────────────────────────

async function sendDigests(frequency: 'hourly' | 'daily') {
  const sinceMs = frequency === 'hourly' ? 60 * 60_000 : 24 * 60 * 60_000;
  const since = new Date(Date.now() - sinceMs);

  const users = await prisma.user.findMany({
    where: { emailNotifications: true, emailDigestFrequency: frequency, status: 'active' },
    select: { id: true, name: true, email: true },
  });

  console.log(`[digest] ${frequency} run — ${users.length} eligible user(s)`);

  for (const user of users) {
    const hits = await prisma.keywordHit.findMany({
      where: { userId: user.id, notifiedEmail: false, foundAt: { gte: since } },
      include: { watchKeyword: { select: { keyword: true } } },
      orderBy: { foundAt: 'desc' },
    });

    if (hits.length === 0) {
      console.log(`[digest] ${user.email} — no unnotified hits, skipping`);
      continue;
    }

    // Group by keyword
    const byKeyword = new Map<string, typeof hits>();
    for (const hit of hits) {
      const kw = hit.watchKeyword?.keyword ?? hit.matchedText;
      if (!byKeyword.has(kw)) byKeyword.set(kw, []);
      byKeyword.get(kw)!.push(hit);
    }

    const groups: HitGroup[] = Array.from(byKeyword.entries()).map(([keyword, khits]) => ({
      keyword,
      hits: khits.map(h => ({ pageUrl: h.pageUrl, pageTitle: h.pageTitle, context: h.context, matchedText: h.matchedText })),
    }));

    const { subject, html } = buildDigestEmail({ userName: user.name, totalCount: hits.length, groups, frequency });

    try {
      const { error } = await resend.emails.send({ from: FROM, to: user.email, subject, html });
      if (error) {
        console.error(`[digest] ✗ email failed for ${user.email}: ${error.message}`);
        continue;
      }
      await prisma.keywordHit.updateMany({
        where: { id: { in: hits.map(h => h.id) } },
        data: { notifiedEmail: true },
      });
      console.log(`[digest] ✉ ${frequency} → ${user.email} (${hits.length} hits across ${groups.length} keyword(s))`);
    } catch (err: any) {
      console.error(`[digest] ✗ error for ${user.email}: ${err.message}`);
    }
  }
}

// ── BullMQ worker + repeatable jobs ──────────────────────────────────────────

const digestQueue = new Queue('digest-queue', {
  connection: new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null }),
});

const worker = new Worker('digest-queue', async (job: Job) => {
  const { type } = job.data as { type: 'hourly' | 'daily' };
  await sendDigests(type);
}, { connection: redis, concurrency: 1 });

worker.on('failed', (job, err) => console.error(`[digest] ✗ job ${job?.id} failed: ${err.message}`));
worker.on('error', err => console.error('[digest]', err.message));

async function registerJobs() {
  await digestQueue.upsertJobScheduler(
    'digest-hourly',
    { pattern: '5 * * * *' },          // every hour at :05
    { name: 'digest', data: { type: 'hourly' } }
  );
  await digestQueue.upsertJobScheduler(
    'digest-daily',
    { pattern: '5 9 * * *' },           // 09:05 UTC daily
    { name: 'digest', data: { type: 'daily' } }
  );
  console.log('[digest] repeatable jobs registered — hourly@:05, daily@09:05 UTC');
}

registerJobs().catch(err => console.error('[digest] failed to register jobs:', err.message));
console.log('[digest] worker started');
