# ITAD Intelligence — Project Knowledge Source (Vision + Current State)

A single-source briefing for NotebookLM. This document is split into four parts:

- **Part 1 — Product Vision.** What the product is *meant* to do. This is the source of truth for what we are building toward.
- **Part 2 — Current Implementation.** What the codebase actually does today. Some of Part 1 is built; some isn't.
- **Part 3 — Implementation Gap & Migration Plan.** What needs to change in the existing app to fulfil Part 1.
- **Part 4 — Reference.** Glossary, FAQ, ops notes.

Every "Vision" item below is clearly marked. Every "Today" item describes shipped code.

---

# Part 1 — Product Vision

## 1.1 What This Product Is

**ITAD Intelligence** is a procurement-monitoring SaaS for the **IT Asset Disposition (ITAD)** industry — the business of recovering, refurbishing, reselling, and recycling end-of-life IT equipment. The customers are ITAD vendors and resellers who need to find buying opportunities (used IT equipment for sale) and selling opportunities (institutions disposing of equipment) before their competitors do.

The product replaces the manual process of analysts checking school-district, government, hospital, and university procurement pages for relevant RFPs, surplus auctions, and equipment-disposition notices.

**The single most important user flow** — and the core business idea — is this:

> A user adds a **website** they care about (e.g. a school-district procurement portal) and a list of **keywords** they care about (e.g. "Chromebook refresh", "computer surplus", "technology disposition", "RFP IT equipment"). Our scraper continuously monitors **specific pages on that website** (purchase pages, procurement pages, bid postings, RFP listings, surplus pages). When **any of the user's keywords matches content on any of those pages**, the user is **notified immediately — both in-app and by email** — with the website, the exact page URL, the keyword that fired, and a snippet of context.

Everything else in the product (AI classification, the agent fleet, the proxy pool, the DLQ) exists to make that single flow reliable, fast, and accurate.

## 1.2 Target Customer

ITAD vendors who sell into or buy from:
- **Public school districts (K–12)** — the primary vertical. School districts publish technology-refresh RFPs, surplus-equipment auctions, and procurement notices on public portals on a predictable cadence.
- **Universities and community colleges**.
- **State and local government** (DOIT, GSA, county procurement portals).
- **Hospitals and healthcare systems**.
- **Large enterprises** with public RFP/surplus disclosure.

The product is verticalized around these institutional buyers and sellers. Generic web scraping for arbitrary use cases is **out of scope**.

## 1.3 The Core User Flow (Vision)

1. **Sign up.** User registers, picks a plan.
2. **Create a project.** A project groups a set of websites they want to monitor (e.g. "Texas school districts").
3. **Add websites.** For each website, the user supplies:
   - The base URL (e.g. `https://www.austinisd.org`).
   - **Target page patterns** — URL-path patterns like `/procurement`, `/purchasing`, `/bids`, `/rfp`, `/surplus`, `/auction`. The crawler restricts itself to pages matching these patterns. (If left empty, it falls back to the existing AI prioritizer.)
   - Crawl frequency (e.g. daily, hourly).
   - Optional priority (high / medium / low).
4. **Add keywords.** For each website (or globally for the project) the user adds keywords they want flagged. Keywords can be:
   - Plain strings (`"Chromebook"`, `"surplus"`, `"computer disposition"`)
   - Phrases (`"technology refresh"`, `"end of life equipment"`)
   - Optional fuzzy/near-match (configurable)
5. **Receive alerts.** Whenever the scraper finds a page that matches a target page pattern AND contains a watched keyword:
   - **In-app notification** appears in the user's notification center (bell icon).
   - **Email notification** is sent to the user's registered email.
   - The notification includes: website, page URL, page title, keyword(s) that fired, surrounding context (200-char snippet around the match), and a "Mark as relevant / Dismiss" action.
6. **Triage.** The user marks each hit as relevant or not. Relevant hits feed back into the system to improve future prioritization.

## 1.4 Plans and Pricing (Vision)

Four tiers. **Premium and Enterprise are paid; the AI Business Discovery feature is bundled into Premium and above.**

| Plan | Price | Websites | Keywords | Alerts/mo | AI Business Discovery | Compute Budget (agents) |
|---|---|---|---|---|---|---|
| **Starter** | Free | 3 | 10 | 100 | ❌ | 2 |
| **Pro** | $49 / mo | 25 | 100 | 2,000 | ❌ | 10 |
| **Premium** | $149 / mo | 100 | unlimited | 10,000 | ✅ included (1 run / mo) | 30 |
| **Enterprise** | $499 / mo | unlimited | unlimited | unlimited | ✅ unlimited runs | 100 |

Add-on pricing:
- Extra **AI Business Discovery** runs on Pro: $99 per run.
- Extra alerts beyond plan cap: $0.01 per alert.
- White-label / API access: Enterprise only, custom pricing.

Billing: monthly subscription via Stripe (vision — not yet integrated).

## 1.5 Premium Feature — AI Business Discovery

**The pitch.** Rather than the user manually researching which websites and keywords to track, they tell us their business. Our AI does the research and proposes a starter watchlist for them.

