# ITAD Intelligence — Step-by-Step Build Plan

This is the concrete, in-order plan to take the codebase from where it is today (AI-classifier crawler) to the vision in [NOTEBOOKLM.md](NOTEBOOKLM.md) (per-user keyword watchlists + in-app/email alerts + Stripe billing + premium AI Business Discovery).

Each step ships a **working, deployable increment**. Don't start step N+1 until step N is verified end-to-end and committed.

---

## Build Principles

1. **Ship in increments.** Every step ends with something the user can see/use. No half-done foundations.
2. **Don't break what works.** The existing AI-classifier flow keeps running. We add the keyword flow alongside it.
3. **Commit per step.** Each step is one PR / one commit cluster. If a step is too big, split it.
4. **Test before moving on.** Each step has explicit verification. Pass it or stay on the step.
5. **One sequential track.** No parallelism across steps until the foundation (Steps 0–6) is in. Frontend + backend within a step can be parallel.
6. **Decide externals once.** Email provider, search API, billing provider — pick at Step 0.8 and don't second-guess later.

---

## Step 0 — Pre-Flight (Foundation Hardening)

**Goal:** Codebase is fully running locally with all services up, all known rough edges fixed, and tooling/decisions locked in. Nothing built yet — we just remove blockers.

**Why first:** The current setup runs without Redis (workers can't start) and without backend tests. We can't safely refactor scraper code in Step 2 if we have no way to verify it still works.

### 0.1 Get Redis running locally
- Install Homebrew → `brew install redis` → `brew services start redis`.
- Verify: `redis-cli ping` returns `PONG`.

### 0.2 Start workers and verify the existing pipeline
- Run all three: `npm run dev:backend`, `npm run dev:workers`, `npm run dev:frontend`.
- Log in as demo user, create a project, add a website (try `https://www.austinisd.org`), click "Run Now".
- Confirm: a Job row appears, the worker picks it up, pages get scraped, Results appear, no DLQ entries.
- Fix any blockers you hit. Common issues: Playwright browsers not installed (`npx playwright install chromium`), proxy seed addresses unreachable (the seed proxies are placeholders — comment them out or skip proxy use in dev).

### 0.3 Make Prisma the source of truth
- The DB was set up from raw SQL (`database/001_initial_schema.sql`), not Prisma migrations. From now on, Prisma owns the schema.
- Diff `backend/prisma/schema.prisma` against the DB: `cd backend && npx prisma db pull --print` (read-only). If they match, run `npx prisma migrate dev --name baseline --create-only` and `prisma migrate resolve --applied baseline` to register the existing state. From here, every schema change is a Prisma migration.
- Test: `npx prisma studio` opens, shows seeded users + patterns + proxies.

### 0.4 Add minimal test scaffolding
- Backend: install `vitest` + `supertest`. Add one smoke test: `POST /api/auth/login` with seeded admin returns 200 + JWT.
- Workers: a simple Vitest config (we'll add real tests as we build).
- Frontend: Vitest + Testing Library; one smoke test that `<App />` renders without crashing.
- Add `npm test` script at root that fans out across workspaces.

### 0.5 Set up linting + formatting
- ESLint + Prettier shared config at root, applied to all four workspaces.
- Add `npm run lint` and `npm run format` at root.
- Run once across the codebase, commit the result as a separate "style" commit.

### 0.6 CI (GitHub Actions)
- One workflow on push: install, lint, test, prisma validate.
- This catches regressions starting Step 1.

### 0.7 .env discipline
- The repo only ships a root `.env.example`. Create `backend/.env.example` and `workers/.env.example` (committed) so future devs know what's needed.

### 0.8 Lock external service decisions
You don't have to integrate them yet — just pick. Open a free account on each so you have a key when the relevant step arrives.

| Decision | Recommendation | Why |
|---|---|---|
| Email provider | **Resend** | Best DX, React-email templates, $0 to start (3k/mo free), simple API. |
| Web search (for Discovery) | **Brave Search API** | Cheaper than SerpAPI, sufficient for institutional-site discovery. |
| Billing | **Stripe** | Industry standard, Checkout + Customer Portal off-the-shelf. |
| Premium-tier LLM (Discovery) | **Claude Haiku** | Cheap, accurate, fast. Inline scraper still uses local Ollama. |
| Error monitoring | **Sentry** | Free tier, 5-minute integration. |

### 0.9 Set up a staging environment
- Deploy the current state to a staging server (Render / Railway / Fly.io — pick one). Same env vars, separate Postgres + Redis.
- Every subsequent step deploys to staging first; production lags by ~1 step.

**Verification (don't proceed until all green):**
- ✅ Local: backend + workers + frontend all up, no Redis errors.
- ✅ Crawl a real site end-to-end without DLQ entries.
- ✅ Prisma migrate baseline registered.
- ✅ Smoke tests pass on `npm test`.
- ✅ CI green on a no-op PR.
- ✅ Staging deployed and accessible.
- ✅ External-service accounts open (Resend, Brave, Stripe, Sentry).

**Estimated effort:** 2–3 days.

---

## Step 1 — Schema Migration for Keyword Watchlist

**Goal:** The database has the new tables and columns needed for per-user keyword watchlists, hit recording, and notifications. **No application code uses them yet.** This is a pure schema PR.

**Why second:** Adding a column to a populated table is cheap; adding it later when those tables are hot is risky. Get the foundation right before any code touches it.

### 1.1 Schema changes
Add these to `backend/prisma/schema.prisma`. Full field-level definitions are in [NOTEBOOKLM.md §3.1–3.2](NOTEBOOKLM.md).

**New tables:**
- `WatchKeyword` — per-user keyword watchlist (userId, websiteId?, projectId, keyword, matchMode, caseSensitive, status, hitCount, lastHitAt).
- `KeywordHit` — one row per match (watchKeywordId, userId, websiteId, projectId, resultId?, pageUrl, pageTitle, matchedText, context, position, status, notifiedInApp, notifiedEmail).
- `Notification` — in-app inbox (userId, type, title, body, link, payload, readAt).

**Existing-table additions:**
- `Website.targetPagePatterns` — `String[]`, default `[]`.
- `Result.fullText` — nullable `String` (`@db.Text`).
- `Result.textHash` — nullable `String` (for dedupe).
- `User.emailNotifications` — `Boolean`, default `true`.
- `User.emailDigestFrequency` — `String`, default `"instant"` (values: `instant` | `hourly` | `daily`).
- `User.inAppNotifications` — `Boolean`, default `true`.
- `User.unsubscribeToken` — `String @unique` (generate via `crypto.randomBytes(24).toString('base64url')` on register; backfill seed users in migration).

### 1.2 Migration
- `cd backend && npx prisma migrate dev --name add_keyword_watchlist`.
- Hand-edit the generated SQL to backfill `User.unsubscribeToken` for existing seeded users.
- Apply on staging; verify `prisma studio` shows the new tables empty and existing data intact.

### 1.3 Update seed
- Update `database/002_seed.sql` and `backend/src/seed.ts` to populate `unsubscribeToken` for seeded users.
- Add a few demo `WatchKeyword`s for the demo user (e.g. `Chromebook`, `procurement`, `surplus`) to make the next steps demoable.

**Verification:**
- ✅ `npx prisma migrate status` clean on local + staging.
- ✅ All existing routes still respond (login, list projects, view discoveries) — nothing should break.
- ✅ Seed re-runs idempotently.

**Estimated effort:** 0.5 day.

---

## Step 2 — Scraper Persists Full Text + Honors Target Pages

**Goal:** The scraper now (a) skips pages whose URL doesn't match `Website.targetPagePatterns` (when set), and (b) persists every fetched page's full text to `Result.fullText`. This sets up Step 3 to scan that text for keywords.

**Why third:** The keyword scanner needs full page text to scan. Adding it to the scraper now (before the scanner exists) means by the time we build the scanner in Step 3, we already have data to test against.

### 2.1 `Website.targetPagePatterns` filter
Edit `workers/src/scraper.ts`:
- Load `targetPagePatterns` with the website.
- After link discovery, before the 5-signal scoring step, filter URLs:
  - If `targetPagePatterns.length === 0` → no filter (existing behavior).
  - Else: keep only URLs where `URL(href).pathname` includes any pattern (case-insensitive).
- Patterns are matched as plain substrings on the path. Document this in the API and UI ("Use simple paths like `/procurement` — they match anywhere in the URL path").

### 2.2 Persist full text
- Currently the scraper only writes `Result` rows when `classification ∈ {bidding, selling}`. Change so **every successfully fetched page** writes a Result with:
  - Existing fields (url, title, bodySnippet, classification, confidence, reason).
  - **`fullText`** — full visible text, deduplicated, capped at 100 KB.
  - **`textHash`** — `crypto.createHash('sha256').update(fullText).digest('hex')`.
- Before insert, check if a Result with the same `(websiteId, url, textHash)` already exists in the last 7 days — if so, skip insert (don't re-spam). Increment a `Website.duplicateSkips` counter (add this column too if useful, optional).

### 2.3 Update Add Website modal
Frontend, `frontend/src/components/modals/AddWebsiteModal.tsx`:
- Add a new field: **Target Page Paths** (chip input).
- Placeholder: `Add paths like /procurement, /bids, /surplus — leave empty to crawl all pages.`
- Submit field as `targetPagePatterns: string[]`.
- Backend `POST /api/websites` accepts and persists the array.

### 2.4 Update Website Detail page
Show the configured `targetPagePatterns` as chips at the top of the page so users can see what's being filtered. Add an Edit button → small modal to edit them.

**Verification:**
- ✅ Create a website with `["/about"]` as target patterns and crawl Austin ISD — only pages with `/about` in the path are fetched.
- ✅ Crawl a page; check Postgres: `SELECT id, length(full_text) FROM "Result" ORDER BY found_at DESC LIMIT 5;` — `length` > 0.
- ✅ Re-crawl the same page; no duplicate Result row added (dedupe via `textHash`).
- ✅ Create a website with empty `targetPagePatterns` — behavior unchanged from Step 0.

**Estimated effort:** 1 day.

---

## Step 3 — Keyword Scanner Worker

**Goal:** When a Result is persisted, a separate worker scans its `fullText` against all matching `WatchKeyword`s and writes `KeywordHit` rows. **Hits are recorded but not yet visible to users — that's Step 4.**

**Why fourth:** Decoupling scanning from scraping (separate worker, separate queue) means a scanner failure doesn't break crawls, and we can retry/replay scans independently later if matching logic changes.

### 3.1 New BullMQ queue
- `keyword-scan-queue` in `backend/src/lib/bullmq.ts`.
- Job payload: `{ resultId }` (everything else is fetched from DB).

### 3.2 Hook into scraper
At the end of `scraper.ts`, after Result persistence: enqueue `{ resultId }` onto `keyword-scan-queue`. Don't await — fire-and-forget.

### 3.3 New worker file: `workers/src/keyword-scanner.ts`
Per job:
1. Load the Result (full text, url, title, websiteId, projectId, userId).
2. Load all active `WatchKeyword`s where:
   - `userId == result.userId` AND
   - (`websiteId IS NULL` AND `projectId == result.projectId`) OR `websiteId == result.websiteId`
   - AND `status == 'active'`
3. For each keyword:
   - Build the matcher per `matchMode`:
     - `contains` — `String.indexOf` (case-sensitive flag).
     - `exact` — `\b<escapedKeyword>\b` regex with case-sensitive flag.
     - `regex` — user-supplied, length-capped at 200 chars, validated with a regex parser, executed with a 50ms timeout per match attempt (use `safe-regex` to reject ReDoS-vulnerable patterns).
     - `fuzzy` — Postgres `pg_trgm` similarity ≥ 0.7 (defer to a SQL query rather than in-process).
   - Find ALL match offsets (not just first) up to a cap of 20 per keyword per page.
   - For each offset, build a 200-char context window around it.
4. Insert `KeywordHit` rows in a single batch transaction. Idempotency: unique on `(watchKeywordId, resultId, position)` — add this constraint in Step 1's migration if it isn't already.
5. Update `WatchKeyword.hitCount += matches.length` and `lastHitAt = now()`.
6. Don't enqueue notifications yet (that's Step 6).

### 3.4 Worker registration
- Wire `keyword-scanner` into `workers/src/index.ts` (or whatever the entry point is).
- Concurrency: 5 (scanning is CPU-light vs. scraping).

### 3.5 Backfill script (optional but useful)
- One-time script at `workers/src/scripts/backfill-scans.ts` that walks recent Results and enqueues them for scanning. Useful for testing without re-crawling.

**Verification:**
- ✅ Demo user has WatchKeywords from seed (Step 1.3). Crawl a page known to contain "procurement". Verify a KeywordHit row appears in Postgres with the correct `matchedText`, `context`, `position`.
- ✅ Multiple matches in one page produce multiple KeywordHit rows.
- ✅ A page with zero matches produces zero KeywordHits, no errors.
- ✅ ReDoS test: try to add `(a+)+$` as a regex keyword — backend rejects it.
- ✅ Re-running scanner on the same Result doesn't double-insert (uniqueness constraint holds).

**Estimated effort:** 1.5 days.

---

## Step 4 — Keywords Management API + UI Rebuild

**Goal:** Users can create, edit, pause, and delete their own keywords. The Keywords page is rebuilt around `WatchKeyword` (currently it shows the global `TargetPattern` corpus).

**Why fifth:** The scanner exists and is recording hits for seeded keywords. Now users need the ability to add their own.

### 4.1 Backend routes (`backend/src/routes/keywords.ts`)
```
GET    /api/keywords?websiteId=&projectId=
POST   /api/keywords  { projectId, websiteId?, keyword, matchMode?, caseSensitive? }
PATCH  /api/keywords/:id  { keyword?, matchMode?, caseSensitive?, status? }
DELETE /api/keywords/:id
```
- All routes scoped to `req.user.id` (no cross-user access).
- Validation: `keyword` 1–200 chars; `matchMode ∈ {contains, exact, regex, fuzzy}`; for `regex`, run `safe-regex` rejection.
- Plan-limit enforcement (advisory for now; enforced for real in Step 9): `User.plan` controls a max-keywords-per-project cap.

### 4.2 Existing routes — keep `/api/patterns` separate
The global `TargetPattern` corpus still drives link prioritization in the scraper. Don't merge or rename — they coexist. The frontend just stops displaying it on the user-facing Keywords page (it stays on `/admin/patterns`).

### 4.3 Frontend: rebuild `/app/keywords`
- Header: title "Keywords" + plan-usage badge (e.g. "47 / 100 used") + filter (All / By Project / By Website).
- Action: "+ Add Keyword" button → modal with: Keyword text, Project select, Website select (optional, "All websites in project" by default), Match Mode (default `contains`), Case Sensitive checkbox.
- Table columns: Keyword (mono), Scope (project name + optional website pill), Match Mode pill, Case-Sensitive flag, Hit Count, Last Hit, Status (active/paused), Actions (Pause/Resume, Edit, Delete).
- Empty state: "Add your first keyword to start receiving alerts when matching content appears on your monitored websites."

### 4.4 Sidebar tweak
The Keywords nav item stays. The icon and label don't change. (We're rebuilding what's behind the link, not adding a new nav.)

**Verification:**
- ✅ Demo user logs in, adds keyword `Chromebook` scoped to a project, runs a crawl, sees hit count climb.
- ✅ Pause keyword → next crawl produces no new hits for it.
- ✅ Delete keyword → existing KeywordHit rows stay (history preserved); future scans skip it.
- ✅ Try to add a 201-char keyword → rejected with clear error.
- ✅ Try regex `(a+)+$` → rejected.
- ✅ Other user's keywords are not visible.

**Estimated effort:** 1.5 days.

---

## Step 5 — Hits API + Hits Page

**Goal:** Users can see, filter, and triage their `KeywordHit`s. This is the main workspace for the new product.

**Why sixth:** Hits are accumulating in the DB but invisible. This step makes them visible. Notifications (Step 6) will deep-link here.

### 5.1 Backend (`backend/src/routes/hits.ts`)
```
GET    /api/hits?status=new&keywordId=&websiteId=&from=&to=&limit=&page=
GET    /api/hits/:id
POST   /api/hits/:id/mark-relevant
POST   /api/hits/:id/dismiss
GET    /api/hits/stats   → { byKeyword, byWebsite, byDay (last 30) }
```
- Default sort: `foundAt DESC`. Pagination 50/page.
- All routes scoped to `req.user.id`.

### 5.2 Frontend: new page `/app/hits`
- Sidebar: add "Hits" item between "Discoveries" and "DLQ" with red badge for `status='new'` count.
- Layout:
  - Top: 4 StatCards — New Hits (last 24h), Total Hits (last 30d), Marked Relevant, Top Keyword.
  - Filter bar: Status (New / Relevant / Dismissed / All), Keyword (multiselect), Website (multiselect), Date range.
  - Hit list (cards, not table — better for showing context):
    - Each card: keyword chip(s), page title (linked, opens in new tab), monospace URL, snippet with the keyword **highlighted in green/yellow background**, found date, action buttons (Mark Relevant ✓ / Dismiss ✕).
    - Hover: green border + slight lift (consistent with Discoveries).
- Empty state per filter: tailored messages ("No new hits — your keywords are scanning. We'll let you know.").

### 5.3 Rename "Discoveries"
- Sidebar label: "AI Discoveries" (to disambiguate from "Hits").
- Page title same.
- This makes it clear: AI Discoveries = bucketed by classifier, Hits = matched on user-supplied keywords.

### 5.4 Highlighting
- Reusable `<HighlightedSnippet text snippet keyword />` component. Wrap matched substring with `<mark>`. Tailwind: `bg-yellow-100 text-yellow-900 px-0.5 rounded`.

**Verification:**
- ✅ User sees their hits, can filter and sort.
- ✅ Mark Relevant moves hit to "Relevant" tab; Dismiss moves to "Dismissed".
- ✅ Clicking the page title opens the source URL in a new tab.
- ✅ Keyword highlighting renders correctly even with case-mismatched matches.
- ✅ Stats card "Top Keyword" matches the actual top hit count in DB.

**Estimated effort:** 1.5 days.

---

## Step 6 — In-App Notifications

**Goal:** Every new `KeywordHit` produces a `Notification` for its owner, surfaced via a bell icon in the TopBar with real-time updates over SSE.

**Why seventh:** Hits are visible on `/app/hits` but the user has to remember to look. In-app notifications make the product *poll the user*, not the other way around.

### 6.1 New worker: `workers/src/notifier.ts`
- New BullMQ queue: `notify-queue`.
- Triggered by `keyword-scanner.ts` after KeywordHit insert: enqueue `{ keywordHitId }`.
- Per job:
  1. Load the hit with related WatchKeyword + User + Website.
  2. If `User.inAppNotifications === false` → skip in-app step.
  3. Insert a `Notification`:
     ```
     type:    'keyword_hit'
     title:   `Keyword "${keyword}" matched on ${website.url}`
     body:    `${pageTitle || pageUrl} — ${context.slice(0, 120)}…`
     link:    `/app/hits/${hitId}`
     payload: { hitId, keywordId, websiteId }
     ```
  4. Mark `KeywordHit.notifiedInApp = true`.
  5. Emit an SSE event on the user's stream (see 6.3).

### 6.2 Backend routes (`backend/src/routes/notifications.ts`)
```
GET    /api/notifications?unread=true&limit=20
GET    /api/notifications/unread-count
POST   /api/notifications/:id/read
POST   /api/notifications/read-all
DELETE /api/notifications/:id
GET    /api/notifications/preferences
PATCH  /api/notifications/preferences  { emailNotifications?, emailDigestFrequency?, inAppNotifications? }
```

### 6.3 SSE per user
- `GET /api/monitor/user-stream` — SSE channel keyed by `req.user.id`. Pushes events:
  - `notification.new` — `{ notificationId, title, body, link }`
  - `notification.unread-count` — number
- The existing `/api/monitor/stream` is admin/system-wide — keep separate.

### 6.4 Frontend
- New `useUserNotifications` hook (TanStack Query for the list, EventSource for real-time updates).
- TopBar: add bell icon with red dot + unread count.
  - Click → dropdown panel showing last 10 notifications + "See all" → `/app/notifications`.
  - Each item: icon by type, title, body excerpt, time ago, click → navigate to `link` and mark read.
  - "Mark all as read" button at top of dropdown.
- New page `/app/notifications` — full inbox with filters (unread / all), pagination, per-item delete.
- Settings → Alerts panel: wire it. Two toggles (email on/off, in-app on/off) + frequency dropdown (instant / hourly / daily).

### 6.5 Plan limit
- Free plan: in-app notifications unlimited but capped at 100 unread; new ones evict the oldest.
- This isn't critical at this step; just make the panel show "30 / 100 unread".

**Verification:**
- ✅ User adds keyword; site is crawled with a match; bell icon shows red dot within 2s (real-time SSE).
- ✅ Click bell → notification appears with correct title and link → click → navigates to `/app/hits/<id>` and marks read.
- ✅ Unread count decrements correctly.
- ✅ Toggle in-app off in settings → no new in-app notifications appear.
- ✅ SSE reconnects after a disconnect (drop wifi, reconnect, see live again).

**Estimated effort:** 2 days.

---

## Step 7 — Email Notifications (Instant)

**Goal:** When a `KeywordHit` is created, in addition to the in-app notification, an email is sent to the user (if their prefs say `instant`). Other frequencies (`hourly` / `daily`) come in Step 8.

**Why eighth:** Email is the single most-requested feature in your description ("user have to receive notification both in app and email"). It depends on the notifier from Step 6.

### 7.1 Set up Resend
- Verify your sending domain in Resend (DNS: SPF, DKIM, DMARC). Without this you'll land in spam.
- Add `RESEND_API_KEY` to `backend/.env.example` and your env files.
- Install `resend` package in `workers/`.

### 7.2 Email service module
`workers/src/services/email.service.ts`:
- `sendEmail({ to, subject, template, payload })`
- Renders the named template, calls Resend, on failure throws (BullMQ will retry).
- Insert `EmailLog` row before send (status=`queued`); update on success/failure.

### 7.3 Templates
React-email components in `workers/src/emails/`:
- `KeywordHitEmail.tsx` — single-hit instant alert. Subject: `New match on ${websiteHost}: "${keyword}"`. Body: page title + linked URL + highlighted snippet + buttons (Mark Relevant / Dismiss → magic-link tokens for one-click action without login).
- `WelcomeEmail.tsx` — sent on register.
- `PasswordResetEmail.tsx` — placeholder for later.

Templates **must include** the unsubscribe link: `https://app.itadintel.io/u/${unsubscribeToken}/unsubscribe?type=keyword_hit`.

### 7.4 Wire into `notifier.ts`
After in-app notification step:
- If `User.emailNotifications === true` AND `User.emailDigestFrequency === 'instant'`:
  - Dedupe: hash `(userId, keywordId, websiteId, pageUrl)`; if same hash sent in the last 5 min → skip.
  - Enqueue `email-queue` with `{ template: 'keyword_hit', userId, payload: { hitId, ... } }`.
- The `email-queue` worker pulls from queue and sends.
- On send success: `KeywordHit.notifiedEmail = true`, `EmailLog.status = 'sent'`.

### 7.5 Unsubscribe endpoint
`GET /u/:unsubscribeToken/unsubscribe?type=keyword_hit` — public route, no auth needed. Sets `User.emailNotifications = false`. Returns a tiny HTML "You've been unsubscribed" page.

### 7.6 Resend webhook (optional but recommended)
`POST /api/webhooks/resend` — verify signature, update `EmailLog.status` on `delivered`/`bounced`/`complained`. If `complained` → auto-unsubscribe the user.

**Verification:**
- ✅ Demo user has `emailDigestFrequency='instant'` and a real email. Trigger a hit. Email arrives within 30 seconds.
- ✅ Email displays in Gmail/Apple Mail without rendering issues; unsubscribe link works.
- ✅ Click unsubscribe → user's `emailNotifications` flips to false → next hit produces no email.
- ✅ Trigger 5 hits in 1 minute on the same (keyword, page) → only 1 email (dedupe works).
- ✅ EmailLog table shows the send attempt and status.

**Estimated effort:** 1.5 days.

---

## Step 8 — Email Digests (Hourly / Daily)

**Goal:** Users on `hourly` or `daily` frequency receive a single digest email with all their unmuted hits, instead of individual emails.

**Why ninth:** Power users will have many keywords → instant emails become noise. Digest is the difference between a useful product and an unsubscribed one.

### 8.1 Buffering
- Modify `notifier.ts`: when frequency is `hourly` or `daily`, **don't enqueue email-queue**. The hit is still recorded and the user can see it on `/app/hits` and via in-app notifications. Email is just deferred.

### 8.2 Digest scheduler worker
`workers/src/digest-scheduler.ts`:
- Cron: every hour at :05 (uses `node-cron` or BullMQ's repeatable jobs).
- For each user with `emailDigestFrequency='hourly'`:
  - Fetch all KeywordHits in the last 60 minutes where `notifiedEmail=false`.
  - If count > 0, render `DigestEmail` template, send, set `notifiedEmail=true` for all included hits.
- For `daily`: a separate cron at 09:00 in the user's timezone (default UTC for now; localize later).

### 8.3 Digest email template
`workers/src/emails/DigestEmail.tsx`:
- Subject: `${count} new matches in your watchlist`.
- Body: grouped by website, then by keyword. Top 20 hits shown; "+X more on the dashboard" footer.
- Each hit: title, URL, keyword chip, snippet, Mark Relevant / Dismiss magic links.

### 8.4 Settings UI
Already partially in place from Step 6. Confirm the dropdown supports all three values and the Save button persists them.

**Verification:**
- ✅ Switch demo user to `hourly`. Trigger 3 hits across the next 30 minutes. At :05, one email arrives with all 3.
- ✅ Switch to `daily`. Trigger hits across a day. At the daily cron, one email summarizes them.
- ✅ A user with no hits in the period gets no email (no empty digests).

**Estimated effort:** 1 day.

---

## Step 9 — Stripe Billing & Plan Enforcement

**Goal:** Users can subscribe to Pro / Premium / Enterprise via Stripe Checkout, manage via Stripe Customer Portal, and the backend enforces plan limits.

**Why tenth:** The product is now valuable enough to charge for. Until now, "Pro" / "Premium" / "Enterprise" were just labels with no behavior difference.

### 9.1 Stripe setup (test mode first)
- Create Products + Prices in Stripe dashboard:
  - Pro $49/mo, Premium $149/mo, Enterprise $499/mo.
  - Plus a one-off "Discovery Run" price ($99) for Step 10.
- Set up Stripe webhook endpoint signing secret.

### 9.2 Schema (already in NOTEBOOKLM §3.1.6)
- `Subscription` table.
- `Invoice` table.
- Migrate.

### 9.3 Backend (`backend/src/routes/billing.ts`)
```
GET    /api/billing/subscription
POST   /api/billing/checkout-session  { plan }  → returns Stripe Checkout URL
POST   /api/billing/portal-session    → returns Stripe Customer Portal URL
GET    /api/billing/invoices
POST   /api/webhooks/stripe           → public, signature-verified
```
- On register: create Stripe Customer immediately; store `stripeCustomerId` on User.
- Webhook handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Each updates `User.plan` and `Subscription` accordingly.

### 9.4 Plan-limit middleware
`backend/src/middleware/enforcePlanLimits.ts`:
- On `POST /api/websites` — check `Website.count where userId == req.user.id` < plan max.
- On `POST /api/keywords` — same, against keyword max.
- Return 402 Payment Required with `{ error, currentPlan, suggestedPlan, upgradeUrl }`.

### 9.5 `requirePlan` middleware
- Decorator for routes restricted to certain plans (used in Step 10 for Discovery).
- Usage: `app.post('/api/discovery', verifyJWT, requirePlan('premium'), …)`.

### 9.6 Frontend
- New page `/app/billing`:
  - Current plan card + status (active / past_due / canceled).
  - Usage bars: websites used / keywords used / alerts this month / discovery runs remaining.
  - "Upgrade" → calls `/api/billing/checkout-session`, redirects to Stripe Checkout.
  - "Manage Subscription" → `/api/billing/portal-session`.
  - Invoices table (paid status, amount, hosted PDF link).
- Pricing page (`/pricing` or section of landing): list four plans with feature comparison + CTA to register/upgrade.
- Plan-limit errors throughout the app: when user tries to add a 26th website on Pro, show a clear modal "You've hit your plan's website cap. Upgrade to Premium for 100 websites." with an Upgrade button.

### 9.7 Existing-user backfill
- Script: for every existing User without a Stripe Customer, create one and store the ID. Idempotent.

**Verification:**
- ✅ Demo user upgrades from Starter to Pro via Checkout (Stripe test card `4242 4242 4242 4242`). Webhook fires; `User.plan` updates; Subscription row created.
- ✅ Tries to add 26th website on Pro → 402 with upgrade CTA.
- ✅ Customer Portal → can change plan, cancel, see invoices.
- ✅ Failed payment (test card `4000 0000 0000 9995`) → `User.plan` still Pro until grace period; status `past_due`; admin sees in dashboard.
- ✅ Cancel subscription → at period end, plan reverts to Starter.

**Estimated effort:** 3 days.

---

## Step 10 — AI Business Discovery (Premium Feature)

**Goal:** Premium and Enterprise users can run an AI Business Discovery: enter their business name + description, get back a curated list of websites + keywords, accept all or some, auto-create the Project + Websites + Keywords.

**Why eleventh:** This is the headline differentiating feature. It depends on billing (gate the feature) and on the keyword infrastructure (the output of Discovery is keywords). Building it last means the foundation is rock-solid.

### 10.1 Schema
`BusinessDiscovery` table from [NOTEBOOKLM §3.1.5](NOTEBOOKLM.md). Migrate.

### 10.2 Provider integration
- Brave Search API: `BRAVE_SEARCH_API_KEY`. Helper: `searchWeb(query, count)` returning `{ url, title, snippet }[]`.
- Claude Haiku via Anthropic SDK: `ANTHROPIC_API_KEY`. Helper: `claude(prompt, model='claude-haiku-4-5')`.
- All calls wrapped with retries + cost tracking (sum input + output tokens × price → store on `BusinessDiscovery.costUsd`).

### 10.3 Backend (`backend/src/routes/discovery.ts`)
```
POST   /api/discovery        { businessName, description, targetGeography?, categories? }
                             → { discoveryId }   (verify Premium+)
GET    /api/discovery/:id    → { status, progress, proposedSites?, proposedKeywords? }
POST   /api/discovery/:id/accept  { siteIds[], keywords[] }
                             → creates Project + Websites + WatchKeywords
POST   /api/discovery/:id/reject
GET    /api/discovery        → user's discovery history
```
- `POST /api/discovery` decrements `Subscription.discoveryRunsRemaining`. If 0 on Pro → 402 with prompt to buy a one-off run.
- On Pro one-off purchase: separate route `POST /api/discovery/purchase-run` → Stripe one-off checkout; on webhook `checkout.session.completed`, increment `discoveryRunsRemaining`.

### 10.4 Discovery worker (`workers/src/discovery.ts`)
New BullMQ queue `discovery-queue`. Per job, four stages, each emitting progress %:

**Stage 1 — Plan (progress 0→20%).**
- Single Claude call with the business inputs. Returns JSON: `{ buyerTypes[], geographies[], categories[], terminology[], searchQueries[] }`.
- `searchQueries` are 5–10 templated queries like:
  - `{geography} school district procurement portal`
  - `{geography} city government surplus auction`
  - `{category} disposition RFP {geography}`

**Stage 2 — Search (20→50%).**
- For each search query, call Brave Search → up to 30 results each → dedupe by domain. Cap total candidates at 200.

**Stage 3 — Classify per site (50→85%).**
- For each candidate domain (parallelized 5-at-a-time):
  - Fetch homepage text (Cheerio, fast path).
  - Find candidate procurement subpaths from internal links (heuristic: link text contains "procurement", "purchasing", "bids", "rfp", "surplus", "auction", "vendor").
  - Single Claude call with `{ homepage snippet, candidate paths }` → returns `{ keep: bool, justification, suggestedTargetPaths[], suggestedKeywords[] }`.
  - Keep only sites with `keep=true`.

**Stage 4 — Curate (85→100%).**
- Aggregate `suggestedKeywords` across all kept sites. Group by theme (Claude call: cluster + label clusters).
- Rank sites: domain authority heuristic (govt/edu TLD bonus) + recency of homepage content.
- Cap output at 100 sites and 100 keywords.
- Write to `BusinessDiscovery.proposedSites` (with target paths and justification per site) and `proposedKeywords` (grouped by theme).
- Set `status='ready'`, `completedAt=now()`.
- Emit in-app notification `type='discovery_complete'` and an email (`DiscoveryReadyEmail.tsx`).

### 10.5 Frontend `/app/discovery`
- Premium-only route (redirect to upgrade if not Premium+).
- Step 1: Wizard form (business name, description, geography, categories).
- Step 2: Progress screen (poll `GET /api/discovery/:id` every 3s; show stage labels and progress bar).
- Step 3: Review screen
  - Two columns or two tabs: **Websites** (table with checkbox, URL, target paths, justification) and **Keywords** (chips grouped by theme, click to toggle).
  - "Select All" / "Select None" / "Smart Select" (top 50 by AI confidence).
  - Bottom: "Create Project from Selection" → POST accept → redirect to the new project's page.

### 10.6 Cost guardrails
- Hard cap on per-run cost: kill switch in worker if `costUsd > $5`. Set status `failed` with reason `cost_cap_exceeded`.
- Admin dashboard sees per-run cost (Step 11).

**Verification:**
- ✅ Premium demo user runs Discovery for "ACME ITAD — buys used Chromebooks from K-12 districts in California". Receives ~30 sites + ~50 keywords within 5 minutes.
- ✅ Accept selection → new Project created with the websites and watch keywords. Crawl runs; hits arrive over the next hour.
- ✅ Pro user without remaining runs gets 402; can buy a one-off run; works.
- ✅ Cost-capped run fails gracefully without leaving partial state.

**Estimated effort:** 4 days.

---

## Step 11 — Admin & Polish

**Goal:** Admin observability for the new features, deliverability monitoring, edge-case polish.

**Why last:** Admin is operator-facing, not customer-facing. We've shipped customer value in 1–10; now we make the operations team's life manageable.

### 11.1 Admin pages
- `/admin/billing` — MRR, ARR, active subscriptions by plan, churn rate (last 30 days), top 10 customers by spend, list of past_due subscriptions.
- `/admin/discovery` — list of all Discovery runs with cost, status, run-time. Per-run drilldown showing the LLM trace (search queries, candidates, kept/rejected, final output).
- `/admin/notifications` — email deliverability dashboard: sent, delivered, bounced, complained per day; unsubscribe rate by template; top users by email volume.
- `/admin/keywords` — global view of all WatchKeywords (rebrand existing `/admin/patterns` or coexist).

### 11.2 Operational tooling
- Soft-delete vs. hard-delete review: WatchKeyword and KeywordHit deletion should retain audit trail (status field rather than DELETE).
- Audit log table for sensitive admin actions (plan changes, suspensions).
- Sentry release tagging on every deploy.

### 11.3 Performance
- Postgres: add indexes once we have realistic data volumes (after a week of staging traffic). Likely candidates: `KeywordHit(userId, status, foundAt)`, `Notification(userId, readAt)`.
- Cache plan-limit checks in Redis with 60s TTL.

### 11.4 Edge cases
- User downgrades from Premium to Pro and now has too many websites → grace period of 14 days; banner forces them to deactivate excess websites.
- Email bounces 3 times for the same user → auto-unsubscribe + admin alert.
- Discovery worker crash mid-run → status set to `failed`, no charge consumed.
- WatchKeyword regex DoS attempt → kill the matching task at 50ms timeout, log to Sentry.

### 11.5 Documentation
- User-facing docs at `/help`: how watchlists work, how to write keywords, how to read hits, FAQ on email frequency, billing.
- Developer docs (`README.md` in each workspace): how to run, how to add a feature.

**Verification:**
- ✅ All admin dashboards load with non-empty data on staging.
- ✅ Sentry receives a forced exception from each workspace.
- ✅ Deliverability rate > 95% on last 100 emails.
- ✅ Downgrade scenario tested.

**Estimated effort:** 2 days.

---

## Tracker Checklist

Tick as you ship.

- [x] **Step 0** — Pre-flight (Redis, baseline migration, tests, CI, staging, externals locked) — ~2–3 days
- [x] **Step 1** — Schema migration for keyword watchlist — ~0.5 day
- [x] **Step 2** — Scraper persists full text + honors target pages — ~1 day
- [x] **Step 3** — Keyword Scanner Worker — ~1.5 days
- [ ] **Step 4** — Keywords Management API + UI rebuild — ~1.5 days
- [ ] **Step 5** — Hits API + Hits page — ~1.5 days
- [ ] **Step 6** — In-app Notifications — ~2 days
- [ ] **Step 7** — Email Notifications (instant) — ~1.5 days
- [ ] **Step 8** — Email Digests (hourly / daily) — ~1 day
- [ ] **Step 9** — Stripe Billing + plan enforcement — ~3 days
- [ ] **Step 10** — AI Business Discovery (Premium) — ~4 days
- [ ] **Step 11** — Admin & Polish — ~2 days

**Total: ~22–25 working days for a single full-stack engineer.** Realistically 5–6 weeks with normal life. Two engineers in parallel after Step 1 → ~3 weeks.

---

## How to Use This Plan

- Work top to bottom. Don't skip steps.
- At the start of each step: branch off `main`, name the branch `step-N-<short-name>`.
- At the end of each step: deploy to staging, run that step's verification list, merge to `main`, deploy to production. Then start the next step.
- If a step takes >1.5× its estimate, stop and reassess. The plan probably has a wrong assumption somewhere.
- Keep `NOTEBOOKLM.md` updated as you ship: move things from "Vision" to "Today" sections as they become real.
- After Step 6 the product is **viable** — keyword watchlists + in-app + email alerts. You could open private beta there if you wanted, then keep building 7–11 with paying customers' feedback.

End of plan.
