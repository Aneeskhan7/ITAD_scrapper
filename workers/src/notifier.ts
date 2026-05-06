import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const redisPub = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? 'ITAD Intel <onboarding@resend.dev>';
const APP_URL = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');

// ── Email template ────────────────────────────────────────────────────────────

function buildEmail(opts: {
  userName: string;
  keyword: string;
  matchedText: string;
  pageUrl: string;
  pageTitle: string | null;
  context: string;
  hostname: string;
}): { subject: string; html: string } {
  const { userName, keyword, matchedText, pageUrl, pageTitle, context, hostname } = opts;

  // Highlight matched text in context (plain replacement — safe for HTML because we escape first)
  function esc(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  const escapedContext = esc(context);
  const escapedMatch = esc(matchedText);
  const highlightedContext = escapedContext.replace(
    new RegExp(escapedMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    `<mark style="background:#fef08a;color:#713f12;padding:1px 3px;border-radius:3px;font-weight:600">${escapedMatch}</mark>`
  );

  const subject = `Keyword match: "${keyword}" on ${hostname}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:#0f1117;padding:24px 32px;display:flex;align-items:center">
            <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.03em">
              ITAD<span style="color:#1a9e57">Intel</span>
            </span>
          </td>
        </tr>

        <!-- Alert banner -->
        <tr>
          <td style="background:#e4f5ed;border-bottom:2px solid #bbf7d0;padding:16px 32px">
            <span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1a9e57">⊕ Keyword Match Detected</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 6px;font-size:15px;color:#374151">Hi ${esc(userName)},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151">
              Your keyword <strong style="color:#1a9e57">"${esc(keyword)}"</strong> matched a page during a recent crawl.
            </p>

            <!-- Match card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;margin-bottom:24px">
              <tr>
                <td style="padding:20px 24px">
                  ${pageTitle ? `<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#111827">${esc(pageTitle)}</p>` : ''}
                  <p style="margin:0 0 16px;font-size:12px;color:#6b7280;font-family:monospace;word-break:break-all">${esc(pageUrl)}</p>
                  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;font-family:monospace;font-size:13px;color:#374151;line-height:1.7">
                    …${highlightedContext}…
                  </div>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#1a9e57;border-radius:8px;padding:12px 28px">
                  <a href="${APP_URL}/app/hits" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">View Hit in Dashboard →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6">
              You're receiving this because keyword alerts are enabled in your account.<br>
              <a href="${APP_URL}/app/settings" style="color:#1a9e57">Manage notification preferences</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center">
            <span style="font-size:11px;color:#9ca3af">ITAD Intel · Keyword Intelligence Platform</span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// ── Worker ────────────────────────────────────────────────────────────────────

async function processJob(job: Job) {
  const { hitId } = job.data as { hitId: string };

  const hit = await prisma.keywordHit.findUnique({
    where: { id: hitId },
    include: {
      watchKeyword: { select: { keyword: true } },
      user: { select: { id: true, name: true, email: true, emailNotifications: true, emailDigestFrequency: true } },
    },
  });

  if (!hit || hit.notifiedInApp) return;

  const { user } = hit;
  const hostname = (() => { try { return new URL(hit.pageUrl).hostname; } catch { return hit.pageUrl; } })();
  const keyword = hit.watchKeyword?.keyword ?? hit.matchedText;

  // ── In-app notification ──────────────────────────────────────────────────

  const notification = await prisma.notification.create({
    data: {
      userId: hit.userId,
      type: 'keyword_hit',
      title: `Keyword match: "${keyword}"`,
      body: `Found on ${hostname}${hit.pageTitle ? ` — ${hit.pageTitle}` : ''}`,
      link: '/app/hits',
      payload: { hitId: hit.id, keyword, url: hit.pageUrl },
    },
  });

  await prisma.keywordHit.update({ where: { id: hitId }, data: { notifiedInApp: true } });

  await redisPub.publish('user-notifications', JSON.stringify({ userId: hit.userId, notification }));

  console.log(`[notifier] ✓ in-app — user ${user.email} — "${keyword}" on ${hostname}`);

  // ── Email notification (instant only) ────────────────────────────────────

  if (user.emailNotifications && user.emailDigestFrequency === 'instant') {
    try {
      const { subject, html } = buildEmail({
        userName: user.name,
        keyword,
        matchedText: hit.matchedText,
        pageUrl: hit.pageUrl,
        pageTitle: hit.pageTitle,
        context: hit.context,
        hostname,
      });

      const { error } = await resend.emails.send({
        from: FROM,
        to: user.email,
        subject,
        html,
      });

      if (error) {
        console.error(`[notifier] ✗ email failed for ${user.email}: ${error.message}`);
      } else {
        await prisma.keywordHit.update({ where: { id: hitId }, data: { notifiedEmail: true } });
        console.log(`[notifier] ✉ email sent → ${user.email}`);
      }
    } catch (err: any) {
      console.error(`[notifier] ✗ email error: ${err.message}`);
    }
  }
}

const worker = new Worker('notify-queue', processJob, {
  connection: redis,
  concurrency: 10,
});

worker.on('failed', (job, err) => {
  console.error(`[notifier] ✗ job ${job?.id} failed: ${err.message}`);
});
worker.on('error', err => console.error('[notifier]', err.message));

console.log('[notifier] worker started');