**How it works (vision):**
1. User on Premium or Enterprise opens the **AI Business Discovery** wizard from the dashboard.
2. They enter:
   - Business name (e.g. "ACME Refurbished IT").
   - One-line description (e.g. "We buy used Chromebooks and laptops from K-12 districts in the Southwest US and resell them refurbished.").
   - Optional: their existing website, target geography, target equipment categories (laptops, servers, networking, etc.).
3. Backend kicks off an asynchronous **discovery job**:
   - An LLM analyses the business description and infers: target buyer types (school districts, county governments, hospitals…), target geographies, target equipment categories, relevant terminology.
   - A web-search step (via SerpAPI / Brave Search / Bing API — TBD) finds candidate institutional websites in the user's target geography (e.g. "school districts in Texas procurement portal").
   - A second LLM pass per candidate site classifies whether the site actually publishes the kind of notices the user cares about, and identifies the right target page paths within each site (`/procurement`, `/purchasing`, `/surplus`, etc.).
   - The LLM also generates a tailored keyword list (e.g. "Chromebook refresh", "1:1 device program surplus", "technology disposition", "computer auction").
4. Within ~2–10 minutes, the user receives a discovery report:
   - **N proposed websites** (typically 20–80) with target page patterns pre-populated.
   - **M proposed keywords** (typically 30–100) grouped by theme.
   - Each item has a short justification ("This website publishes K-12 surplus auctions monthly").
5. User reviews, can accept all / reject all / pick-and-choose, and on confirm the system auto-creates the corresponding `Project`, `Website`s, and `WatchKeyword`s.
6. The discovery run is consumed against the user's monthly allowance (Premium = 1, Enterprise = unlimited). Extra runs on Pro are billed as a one-time charge.

**Why this is monetized.** It uses paid web-search API quota, multiple LLM passes per candidate site (more expensive than the inline classifier), and produces a high-value asset (a curated watchlist) that would otherwise take a human analyst days to build.

**Cost & latency targets (vision).** Discovery run completes in 2–10 minutes; cost-to-serve <$2 per run at projected volumes.

## 1.6 The Three-Phase Roadmap (Vision, revised)

This supersedes the marketing landing page's "Phase 1/2/3" pitch.

- **Phase 1 — Foundation (Today + Migration).** Reliable scraper with proxy rotation, AI classification (current), DLQ, dual-role dashboards. **+ Migration**: per-user keyword watchlists, target-page targeting, in-app + email notifications.
- **Phase 2 — Premium Discovery.** AI Business Discovery launches. Stripe billing live. Alert digests (daily/weekly summary email). Slack and webhook delivery channels.
- **Phase 3 — Active Outreach + Marketplace.** When a high-confidence opportunity is found, the system can draft a tailored outreach email or RFQ response. Integration with marketplaces (eBay, GovDeals, PublicSurplus) for cross-referencing arbitrage signals.

---

# Part 2 — Current Implementation (What's Built Today)

## 2.1 Honest Status

**The codebase implements an earlier model** of the product: an AI-classifier-driven crawler that buckets every page into `bidding | selling | informational | irrelevant` and surfaces the first two as "Discoveries." It does **not yet implement** the per-user keyword watchlist + email notification flow described in Part 1. It does **not yet implement** AI Business Discovery, billing, or in-app notifications.

The shipped code is the foundation. Most of it is reusable. See Part 3 for the migration plan.

## 2.2 High-Level Architecture (Today)

A four-workspace npm monorepo:

```
ITAD_scrapper/
├── frontend/   React 18 + Vite + TanStack Query           (port 5173)
├── backend/    Express 5 + Prisma + JWT auth              (port 3001)
├── workers/    BullMQ workers (scraper, classifier, DLQ, …)
├── shared/     Shared TypeScript types
├── database/   Raw SQL migrations + seed data
└── design/     Static HTML mockups (reference only)
```

External services:

| Service | Purpose | Default URL |
|---|---|---|
| **PostgreSQL 16** | Primary data store (10 tables) | `localhost:5432` |
| **Redis 7** | BullMQ job queue + DLQ stream | `localhost:6379` |
| **Ollama (llama3.2)** | Local AI page classifier | `localhost:11434` |

Process model: **Backend** serves REST + SSE on 3001; **Frontend** is a Vite SPA on 5173; **Workers** is a separate Node process consuming BullMQ. Backend ↔ Workers communicate exclusively via Redis.

## 2.3 Tech Stack (Today)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TS + Tailwind v3 + shadcn/ui + TanStack Query v5 + Zustand + React Router v6 + Recharts |
| Fonts | Space Grotesk (display) + DM Sans (body) + DM Mono (code) |
| Backend | Node.js 20 + Express 5 + Prisma v5 + Zod |
| Auth | JWT — 15min access + 7-day refresh (httpOnly cookie) |
| Database | PostgreSQL 16 (JSONB for flexible payloads) |
| Queue | BullMQ v5 + Redis 7 |
| Scraper | Playwright (JS sites) + Cheerio (static) |
| AI | Ollama → llama3.2 (local inference, <200ms target) |
| Live updates | Server-Sent Events |

