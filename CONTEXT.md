# Session Handoff Context

This file lets a future Claude session (or you) pick up exactly where we left off without re-doing discovery. Read this top to bottom before resuming.

---

## Where we are in the build plan

The active plan is [BUILDINGPLAN.md](BUILDINGPLAN.md) — 12 sequential, deployable steps.

| Step | Status | Notes |
|---|---|---|
| 0 — Pre-flight | ⏭ Skipped | User chose to skip the ceremonial prep (tests scaffolding, CI, staging). Redis was installed mid-Step-2 instead. |
| 1 — Schema migration for keyword watchlist | ✅ Done & verified | Commit `6c444be` |
| 2 — Scraper persists fullText + honors targetPagePatterns | ✅ Done & verified end-to-end | Commit `6daecec` |
| **3 — Keyword Scanner Worker** | 🟡 **Next up** | New BullMQ worker that scans `Result.fullText` against active `WatchKeyword`s and writes `KeywordHit` rows. Estimate ~1.5 days. |
| 4 — Keywords Management API + UI rebuild | ⏳ | |
| 5 — Hits API + Hits page | ⏳ | |
| 6 — In-app Notifications (bell + SSE) | ⏳ | |
| 7 — Email Notifications (instant via Resend) | ⏳ | |
| 8 — Email Digests (hourly/daily) | ⏳ | |
| 9 — Stripe billing + plan enforcement | ⏳ | |
| 10 — AI Business Discovery (Premium) | ⏳ | |
| 11 — Admin & polish | ⏳ | |

---

## Repository state

**Repo path:** `/Users/aqib/ITAD Scrapper/ITAD_scrapper`

**Remote:** Updated to user's fork on first push — see `git remote -v` for current state.

**Branch:** `main` (no other branches in use).

**Last 3 commits** (all from this session):
1. `e1557d3` — docs: NOTEBOOKLM.md + BUILDINGPLAN.md
2. `6c444be` — feat(step 1): schema migration for keyword watchlist + notifications
3. `6daecec` — feat(step 2): scraper persists fullText + honors targetPagePatterns

**Working tree:** clean as of handoff (other than this CONTEXT.md if it's untracked at the moment of reading).

**Git identity in use:** `Anees Khan <aneeskhan16202@gmail.com>` (matches the initial commit's identity per user request).

---

## Local services

### Running on this machine

| Service | Port | Started by | Stop with |
|---|---|---|---|
| **PostgreSQL 18** (Postgres.app) | 5432 | Postgres.app GUI on login | Postgres.app menu bar |
| **Redis 8.6.2** (built from source) | 6379 | `redis-server --daemonize yes …` | `~/.local/bin/redis-cli shutdown` |
| **Ollama (llama3.2)** | 11434 | manual `ollama serve` | `kill $(pgrep -f "ollama serve")` |
| **Backend API** | 3001 | `npm run dev:backend` | kill the tsx watcher |
| **Workers** (scraper + DLQ + proxy + learner) | – | `npm run dev:workers` | kill the concurrently process |
| **Frontend (Vite)** | 5173 | `npm run dev:frontend` | kill the vite process |

### Cold-start sequence

If everything is stopped (e.g. after reboot), bring it all back up:

```bash
# 1. Postgres — Postgres.app autostarts on login. Otherwise launch it manually.

# 2. Redis (built from source, no brew)
~/.local/bin/redis-server --daemonize yes \
  --dir ~/.local/redis-data \
  --logfile ~/.local/redis-data/redis.log \
  --pidfile ~/.local/redis-data/redis.pid
~/.local/bin/redis-cli ping   # → PONG

# 3. Ollama (server runs in background)
/Applications/Ollama.app/Contents/Resources/ollama serve &
# Verify: curl -s http://localhost:11434/api/tags

# 4. App processes (3 terminals)
cd "/Users/aqib/ITAD Scrapper/ITAD_scrapper"
npm run dev:backend    # terminal 1
npm run dev:workers    # terminal 2
npm run dev:frontend   # terminal 3
```

**PATH note:** `~/.zshrc` was appended with `~/.local/bin` and `/Applications/Postgres.app/Contents/Versions/latest/bin`. New shells get `redis-cli`, `redis-server`, `ollama` (symlink), and `psql` automatically. Ollama itself is at `/Applications/Ollama.app/Contents/Resources/ollama`.

---

## Database state

**DB name:** `ITAD_scrapper` (case-sensitive, capital I-T-A-D).

**Connection:** `postgresql://aqib@localhost:5432/ITAD_scrapper` (trust auth, no password — Postgres.app default).

**Migrations applied** (per `_prisma_migrations`):
1. `20260429201204_init` — registered as applied via `prisma migrate resolve --applied` (the DB had been set up via raw SQL before Prisma was wired)
2. `20260501113503_add_keyword_watchlist` — Step 1's migration

**Tables (13):**
`User`, `Project`, `Website`, `Job`, `Result`, `DlqEvent`, `ProxyHealth`, `TargetPattern`, `AgentRegistry`, `RefreshToken`, **`WatchKeyword`** (new), **`KeywordHit`** (new), **`Notification`** (new), `_prisma_migrations`.

**Seeded data after `npx tsx src/seed.ts`:**
- 2 Users — admin + demo (passwords reset on every seed run)
- 1 Project — "K-12 Procurement Watch" (demo user)
- 1 Website — `https://www.austinisd.org` with `targetPagePatterns: ['/procurement','/purchasing','/bids','/rfp']`
- 4 WatchKeywords — `Chromebook`, `computer surplus`, `technology refresh`, `IT equipment disposition`
- 10 TargetPatterns (global keyword corpus, used by the link-prioritization scorer — separate from WatchKeyword)
- 8 ProxyHealth rows (placeholder data, not real working proxies)
- 8 AgentRegistry rows

**User-added test data not in seed:**
- `https://www.springlake-earth.org/` website with custom patterns — added by the user during Step 2 manual testing. Don't touch.

**Login credentials:**
- Admin → `scrapperadmin@gmail.com` / `admin123` → `/admin`
- Demo → `john@itadintel.io` / `Demo@123456` → `/app`

---

## Environment variables

Both `backend/.env` and `workers/.env` are present and gitignored. JWT secrets were generated freshly via `crypto.randomBytes(48)`. Key values:

```env
DATABASE_URL="postgresql://aqib@localhost:5432/ITAD_scrapper"
REDIS_URL="redis://localhost:6379"
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

For Step 7 (email) you'll later need: `RESEND_API_KEY`.
For Step 9 (billing): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
For Step 10 (Discovery): `BRAVE_SEARCH_API_KEY`, `ANTHROPIC_API_KEY`.

---

## What Step 1 added (just summarising the merged commit)

**New tables in [backend/prisma/schema.prisma](backend/prisma/schema.prisma):**
- `WatchKeyword` — per-user watchlist (userId, projectId, websiteId?, keyword, matchMode, caseSensitive, status, hitCount, lastHitAt)
- `KeywordHit` — match record (watchKeywordId, userId, websiteId, projectId, resultId?, pageUrl, pageTitle, matchedText, context, position, status, notifiedInApp, notifiedEmail) with unique `(watchKeywordId, resultId, position)`
- `Notification` — in-app inbox (type, title, body, link, payload, readAt)

**New fields:**
- `User.emailNotifications`, `emailDigestFrequency` (instant|hourly|daily), `inAppNotifications`, `unsubscribeToken` (existing rows backfilled with random hex)
- `Website.targetPagePatterns: String[]` default `[]`
- `Result.fullText: Text?`, `textHash: String?` (indexed)

**Files:**
- Migration: [backend/prisma/migrations/20260501113503_add_keyword_watchlist/migration.sql](backend/prisma/migrations/20260501113503_add_keyword_watchlist/migration.sql)
- Raw-SQL parity: [database/003_add_keyword_watchlist.sql](database/003_add_keyword_watchlist.sql)
- Seed extended: [backend/src/seed.ts](backend/src/seed.ts) — now also resets passwordHash on every run (fixes pre-existing demo-user hash mismatch) and creates the demo project + website + keywords idempotently.

---

## What Step 2 added

**Scraper changes in [workers/src/scraper.ts](workers/src/scraper.ts):**
- Three new exported helpers (will be reused by Step 3's keyword scanner):
  - `matchesTargetPattern(url, patterns): boolean` — empty patterns = no filter; otherwise case-insensitive substring match on URL pathname
  - `capUtf8(s, maxBytes): string` — UTF-8-safe byte cap
  - `sha256Hex(s): string`
- Job payload now includes `targetPagePatterns`
- Discovered children filtered by `matchesTargetPattern` before scoring/queuing. **The seed URL is always crawled regardless of patterns** — needed because procurement pages are usually behind navigation pages
- Every successfully fetched page → `Result` row with `fullText` (≤100 KB) + `textHash`
- Dedupe: `findFirst({ websiteId, url, textHash, foundAt: { gte: 7daysAgo } })` — skip insert on hit
- Success log prints `(N pages, X new, Y dedup), Z bidding/selling`

**Backend ([backend/src/routes/websites.ts](backend/src/routes/websites.ts)):**
- POST/PATCH accept `targetPagePatterns: string[]` (max 50, items 1–120 chars)
- Server-side normalisation: lowercase, leading slash, dedupe via `normalisePatterns()`
- Crawl payload includes the array

**Frontend:**
- New shared component: [frontend/src/components/shared/ChipInput.tsx](frontend/src/components/shared/ChipInput.tsx)
- [ProjectDetailPage.tsx](frontend/src/pages/user/ProjectDetailPage.tsx): inline Add Website form has a chip input for target paths
- [WebsiteDetailPage.tsx](frontend/src/pages/user/WebsiteDetailPage.tsx): top of page shows configured patterns as chips with inline Edit/Save/Cancel
- [types/index.ts](frontend/src/types/index.ts): `Website.targetPagePatterns: string[]`

**Verified end-to-end:**
- Crawled `austinisd.org` → 1 Result row with 5429 chars `fullText` + textHash
- Crawled `springlake-earth.org` → 1 Result row with 81 chars + textHash
- Re-crawled austinisd → `0 new, 1 dedup` (dedupe via 7-day textHash window confirmed)
- 14/14 unit tests pass on the helpers

---

## Step 3 — what to build next

**Goal:** A new BullMQ worker that consumes a new `keyword-scan-queue`. The scraper already enqueues into this queue at the end of each Result persist (well — *will* enqueue, that wiring is part of Step 3). The scanner loads active `WatchKeyword`s scoped to the result's user + project (and optionally website), runs the configured `matchMode` against `Result.fullText`, and writes `KeywordHit` rows. **No notifications fired yet** — that's Step 6.

See **§3.1–3.5 of [BUILDINGPLAN.md](BUILDINGPLAN.md)** for the full spec. Key points:

1. **New BullMQ queue** `keyword-scan-queue` registered in `backend/src/lib/bullmq.ts`.
2. **Hook into scraper** — at end of `processJob` after Result persist, fire-and-forget enqueue `{ resultId }` to the new queue.
3. **New worker** `workers/src/keyword-scanner.ts`:
   - Job payload: `{ resultId }`. Load Result + matching active WatchKeywords.
   - Scope match: `userId == result.userId AND ((websiteId IS NULL AND projectId == result.projectId) OR websiteId == result.websiteId) AND status='active'`
   - Per matchMode:
     - `contains` — `String.indexOf` with caseSensitive flag
     - `exact` — `\b<escapedKeyword>\b` regex
     - `regex` — user-supplied (length cap 200, validated with `safe-regex`, 50ms timeout per attempt)
     - `fuzzy` — Postgres `pg_trgm` similarity ≥ 0.7 (defer to SQL)
   - Find ALL match offsets up to 20/keyword/page. 200-char context snippet around each.
   - Insert `KeywordHit` rows in a transaction. Idempotency via the existing `(watchKeywordId, resultId, position)` unique constraint.
   - Update `WatchKeyword.hitCount` and `lastHitAt`.
   - **Do NOT enqueue notifications** — Step 6's `notifier` worker handles that.
4. **Worker registration**: add to `workers/src/index.ts` (or whatever entry point exists — current setup uses `concurrently` to run scraper + dlq-triage + proxy-health + pattern-learner directly). Concurrency 5.
5. **Optional backfill script** at `workers/src/scripts/backfill-scans.ts` for one-shot enqueue of recent Results. Useful for testing without re-crawling.

**Suggested testing approach** (since no UI exists yet for adding keywords — that's Step 4):
- Use the seeded demo WatchKeywords (Chromebook etc.).
- Trigger a crawl; check `KeywordHit` table directly via SQL.

**Watch out for:**
- The 4 demo keywords (`Chromebook`, `computer surplus`, `technology refresh`, `IT equipment disposition`) are unlikely to actually match the homepage of `austinisd.org` we already crawled (the body text is mostly navigation). To prove the scanner works, you may want to manually insert a Result with `fullText` containing one of those words, or seed a website that has matching content.
- Don't import scraper.ts directly into the new worker — top-level Redis/Browser/Worker side effects in scraper.ts will fire. Instead, copy or extract the helpers (matchesTargetPattern, capUtf8 etc. are already exported and safe to import).

---

## Open decisions (still TBD)

These were flagged in NOTEBOOKLM §3.8 but don't block Step 3:

- Email provider — locked in: **Resend** (need account + API key for Step 7).
- Web search API for Discovery — locked in: **Brave Search API** (need account for Step 10).
- Billing — locked in: **Stripe** (need account for Step 9).
- Premium-tier LLM — locked in: **Claude Haiku** (need ANTHROPIC_API_KEY for Step 10).
- **Free-tier abuse prevention** — undecided.
- **GDPR opt-in defaults** — undecided.

---

## Quirks and gotchas

- **Backend without Redis prints `ECONNREFUSED` spam continuously** but the HTTP server keeps serving. If you stop Redis, expect the noise — it's not a crash.
- **The classifier returns `informational` with confidence 0** if Ollama is unreachable. Doesn't crash the scraper.
- **`tsx watch` doesn't watch `node_modules`** — after `prisma generate`, restart the backend manually to pick up the new client.
- **Demo user `john@itadintel.io` password reset on every seed run.** If you change it via UI then re-seed, the change is wiped. (Admin's password is also reset.) Intentional — keeps documented credentials working.
- **TypeScript errors exist in pre-existing files** (`backend/src/routes/admin.ts:207` — User has no direct `jobs` relation; some unused vars in admin/landing pages; cross-workspace import in `workers/src/pattern-learner.ts`). None caused by Steps 1 or 2. Touch only if you have to.
- **The pattern filter is restrictive in practice.** `austinisd.org` and `springlake-earth.org` both produced exactly 1 page on crawl because no homepage links matched the configured patterns. Procurement pages are typically two clicks deep (homepage → departments → procurement). If this becomes a usability problem, BUILDINGPLAN's "Step 2.5" enhancement options are: (a) increase depth, (b) add an always-allowed-passthrough list, or (c) add deeper seed URLs directly.
- **Pre-existing `springlake-earth.org` website in DB** was added by the user during Step 2 manual testing. Don't delete it.

---

## How to use this file in a new session

Paste the path or contents into a fresh Claude/NotebookLM session along with [BUILDINGPLAN.md](BUILDINGPLAN.md) and [NOTEBOOKLM.md](NOTEBOOKLM.md). The new session will have:
- Product vision (NOTEBOOKLM)
- Build plan (BUILDINGPLAN)
- Current execution state (this file)

Then say "start Step 3" and the new session can pick up cleanly.