## 2.4 Data Model (Today) — 10 Tables

1. **User** — `email`, `passwordHash`, `name`, `role` (user|admin), `plan` (starter|pro|enterprise), `computeBudget` (agent cap).
2. **Project** — owner-scoped grouping; `status` (active|paused|archived).
3. **Website** — URL + crawl params: `depth`, `crawlBudget`, `schedule` (cron), `priority`, `status`. Tracks `lastCrawled`, `totalPages`, `yieldRate`.
4. **Job** — one crawl unit. `status` (pending|active|completed|failed), `retries` (0–3), `proxyTier`, `proxyId`, `errorType`.
5. **Result** — kept page classified by AI. `classification` (bidding|selling|informational|irrelevant), `confidence`, `reason`, `rawContent` (JSONB).
6. **DlqEvent** — Dead-letter queue persistence. `payload` (JSONB), `status` (pending|retried|archived), three retry timestamps.
7. **ProxyHealth** — proxy pool. `tier` (1=residential / 2=datacenter / 3=rotating), `successRate`, `cooldownUntil`, `blockedDomains[]`, `status` (active|idle|quarantined).
8. **TargetPattern** — **system-wide** keyword corpus (note: not per-user). `source` (seed|learned), `confidenceScore`, `matchCount`, `status` (active|archived|pinned|blocked).
9. **AgentRegistry** — scraper worker fleet. `status` (idle|active|draining|terminated), `currentJob`, `cpuPercent`, `heartbeat`.
10. **RefreshToken** — server-side refresh-token store.

**Important caveat for Vision migration**: `TargetPattern` is global, used to prioritize *which links to crawl*. It is **not** a per-user keyword watchlist and does not drive notifications.

## 2.5 Authentication (Today)

JWT, two-token model. `verifyJWT` middleware attaches `req.user`; `requireAdmin` gates admin routes. Frontend Axios interceptor auto-refreshes on 401.

Routes: `POST /api/auth/{register,login,refresh,logout}`, `GET /api/auth/me`.

Seeded credentials (from `database/002_seed.sql`):
- Admin: `scrapperadmin@gmail.com` / `admin123`
- Demo user: `john@itadintel.io` / `Demo@123456`

## 2.6 REST API Surface (Today)

User routes (require JWT):
```
/api/auth/*          register, login, refresh, logout, me
/api/projects        CRUD + /:id/stats
/api/websites        per-project list; CRUD; /:id/crawl;
                     /:id/jobs; /:id/results
/api/jobs            list (filter by status), read, /stats
/api/results         list (filter by type/project, paginated), read
/api/dlq             user's own list; /:id/retry, /:id/archive,
                     /retry-all, /stats
/api/patterns        list (global TargetPattern, read-only)
/api/monitor/stream  SSE: queue depth, agents, DLQ inflow
```

Admin routes (require admin role): `/api/admin/{agents,queue,dlq,proxies,ai,users,patterns}/*` — fleet, queue, system DLQ, proxy management, classifier mode, user management, pattern governance.

## 2.7 Scraping Pipeline (Today)

1. **Trigger.** `POST /api/websites/:id/crawl` inserts a `Job`, enqueues to `scrape-queue`.
2. **Scraper worker** picks up the job (concurrency 3 per instance):
   - Selects a proxy via tier-weighted algorithm (Tier 1 → 2 → 3, weighted by success rate).
   - Fetches via Playwright (or Cheerio for static).
   - Discovers links, scores each via the **5-signal prioritizer**:
     - Keyword match (40%) — global `TargetPattern` corpus
     - Structural depth (20%) — shallower URLs win
     - Freshness (20%) — date patterns / `/2026/` boost
     - Historical yield (15%) — past Result URLs from same domain
     - Sibling context (5%) — neighbors of matched links
   - Crawls top-N scored links up to `crawlBudget`.
3. **Each fetched page** is sent to the **Ollama classifier** with `{url, title, bodySnippet (500 chars)}`. Classifier returns `{classification, confidence, reason}`. Results with classification `bidding` or `selling` are persisted as `Result` rows.
4. **On error**: retries up to 3 times with worse proxy tiers and 2–10s jitter. After 3 failures → push to Redis DLQ stream.
5. **On completion**: update `Job` and `Website` (lastCrawled, totalPages, yieldRate).

## 2.8 Background Workers (Today)

- **DLQ Triage Worker** — every 30s: drains the Redis DLQ stream into PostgreSQL `DlqEvent`. Auto-retries transient failures on 5min/30min/2hr backoff. Archives permanent failures.
- **Proxy Health Worker** — every 5min: pings each proxy through a known-good URL. Quarantines proxies <50% success rate for 10 min cooldowns.
- **Pattern Learner Worker** — every 6h: extracts URL n-grams from confirmed `bidding`/`selling` results. Promotes new keywords to active at confidence ≥0.75; archives at <0.2; decays unmatched patterns by 0.1 per 90 days. (Operates on global `TargetPattern`, not per-user watchlists.)
- **Classifier** — called inline by the scraper, not scheduled.

## 2.9 Frontend — User Dashboard (Today)

`UserSidebar` (220px / 58px) + `TopBar` + content. Nav items:
- **Overview** (`/app`) — 4 StatCards, projects table, queue health, recent discoveries.
- **Projects** (`/app/projects`) — card grid, inline new-project form.
- **Project Detail** (`/app/projects/:id`) — stats + website table, Add Website modal.
- **Website Detail** — stats + job-log timeline + AI-classified discoveries.
- **Discoveries** (`/app/results`) — filter tabs (All/Bidding/Selling), result cards.
- **DLQ** (`/app/dlq`) — stats, retry-all banner, table with row actions.
- **Keywords** (`/app/keywords`) — table view of the global `TargetPattern` corpus (note: read-only, system-wide).
- **Settings** (`/app/settings`) — 2×2 panels: Account, Plan & Billing, Scraping Defaults, Alerts (UI present but not wired).

## 2.10 Frontend — Admin Dashboard (Today)

`AdminSidebar` (228px / 58px) + `TopBar` (with live "System operational" indicator + queue depth counter). Nav items:
- **System Overview** (`/admin`) — 5 live StatCards, queue-by-project, scaling thresholds, system events, user compute budgets.
- **Agent Pool** (`/admin/agents`) — fleet table with Drain/Terminate.
- **Job Queue** (`/admin/queue`) — partitioned, priority-sorted job list.
- **Admin DLQ** (`/admin/dlq`) — same as user DLQ + error-type breakdown across all users.
- **Proxy Pool** (`/admin/proxies`) — three sections (one per tier) with Demote / Restore.
- **AI Classifier** (`/admin/ai`) — mode selector (Shadow / Advisory / Autonomous), per-domain accuracy, retrain trigger.
- **Users** (`/admin/users`) — searchable user table with plan management.
- **Global Patterns** (`/admin/patterns`) — pattern table with Pin / Block / Archive.

## 2.11 Design System (Today)

Color tokens: page bg `#f7f8f5`, card `#ffffff`, brand green `#1a9e57` (tint `#e6f7ee`), amber `#d97706`, red `#dc2626`, blue `#2563eb`, plus pastel surfaces (mint / lavender / peach / yellow / sky).

Typography: Space Grotesk (-0.04em on big numbers) for display; DM Sans for body; DM Mono for IDs/URLs/code.

Patterns: `StatCard` (label + value + sub + optional progress bar), `StatusPill` (dot + colored bg/text by status), `DataTable` (page-bg header, hover row tint), `Sidebar` (220/58px collapse, mint-bg active state).

## 2.12 Operational Behavior (Today)

- Backend without Redis still starts; `ioredis` floods `ECONNREFUSED` errors but HTTP keeps serving. Crawl-enqueue endpoints fail at request time. Reads still work.
- Workers cannot start without Redis.
- Classifier degrades gracefully: if Ollama is down, every page falls back to `informational` with confidence 0.
- DLQ is two-stage: Redis Stream (transport) → Postgres `DlqEvent` (record of truth).
- Scraping rotates *worse* on retry (Tier 1 → 2 → 3 → DLQ); never retries on the same tier.
- Compute budget is advisory only; not enforced server-side yet.

---

# Part 3 — Implementation Gap & Migration Plan

This is the work to take Part 2 (today) to Part 1 (vision). Organized by area, with schema, backend, worker, and frontend deltas for each.

## 3.1 Schema Changes — New Tables

### 3.1.1 `WatchKeyword` (NEW)
Per-user, per-website keyword watchlist. Drives notifications.

```prisma
model WatchKeyword {
  id           String   @id @default(cuid())
  userId       String
  websiteId    String?  // null = applies to all websites in projectId
  projectId    String
  keyword      String   // string or phrase
  matchMode    String   @default("contains")  // contains | exact | regex | fuzzy
  caseSensitive Boolean @default(false)
  status       String   @default("active")    // active | paused
  hitCount     Int      @default(0)
  lastHitAt    DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([userId])
  @@index([websiteId])
  @@index([projectId])
  @@index([keyword])
}
```

### 3.1.2 `KeywordHit` (NEW)
Records of every keyword match. One row per (page, keyword) match.

```prisma
model KeywordHit {
  id            String   @id @default(cuid())
  watchKeywordId String
  userId        String
  websiteId     String
  projectId     String
  resultId      String?  // FK to Result if classifier also ran
  pageUrl       String
  pageTitle     String?
  matchedText   String   // the keyword that matched
  context       String   // 200-char snippet around the match
  position      Int      // char offset in page text
  status        String   @default("new")     // new | reviewed | relevant | dismissed
  notifiedInApp Boolean  @default(false)
  notifiedEmail Boolean  @default(false)
  foundAt       DateTime @default(now())

  @@index([userId, status])
  @@index([websiteId])
  @@index([watchKeywordId])
  @@index([foundAt])
}
```

### 3.1.3 `Notification` (NEW)
In-app notifications inbox.

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // keyword_hit | crawl_complete | dlq_alert | discovery_complete | billing
  title     String
  body      String
  link      String?  // deep-link in dashboard
  payload   Json?    // type-specific data
  readAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId, readAt])
  @@index([createdAt])
}
```

### 3.1.4 `EmailLog` (NEW)
Records of sent email notifications (for debugging, throttling, unsubscribe).

```prisma
model EmailLog {
  id          String   @id @default(cuid())
  userId      String
  toEmail     String
  subject     String
  template    String   // keyword_hit | digest_daily | discovery_ready | …
  payloadHash String   // dedupe identical content
  providerId  String?  // Resend / SendGrid message ID
  status      String   @default("queued") // queued | sent | delivered | bounced | failed
  error       String?
  sentAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([userId, sentAt])
  @@index([providerId])
}
```

### 3.1.5 `BusinessDiscovery` (NEW — Premium)
Tracks each AI Business Discovery run.

```prisma
model BusinessDiscovery {
  id              String   @id @default(cuid())
  userId          String
  businessName    String
  description     String
  targetGeography String?
  targetCategories String[] @default([])  // e.g. ["laptops", "servers"]
  status          String   @default("pending") // pending | researching | analyzing | ready | accepted | failed
  progress        Int      @default(0)         // 0–100
  proposedSites   Json?    // [{ url, targetPaths, justification }]
  proposedKeywords Json?   // [{ keyword, theme, justification }]
  acceptedSiteIds String[] @default([])
  acceptedKeywords String[] @default([])
  errorMessage    String?
  startedAt       DateTime?
  completedAt     DateTime?
  costUsd         Float?   // attributed cost-to-serve
  createdAt       DateTime @default(now())

  @@index([userId, status])
}
```

### 3.1.6 `Subscription` and `Invoice` (NEW — Billing)
Stripe-backed.

```prisma
model Subscription {
  id                  String   @id @default(cuid())
  userId              String   @unique
  stripeCustomerId    String   @unique
  stripeSubscriptionId String?
  plan                String   // starter | pro | premium | enterprise
  status              String   // active | past_due | canceled | trialing
  discoveryRunsRemaining Int   @default(0)
  alertsRemainingThisMonth Int @default(0)
  currentPeriodEnd    DateTime?
  cancelAt            DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model Invoice {
  id              String   @id @default(cuid())
  userId          String
  stripeInvoiceId String   @unique
  amountCents     Int
  currency        String   @default("usd")
  status          String   // draft | open | paid | void | uncollectible
  description     String?
  hostedUrl       String?
  pdfUrl          String?
  paidAt          DateTime?
  createdAt       DateTime @default(now())

  @@index([userId])
}
```

## 3.2 Schema Changes — Existing Tables

### 3.2.1 `Website` — add target-page filtering
```prisma
model Website {
  // … existing fields …
  targetPagePatterns String[] @default([])
  // e.g. ["/procurement", "/purchasing", "/bids", "/rfp", "/surplus"]
  // Empty array = fall back to existing 5-signal AI prioritizer.
}
```

### 3.2.2 `User` — add notification + plan fields
```prisma
model User {
  // … existing fields …
  plan                  String  @default("starter") // add "premium" tier
  emailNotifications    Boolean @default(true)
  emailDigestFrequency  String  @default("instant") // instant | hourly | daily
  inAppNotifications    Boolean @default(true)
  unsubscribeToken      String  @unique // for email unsubscribe links
}
```

### 3.2.3 `Result` — link to keyword hits (optional)
Already has `bodySnippet`; we need full body text searchable. Add:
```prisma
model Result {
  // … existing fields …
  fullText     String?  // full page text for keyword scanning (TEXT)
  textHash     String?  // dedupe re-scrapes
  keywordHits  KeywordHit[]
}
```
Index `Result.fullText` with PostgreSQL trigram (`pg_trgm`) for fuzzy search.

## 3.3 Backend Changes

### 3.3.1 New routes
```
/api/keywords                      [user]
  GET    ?websiteId=&projectId=
  POST   { projectId, websiteId?, keyword, matchMode?, caseSensitive? }
  PATCH  /:id  { keyword?, matchMode?, caseSensitive?, status? }
  DELETE /:id

/api/hits                          [user]
  GET    ?status=new&keywordId=&websiteId=&from=&to=&limit=
  GET    /:id
  POST   /:id/mark-relevant
  POST   /:id/dismiss
  GET    /stats                    by-keyword, by-website, by-day

/api/notifications                 [user]
  GET    ?unread=true&limit=
  POST   /:id/read
  POST   /read-all
  GET    /unread-count

/api/notifications/preferences     [user]
  GET
  PATCH  { emailNotifications, emailDigestFrequency, inAppNotifications }

/api/billing                       [user]
  GET    /subscription
  POST   /checkout-session         → Stripe Checkout URL
  POST   /portal-session           → Stripe customer portal
  GET    /invoices

/api/discovery                     [user, premium+]
  POST   /                         { businessName, description, targetGeography?, categories? }
                                   → { discoveryId } (async)
  GET    /:id                      → progress + proposed assets
  POST   /:id/accept               { siteIds[], keywords[] }  → creates Project/Websites/Keywords
  POST   /:id/reject

/api/admin/discovery               [admin]
  GET                              all discovery runs
  GET    /:id                      → cost attribution, LLM trace

/api/webhooks/stripe               [public, signed]
  POST                             billing event sink
```

### 3.3.2 Updated routes
- `POST /api/websites` — accept `targetPagePatterns[]`.
- `GET /api/results/:id` — include matched `KeywordHit`s.
- `POST /api/auth/register` — initialize default notification prefs + Stripe customer.

### 3.3.3 Middleware
- `requirePlan(minPlan: 'pro' | 'premium' | 'enterprise')` — gate Discovery, extra capacity, etc.
- `enforcePlanLimits()` — checks website/keyword caps and remaining alert quota before mutating.

### 3.3.4 Email service (NEW)
`backend/src/services/email.service.ts`:
- Provider: **Resend** (recommended — generous free tier, simple API, React-email templates) or SendGrid.
- Templates (React-email or MJML): keyword-hit instant alert, daily digest, weekly digest, discovery-ready, billing receipt, password reset.
- Sends via BullMQ `email-queue` for retry/throttling.
- Honors `User.emailNotifications` and `EmailLog.payloadHash` (dedupe).

## 3.4 Worker Changes

### 3.4.1 `scraper.ts` — modified
- Honor `Website.targetPagePatterns`: when non-empty, skip URLs whose path doesn't match any pattern. Patterns are matched against the URL path with `String.includes()` (or regex for advanced users).
- After fetching a page, **always** persist `Result.fullText` and `Result.textHash` (today only "useful" classifications get a Result row).
- After persisting Result, enqueue a **`keyword-scan`** job for the new content.

### 3.4.2 `keyword-scanner.ts` (NEW worker)
Consumes `keyword-scan` queue. For each page:
1. Load all active `WatchKeyword`s scoped to this `websiteId` (or project-level keywords).
2. For each keyword, scan `Result.fullText`:
   - `contains` — `.indexOf()` with optional case-insensitive.
   - `exact` — word-boundary regex.
   - `regex` — user-supplied (validated, length-limited).
   - `fuzzy` — Postgres trigram similarity ≥0.7.
3. For every match: insert a `KeywordHit` row, increment `WatchKeyword.hitCount`, set `lastHitAt`.
4. Enqueue a **`notify`** job per hit.

### 3.4.3 `notifier.ts` (NEW worker)
Consumes `notify` queue. Per hit:
1. **In-app**: insert `Notification(type='keyword_hit', …)`. Push via SSE to the user's connected browser tab(s) in real time.
2. **Email**: respect `User.emailDigestFrequency`:
   - `instant` → enqueue email-queue immediately (deduped by `payloadHash` for the last 5 minutes).
   - `hourly` / `daily` → buffer; the scheduler fires a digest worker (§3.4.4).
3. Mark `KeywordHit.notifiedInApp` and/or `notifiedEmail` once delivered.

### 3.4.4 `digest-scheduler.ts` (NEW worker)
- Hourly cron: fan out hourly digests to users on `hourly` frequency.
- Daily cron (e.g. 09:00 user-local): fan out daily digests.

### 3.4.5 `discovery.ts` (NEW worker — Premium)
Consumes `discovery` queue. Stages:
1. **Plan**: LLM analyses `businessName + description` → infers buyer types, geography, categories, terminology. Emits `progress=20`.
2. **Search**: external web-search API (SerpAPI/Brave/Bing) seeded with templated queries ("school district procurement portal Texas", etc.). Collects 200–500 candidate URLs. `progress=50`.
3. **Classify**: per candidate site, fetch homepage + likely procurement subpaths, run an LLM scorer to keep/reject and to suggest target paths. `progress=80`.
4. **Curate**: rank, dedupe, group keywords by theme, write to `BusinessDiscovery.proposedSites` and `proposedKeywords`. Set `status='ready'`, emit in-app notification.

Cost is recorded in `BusinessDiscovery.costUsd`. Hard cap on per-run cost (kill switch).

## 3.5 Frontend Changes

### 3.5.1 New pages
- `/app/keywords` — **rebuilt**. Today it shows the global pattern corpus; replace with per-user watchlist management. Tabs: All / By Project / By Website. Add/Edit/Delete keywords. Show hitCount and lastHitAt per keyword.
- `/app/hits` — new "Keyword Hits" page replacing or sitting next to "Discoveries". Lists `KeywordHit`s. Filters: keyword, website, status, date. Each row shows: keyword chip, page title + URL, snippet with the keyword highlighted, "Mark relevant / Dismiss" actions.
- `/app/notifications` — full notification center (the bell-icon dropdown's "See all" target).
- `/app/discovery` — **Premium-only**. Wizard: enter business name + description → progress UI (poll `GET /api/discovery/:id`) → review screen (table of proposed sites + grouped keywords with checkboxes) → "Create Project" CTA.
- `/app/billing` — current plan card, usage bars (websites, keywords, alerts, discovery runs), Upgrade button → Stripe Checkout, Manage Subscription → Stripe portal, Invoices table.

### 3.5.2 Modified pages
- **Add Website modal** — add `targetPagePatterns[]` chip input (placeholder: "Paths like /procurement, /bids — leave empty for AI-driven crawling").
- **Settings → Alerts panel** — wire it. Email on/off, frequency selector, in-app on/off.
- **Settings → Plan & Billing panel** — link to `/app/billing`.
- **TopBar** — add bell icon with unread count, opens dropdown of recent `Notification`s. Real-time via SSE.
- **Discoveries page** — keep but rename to "AI Discoveries" to disambiguate from "Keyword Hits".
- **Sidebar** — add "Hits" (between Discoveries and DLQ) and "Discovery" (Premium-only, with crown icon) and "Billing" under Settings.
- **Keywords page header** — show plan limit usage ("47 / 100 keywords used").

### 3.5.3 Admin additions
- `/admin/billing` — MRR, ARR, churn, plan distribution, top customers by spend.
- `/admin/discovery` — global view of all Discovery runs, costs per run, per-user run history.
- `/admin/notifications` — email deliverability dashboard, bounce rate, unsubscribe rate.

## 3.6 New External Dependencies

| Purpose | Service | Notes |
|---|---|---|
| Email transport | **Resend** (recommended) | React-email templates; pay per sent email. |
| Web search (Discovery) | **Brave Search API** or **SerpAPI** | Brave is cheaper; SerpAPI is more flexible. |
| Billing | **Stripe** | Checkout + Customer Portal + webhooks. |
| Optional: better classification | **OpenAI / Anthropic API** | For Discovery's higher-stakes per-site analysis where llama3.2 is too weak. Keep Ollama for inline scraping. |
| Optional: full-text search at scale | **PostgreSQL pg_trgm** (built-in) → eventually **Meilisearch** | pg_trgm is fine to start. |

## 3.7 Migration Sequencing (Suggested Order)

The build can ship incrementally so customers start getting value before everything is done.

1. **Schema migration** (one PR): `WatchKeyword`, `KeywordHit`, `Notification`, `EmailLog`, plus `Website.targetPagePatterns`, `Result.fullText`, `User.notification*`. Generate Prisma migration; run on dev/prod.
2. **Scraper update**: honor `targetPagePatterns`; persist `Result.fullText` for every fetched page.
3. **`keyword-scanner` worker** + `/api/keywords` CRUD + Keywords page rebuild. **At this point, hits are recorded but no notifications are sent.**
4. **`/api/hits` + Hits page** so users can see hits accumulating.
5. **In-app notifications**: `Notification` table + bell icon + SSE delivery + `/api/notifications/*`.
6. **Email**: `email.service` (Resend), instant alerts, then digest scheduler + frequency preferences.
7. **Stripe billing**: Subscription/Invoice tables, checkout, portal, webhooks, `requirePlan` middleware, plan-limit enforcement.
8. **AI Business Discovery (Premium)**: web-search integration, `discovery.ts` worker, `BusinessDiscovery` schema, `/api/discovery/*`, `/app/discovery` wizard.
9. **Polish**: admin billing/discovery dashboards, deliverability monitoring, alert digests.

## 3.8 Things to Decide Before Building

These are open questions the migration plan deliberately doesn't pin down:

- **Search API**: Brave vs. SerpAPI vs. Bing — picks decide cost-per-discovery.
- **Email provider**: Resend vs. SendGrid vs. AWS SES — Resend strongly recommended for DX.
- **Discovery LLM**: keep llama3.2 (cheap, slow, less accurate) or use Claude Haiku / GPT-4o-mini for the classification passes (better accuracy, monetary cost).
- **Keyword matching**: is regex exposed to all users, or only admin/Enterprise? (Regex has DoS risk if not bounded.)
- **Free-tier abuse**: how do we prevent creating throwaway free accounts to harvest discoveries? (Email verification + maybe phone or LinkedIn at signup.)
- **Geo-licensing**: Stripe tax handling — ship US-only first, or international from day one?
- **GDPR**: notification opt-in defaults — opt-in or opt-out? Affects EU launch.

---

# Part 4 — Reference

## 4.1 Setup and Running (current code)

Prerequisites: Node 20+, PostgreSQL 16, Redis 7, Ollama, Git.

One-time:
```bash
npm install
psql -U postgres -c 'CREATE DATABASE "ITAD_scrapper";'
psql -U postgres -d ITAD_scrapper -f database/001_initial_schema.sql
psql -U postgres -d ITAD_scrapper -f database/002_seed.sql
ollama pull llama3.2
# Create backend/.env and workers/.env (adapted from root .env.example)
# Generate two JWT secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Daily run (three terminals):
```bash
npm run dev:backend   # :3001
npm run dev:workers
npm run dev:frontend  # :5173
```

Required env (`backend/.env`):
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/ITAD_scrapper"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="<48-byte hex>"
JWT_REFRESH_SECRET="<different 48-byte hex>"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

Vision-stage env additions: `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BRAVE_SEARCH_API_KEY` (or `SERPAPI_KEY`), `OPENAI_API_KEY` (optional, for premium classification).

## 4.2 Glossary

- **ITAD** — IT Asset Disposition. Recovering and reselling end-of-life IT equipment.
- **Bidding opportunity** — a procurement notice (RFP, tender, surplus auction) the customer can bid into.
- **Selling opportunity** — a counterparty (refurbisher, broker) listing equipment the customer can buy.
- **Yield rate** — share of crawled pages classified `bidding` or `selling` (today's metric); will be augmented by *hit rate* (% pages with watched-keyword matches) post-migration.
- **Crawl budget** — max pages a single crawl is allowed to fetch from one website.
- **DLQ** — Dead Letter Queue. Two-stage: Redis Stream (transport) → Postgres `DlqEvent` (persistent).
- **Tier 1/2/3 proxy** — residential / datacenter / rotating. Tier 1 cleanest, Tier 3 cheapest and most blocked.
- **Quarantined proxy** — success rate <50%, taken out of rotation for 10-min cooldown.
- **TargetPattern (today)** — global keyword corpus that influences link prioritization.
- **WatchKeyword (vision)** — per-user, per-website keyword that triggers notifications.
- **KeywordHit (vision)** — a recorded match between a `WatchKeyword` and a scraped page.
- **Target page pattern (vision)** — URL-path substring (e.g. `/procurement`) the user supplies to scope the crawler.
- **Notification (vision)** — in-app inbox entry; may also fan out to email per user prefs.
- **Digest** — bundled email summary of recent hits sent hourly or daily.
- **Discovery run (Premium)** — one execution of AI Business Discovery: input business name → output proposed websites + keywords.
- **Compute budget** — per-user concurrent agent cap. Enforcement is currently advisory only.
- **Shadow / Advisory / Autonomous** — three deployment modes for the AI classifier (admin-controlled).
- **SSE** — Server-Sent Events. One-way HTTP stream from server to browser. Used for live monitor + (vision) real-time notifications.
- **MRR / ARR** — Monthly / Annual Recurring Revenue. Tracked in admin billing dashboard (vision).

## 4.3 FAQ

**Q: What's the single most important user flow?**
A: User adds a website + keywords → scraper monitors specific procurement-style pages on that site → on keyword match, user is notified in-app and by email with the website, page URL, keyword, and context snippet.

**Q: Is data sent to OpenAI/Anthropic?**
A: Today, no — classification runs locally via Ollama. Vision: yes, optionally, but only inside the AI Business Discovery feature on Premium and above. The inline scraper classifier stays local.

**Q: Who is the target customer?**
A: ITAD vendors and resellers — companies that buy/sell used IT equipment to or from K-12 school districts, universities, governments, hospitals, and large enterprises. Primary vertical is K-12 school-district procurement.

**Q: What is "AI Business Discovery"?**
A: A premium paid feature where the user enters their business name + description, and our AI auto-builds them a starter watchlist (proposed institutional websites + relevant keywords). Saves analyst-days of research. Premium = 1 run/month included; extra runs $99 each on Pro; unlimited on Enterprise.

**Q: How does pricing work?**
A: Four plans — Starter (free), Pro ($49/mo), Premium ($149/mo includes AI Discovery), Enterprise ($499/mo unlimited). Stripe-billed (vision — not yet integrated).

**Q: How does keyword matching work?**
A: Vision: four modes — `contains` (substring), `exact` (word-boundary), `regex` (advanced), `fuzzy` (Postgres trigram similarity). Plain users default to `contains`; Enterprise can use regex.

**Q: Will users be spammed with emails?**
A: User picks a frequency: instant (per-hit), hourly digest, or daily digest. We dedupe identical hits within a 5-minute window. Every email has an unsubscribe link tied to `User.unsubscribeToken`.

**Q: What if Ollama is down?**
A: The classifier degrades gracefully — every page is labeled `informational` with confidence 0. The keyword-scanner is independent of Ollama and continues to fire hits.

**Q: What if a job fails?**
A: 3 retries with descending proxy tiers and 2–10s jitter. After 3 failures, it goes to the Redis DLQ stream → persisted in Postgres `DlqEvent` → triage worker auto-retries transient failures (5min/30min/2hr). Users see their failures in `/app/dlq`.

**Q: How do new keywords get discovered automatically?**
A: Today: the pattern-learner worker mines URL n-grams from confirmed `bidding`/`selling` results into the global `TargetPattern` corpus (every 6h). Vision: same mechanism still feeds link prioritization, *plus* AI Business Discovery proposes user-specific keywords on demand.

**Q: Is the "Compute Budget" enforced?**
A: Not today — it's advisory. Vision: hard-enforced by `enforcePlanLimits()` middleware on website/keyword create and a scheduler-side concurrent-agent cap.

**Q: What does the existing app need to change?**
A: See Part 3. Briefly: new tables (WatchKeyword, KeywordHit, Notification, EmailLog, BusinessDiscovery, Subscription, Invoice); new fields on Website (`targetPagePatterns`) and User (notification prefs); new workers (keyword-scanner, notifier, digest-scheduler, discovery); new pages (Hits, Notifications, Discovery, Billing); rebuild the Keywords page from global-corpus view to per-user watchlist.

---

End of source.
