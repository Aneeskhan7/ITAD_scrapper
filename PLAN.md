# ITAD Intelligence — Enterprise Build Plan
**Version:** 1.0 | **Date:** April 29, 2026 | **Status:** Ready to Build

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Design System](#design-system)
4. [Database Schema (Prisma)](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Pages & Components](#pages--components)
7. [Worker Architecture](#worker-architecture)
8. [Build Order](#build-order)
9. [Feature Checklist](#feature-checklist)
10. [Docker & Dev Setup](#docker--dev-setup)
11. [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite | Fast HMR, modern bundler |
| Styling | Tailwind CSS v3 + CSS variables | Match exact design tokens |
| UI Components | shadcn/ui | Headless, customizable |
| Icons | Lucide React | Consistent icon set |
| Fonts | Space Grotesk + DM Sans + DM Mono | Match design exactly (Google Fonts) |
| Data Fetching | TanStack Query v5 | Server state, caching, invalidation |
| Client State | Zustand | Auth store, UI state |
| Routing | React Router v6 | SPA routing |
| Charts | Recharts | Queue depth, accuracy trends |
| Real-time | SSE (EventSource) | Live queue monitor, agent status |
| Backend | Node.js 20 + Express 5 | REST API |
| Auth | JWT (access 15min + refresh 7d) | httpOnly cookie for refresh |
| ORM | Prisma v5 | Type-safe, auto migrations |
| Database | PostgreSQL 16 | Single DB, JSONB for flexible fields |
| Job Queue | BullMQ v5 + Redis 7 | Priority queues, DLQ stream |
| Scraper | Playwright + Cheerio | Playwright for JS sites, Cheerio static |
| AI Classifier | Ollama REST (llama3.2) | Local inference, <200ms target |
| Validation | Zod | Frontend + backend schema validation |
| Dev Tools | Docker Compose | Redis + PostgreSQL local |

---

## Project Structure

```
itad-scraper/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   ├── user/
│   │   │   │   ├── OverviewPage.tsx
│   │   │   │   ├── ProjectsPage.tsx
│   │   │   │   ├── ProjectDetailPage.tsx
│   │   │   │   ├── WebsiteDetailPage.tsx
│   │   │   │   ├── DiscoveriesPage.tsx
│   │   │   │   ├── DLQPage.tsx
│   │   │   │   ├── KeywordsPage.tsx
│   │   │   │   └── SettingsPage.tsx
│   │   │   ├── admin/
│   │   │   │   ├── SystemOverviewPage.tsx
│   │   │   │   ├── AgentPoolPage.tsx
│   │   │   │   ├── JobQueuePage.tsx
│   │   │   │   ├── AdminDLQPage.tsx
│   │   │   │   ├── ProxyPoolPage.tsx
│   │   │   │   ├── AIClassifierPage.tsx
│   │   │   │   ├── UsersPage.tsx
│   │   │   │   └── PatternsPage.tsx
│   │   │   └── LandingPage.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── UserSidebar.tsx
│   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── AppShell.tsx
│   │   │   ├── ui/                     ← shadcn generated components
│   │   │   ├── shared/
│   │   │   │   ├── StatusPill.tsx
│   │   │   │   ├── MiniBar.tsx
│   │   │   │   ├── StatCard.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   └── LiveDot.tsx
│   │   │   └── modals/
│   │   │       ├── NewProjectModal.tsx
│   │   │       ├── AddWebsiteModal.tsx
│   │   │       └── ConfirmModal.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useProjects.ts
│   │   │   ├── useWebsites.ts
│   │   │   ├── useJobs.ts
│   │   │   ├── useDLQ.ts
│   │   │   ├── useAgents.ts
│   │   │   ├── useProxies.ts
│   │   │   └── useQueueStream.ts       ← SSE hook
│   │   ├── lib/
│   │   │   ├── api.ts                  ← Axios instance + JWT interceptor
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── store/
│   │   │   └── authStore.ts            ← Zustand: user, token, role
│   │   ├── types/
│   │   │   └── index.ts                ← Shared TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                   ← Tailwind + CSS variables
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts                 ← /api/auth/*
│   │   │   ├── projects.ts             ← /api/projects/*
│   │   │   ├── websites.ts             ← /api/websites/*
│   │   │   ├── jobs.ts                 ← /api/jobs/*
│   │   │   ├── dlq.ts                  ← /api/dlq/*
│   │   │   ├── results.ts              ← /api/results/*
│   │   │   ├── patterns.ts             ← /api/patterns/*
│   │   │   ├── proxies.ts              ← /api/proxies/*  [admin]
│   │   │   ├── agents.ts               ← /api/agents/*  [admin]
│   │   │   ├── users.ts                ← /api/users/*   [admin]
│   │   │   └── monitor.ts              ← /api/monitor/stream [SSE]
│   │   ├── middleware/
│   │   │   ├── auth.ts                 ← verifyJWT, requireAdmin
│   │   │   ├── validate.ts             ← Zod request validation
│   │   │   └── errorHandler.ts
│   │   ├── services/
│   │   │   ├── queue.service.ts        ← BullMQ: enqueue, stats
│   │   │   ├── ollama.service.ts       ← Ollama API calls
│   │   │   ├── proxy.service.ts        ← Proxy selection algorithm
│   │   │   └── pattern.service.ts      ← Keyword scoring
│   │   ├── lib/
│   │   │   ├── prisma.ts               ← PrismaClient singleton
│   │   │   ├── redis.ts                ← Redis connection
│   │   │   └── bullmq.ts               ← Queue definitions
│   │   └── index.ts                    ← Express app entry
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
│
├── workers/
│   ├── scraper.ts                      ← BullMQ scrape worker
│   ├── classifier.ts                   ← Ollama classification
│   ├── dlq-triage.ts                   ← DLQ auto-triage
│   ├── proxy-health.ts                 ← 5-min proxy health check
│   ├── pattern-learner.ts              ← N-gram keyword discovery
│   └── package.json
│
├── shared/
│   └── types.ts                        ← Types shared between backend/workers
│
├── design/                             ← Original HTML mockups (reference only)
│   ├── ITAD Admin Dashboard.html
│   ├── ITAD User Dashboard.html
│   └── ITAD Landing.html
│
├── docker-compose.yml
├── .env.example
└── package.json                        ← Root: workspace scripts
```

---

## Design System

Extract these tokens into `frontend/src/index.css` and `tailwind.config.ts`.

### Color Tokens
```css
:root {
  --bg:         #f7f8f5;   /* page background */
  --bg2:        #ffffff;   /* card/panel background */
  --bg3:        #f0f1ee;   /* table header, secondary surface */
  --border:     #e8e9ec;   /* default border */
  --border2:    #d1d5db;   /* stronger border */
  --text:       #111118;   /* primary text */
  --muted:      #6b7180;   /* secondary text, labels */
  --green:      #1a9e57;   /* brand primary, CTA */
  --green-bg:   #e6f7ee;   /* green tint surfaces */
  --amber:      #d97706;   /* warning */
  --amber-bg:   #fef9c3;   /* warning tint */
  --red:        #dc2626;   /* error, danger */
  --red-bg:     #fee2e2;   /* error tint */
  --blue:       #2563eb;   /* info, queue metrics */
  --blue-bg:    #eff6ff;   /* blue tint */

  /* Pastel accent surfaces */
  --mint:       #e4f5ed;   /* green-tinted surface */
  --lavender:   #ede8ff;   /* purple-tinted surface */
  --peach:      #fff0e6;   /* orange-tinted surface */
  --yellow:     #fffbe5;   /* yellow-tinted surface */
  --sky:        #e4f0fc;   /* blue-tinted surface */
}
```

### Typography
```css
/* Headings, numbers, brand, stat values */
font-family: 'Space Grotesk', sans-serif;
letter-spacing: -0.04em;  /* for large numbers */

/* Body, labels, buttons */
font-family: 'DM Sans', sans-serif;

/* IDs, URLs, code, metrics */
font-family: 'DM Mono', monospace;
```

### Component Patterns

**StatCard** — used on every page header
```
White bg · 1.5px border · 14px border-radius · 18/20px padding
Label: 0.7rem · uppercase · 0.08em tracking · --muted
Value: Space Grotesk · 1.75rem · weight 700 · -0.04em tracking
Subtext: 0.73rem · --muted
Optional mini progress bar (4px height)
```

**StatusPill** — inline badge with dot indicator
```
Colors by status:
  active    → bg #dcfce7 · text #16a34a
  queued    → bg #fef9c3 · text #a16207
  failed    → bg #fee2e2 · text #dc2626
  idle      → bg #f3f4f6 · text #6b7280
  paused    → bg #f3f4f6 · text #6b7280
  pending   → bg #fef9c3 · text #a16207
  resolved  → bg #dcfce7 · text #16a34a
  archived  → bg #f3f4f6 · text #6b7280
  suspended → bg #fee2e2 · text #dc2626
  quarantined → bg #fee2e2 · text #dc2626
```

**DataTable** — used in every list view
```
Header: bg var(--bg) · 0.72rem · --muted · weight 500
         border-bottom 1.5px var(--border)
Row hover: background var(--bg) transition
Row border-bottom: 1px var(--border)
Cell padding: 9px 14px
```

**Sidebar**
```
Width: 220px expanded · 58px collapsed
Transition: width 0.25s
Active nav item: bg var(--mint) · color var(--green)
Inactive: transparent bg · color var(--muted)
Nav item border-radius: 7-8px
```

---

## Database Schema

File: `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          String    @default("user")      // user | admin
  plan          String    @default("starter")   // starter | pro | enterprise
  computeBudget Int       @default(5)            // max agents
  projects      Project[]
  dlqEvents     DlqEvent[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Project {
  id          String    @id @default(cuid())
  userId      String
  name        String
  description String?
  status      String    @default("active")      // active | paused | archived
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  websites    Website[]
  dlqEvents   DlqEvent[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId])
}

model Website {
  id           String    @id @default(cuid())
  projectId    String
  userId       String
  url          String
  depth        Int       @default(2)
  crawlBudget  Int       @default(200)           // max pages per crawl
  schedule     String?                           // cron expression
  status       String    @default("idle")        // idle | crawling | queued | failed | paused
  priority     String    @default("medium")      // high | medium | low
  lastCrawled  DateTime?
  totalPages   Int       @default(0)
  yieldRate    Float     @default(0)             // % pages with useful data
  project      Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  jobs         Job[]
  results      Result[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([projectId])
  @@index([userId])
}

model Job {
  id           String    @id @default(cuid())
  websiteId    String
  projectId    String
  userId       String
  url          String
  status       String    @default("pending")     // pending | active | completed | failed
  retries      Int       @default(0)
  proxyTier    Int?                              // 1 | 2 | 3
  proxyId      String?
  errorType    String?                           // timeout | 403_blocked | proxy_exhaustion | parse_failure | domain_expired
  errorDetail  String?
  pagesScraped Int       @default(0)
  duration     Int?                              // ms
  startedAt    DateTime?
  completedAt  DateTime?
  website      Website   @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  createdAt    DateTime  @default(now())

  @@index([websiteId])
  @@index([projectId])
  @@index([status])
}

model Result {
  id             String   @id @default(cuid())
  websiteId      String
  projectId      String
  userId         String
  url            String
  title          String?
  bodySnippet    String?
  classification String   // bidding | selling | informational | irrelevant
  confidence     Float
  reason         String?
  rawContent     Json?    // JSONB: full scraped data
  website        Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  foundAt        DateTime @default(now())

  @@index([websiteId])
  @@index([projectId])
  @@index([classification])
}

model DlqEvent {
  id          String   @id @default(cuid())
  projectId   String
  websiteId   String
  userId      String
  url         String
  errorType   String
  payload     Json     // full job payload preserved
  status      String   @default("pending")       // pending | retried | archived
  retry1At    DateTime?
  retry2At    DateTime?
  retry3At    DateTime?
  resolvedAt  DateTime?
  project     Project  @relation(fields: [projectId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())

  @@index([projectId])
  @@index([errorType])
  @@index([status])
}

model ProxyHealth {
  id             String    @id @default(cuid())
  proxyUrl       String    @unique
  tier           Int                             // 1 | 2 | 3
  proxyType      String                          // residential | datacenter | rotating
  ipDisplay      String                          // masked IP for display
  successRate    Float     @default(1.0)
  totalRequests  Int       @default(0)
  cooldownUntil  DateTime?
  blockedDomains String[]  @default([])
  lastUsed       DateTime?
  status         String    @default("active")    // active | idle | quarantined
  updatedAt      DateTime  @updatedAt
  createdAt      DateTime  @default(now())
}

model TargetPattern {
  id              String   @id @default(cuid())
  keyword         String   @unique
  source          String   @default("seed")      // seed | learned
  confidenceScore Float    @default(0.5)
  matchCount      Int      @default(0)
  firstSeen       DateTime @default(now())
  lastMatched     DateTime?
  status          String   @default("active")    // active | archived | pinned | blocked
  updatedAt       DateTime @updatedAt
}

model AgentRegistry {
  id          String    @id @default(cuid())
  agentId     String    @unique                  // e.g. agt-001
  userId      String?
  projectId   String?
  status      String    @default("idle")         // idle | active | draining | terminated
  currentJob  String?                            // job ID
  currentUrl  String?
  pagesScraped Int      @default(0)
  cpuPercent  Float     @default(0)
  startedAt   DateTime?
  heartbeat   DateTime  @default(now())
  createdAt   DateTime  @default(now())
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}
```

---

## API Endpoints

### Auth — `/api/auth`
```
POST   /register          { name, email, password } → { user, accessToken }
POST   /login             { email, password } → { user, accessToken }
POST   /refresh           cookie:refreshToken → { accessToken }
POST   /logout            clears refresh cookie
GET    /me                → { user }
```

### Projects — `/api/projects`  [user]
```
GET    /                  → Project[]
POST   /                  { name, description } → Project
GET    /:id               → Project + stats
PATCH  /:id               { name, description, status } → Project
DELETE /:id               → 204
GET    /:id/stats         → { totalJobs, activeAgents, dlqCount, avgYield }
```

### Websites — `/api/websites`  [user]
```
GET    /project/:projectId      → Website[]
POST   /project/:projectId      { url, depth, crawlBudget, schedule, priority } → Website
GET    /:id                     → Website + recent jobs
PATCH  /:id                     { depth, crawlBudget, schedule, priority, status } → Website
DELETE /:id                     → 204
POST   /:id/crawl               → enqueues job, returns { jobId }
GET    /:id/jobs                → Job[] (last 50)
GET    /:id/results             → Result[] (paginated)
```

### Jobs — `/api/jobs`  [user]
```
GET    /                  ?status=active&limit=20 → Job[]
GET    /:id               → Job
GET    /stats             → { pending, active, completed24h, failed24h, avgDuration }
```

### Results — `/api/results`  [user]
```
GET    /                  ?type=bidding&projectId=&limit=20&page=1 → Result[] + pagination
GET    /:id               → Result
```

### DLQ — `/api/dlq`  [user]
```
GET    /                  → DlqEvent[] for current user
POST   /:id/retry         → re-enqueues job → 200
POST   /:id/archive       → status=archived → 200
POST   /retry-all         → retries all pending → { count }
GET    /stats             → { pending, resolved, archived, failureRate }
```

### Keywords — `/api/patterns`  [user]
```
GET    /                  → TargetPattern[]
```

### Monitor — `/api/monitor`  [user + admin]
```
GET    /stream            SSE: { queueDepth, activeAgents, dlqInflow, events[] }
```

---
### Admin Routes — `/api/admin`  [admin role only]

### Admin — Agents
```
GET    /agents            → AgentRegistry[]
POST   /agents/:id/drain  → status=draining
POST   /agents/:id/terminate → status=terminated
POST   /agents/provision  { count } → provisions N new agents
```

### Admin — Queue
```
GET    /queue/jobs        → Job[] (all users, priority sorted)
GET    /queue/stats       → { depth, processing, throughput, avgWait }
GET    /queue/partitions  → per-project queue depths
```

### Admin — DLQ
```
GET    /dlq               → DlqEvent[] (all users)
POST   /dlq/:id/retry     → re-enqueue
POST   /dlq/:id/archive   → archive
POST   /dlq/retry-all     → retry all pending
GET    /dlq/stats         → { byErrorType, failureRate, trend }
```

### Admin — Proxies
```
GET    /proxies           → ProxyHealth[] grouped by tier
POST   /proxies/:id/demote    → tier++
POST   /proxies/:id/restore   → status=active, successRate=70
PATCH  /proxies/:id           { status, successRate, cooldownUntil }
POST   /proxies               { proxyUrl, tier, proxyType } → add proxy
```

### Admin — AI Classifier
```
GET    /ai/domains        → per-domain accuracy + labeled + corrections
GET    /ai/stats          → { avgAccuracy, totalClassified, corrections, mode }
POST   /ai/mode           { mode: shadow|advisory|autonomous }
POST   /ai/retrain        → triggers retraining job
```

### Admin — Users
```
GET    /users             → User[] + compute stats
GET    /users/:id         → User detail
PATCH  /users/:id         { plan, computeBudget, status }
POST   /users/:id/suspend → status=suspended
```

### Admin — Patterns
```
GET    /patterns          → TargetPattern[] (all)
POST   /patterns/:id/pin  → status=pinned
POST   /patterns/:id/block → status=blocked
DELETE /patterns/:id      → archive
```

---

## Pages & Components

### Landing Page (`/`)
**Sections:**
1. **Nav** — logo, links (Features, How It Works, Pricing, Stack), CTA buttons (Login, Get Started)
2. **Hero** — badge ("Phase 1 Live"), h1 with green accent, sub paragraph, two CTA buttons
3. **Stats Bar** — 5 stats: 99.8% Uptime, 3-tier proxy, 0 Jobs Lost, <200ms AI, 50+ Agents
4. **Dashboard Preview** — browser mockup with 3 mini stat cards + website table
5. **Features Grid** — 6 feature cards in pastel colors (Phase 1/2/3 labels)
6. **How It Works** — pipeline steps left, scraping pipeline visual right
7. **Pricing** — 3 plans: Starter $0 / Pro $149 / Enterprise $499
8. **Tech Stack** — 4 stack cards
9. **CTA Banner** — green bg, two buttons
10. **Footer** — logo + 3 link columns + copyright

---

### User Dashboard Layout
**Shell:** UserSidebar (220px/58px) + TopBar (58px) + scrollable content

**Sidebar Nav Items:**
```
⬡  Overview        → /app
⫸  Projects        → /app/projects
◦  Discoveries     → /app/results
⚠  DLQ             → /app/dlq  [badge: pending count]
⬌  Keywords        → /app/keywords
⚙  Settings        → /app/settings
```

**User Pages:**

#### 1. Overview (`/app`)
- 4 StatCards: Total Jobs Done (animated +tick), Active Agents, DLQ Events, Avg Yield Rate
- 2-column grid:
  - Left: Projects table (Name, Websites, Jobs, Status) → click → project detail
  - Right: Queue Health mini bars (Pending, Processing, Completed 24h, DLQ)
- Recent Discoveries list (3 items: icon + title + URL + TypePill + date)

#### 2. Projects (`/app/projects`)
- Header: title + description + "New Project" button
- New Project inline form (slides in): name input + Create/Cancel
- 2-col grid of ProjectCards:
  - Header: name + created date + StatusPill
  - 3 mini stats: Websites count (blue), Total Jobs (green), Active (amber)
  - Hover: border turns green, translateY(-2px)
  - Click → project detail

#### 3. Project Detail (`/app/projects/:id`)
- Breadcrumb: ← Projects / Project Name · StatusPill
- 4 StatCards: Websites, Active Now, Total Pages, Avg Yield
- Website table (URL, Pages, Yield%, Priority, Status, Last Run, View→)
  - Filter input (client-side URL filter)
  - Add Website button → AddWebsiteModal
  - Click row → website detail

#### 4. Website Detail (`/app/projects/:projectId/websites/:id`)
- Breadcrumb: ← Projects / Project Name / website.url · StatusPill
- 4 StatCards: Pages Scraped, Yield Rate (with bar), Priority, Last Run
- 2-col grid:
  - Left: Latest Job Log timeline (colored dots + connector line, 6 events)
    - Bottom: "▶ Run Now" button (POST /websites/:id/crawl)
  - Right: AI-Classified Discoveries (4 results: title + URL + TypePill + confidence%)

#### 5. Discoveries (`/app/results`)
- Header: title + description + filter tabs (All / Bidding / Selling)
- Stacked result cards:
  - Left icon (📋 bidding green/🏆 selling yellow)
  - Middle: title + monospace URL
  - Right: TypePill + AI confidence% + found date
  - Hover: green border + -1px translateY

#### 6. DLQ (`/app/dlq`)
- Header: title + description
- 4 StatCards: Pending, Total, Resolved, Failure Rate
- Warning banner (if pending > 0): amber bg, "Retry All" button
- Table: URL, Project, Error Type, Retries, Occurred, Status, Actions (Retry/Archive)

#### 7. Keywords (`/app/keywords`)
- Header: title + description
- 4 StatCards: Active, AI-Learned, Decaying, Promotion Threshold (0.75)
- Table: Keyword (green mono), Source (seed/learned pill), Confidence (bar), Matches, Last Match, Status

#### 8. Settings (`/app/settings`)
- 2x2 grid of settings panels: Account, Plan & Billing, Scraping Defaults, Alerts
- Each panel: label → input → Save button
- Focus: border turns green

---

### Admin Dashboard Layout
**Shell:** AdminSidebar (228px/58px) + TopBar (58px) + scrollable content
**TopBar extras:** animated green dot + "System operational", queue depth live counter

**Admin Sidebar Nav Items:**
```
⬡  System Overview   → /admin
⚡  Agent Pool        → /admin/agents
⫸  Job Queue         → /admin/queue
⚠  DLQ Manager      → /admin/dlq  [badge: pending count, red]
🛡  Proxy Pool        → /admin/proxies
🤖  AI Classifier    → /admin/ai
⚙  Users             → /admin/users
⬌  Patterns          → /admin/patterns
```

**Admin Pages:**

#### 1. System Overview (`/admin`)
- 5 StatCards: Queue Depth (live animated), Active Agents (live), DLQ Events, Proxy Health%, AI Accuracy%
- 3-col grid:
  - Queue by Project: mini bars per project, job count
  - Auto-Scaling Thresholds: queue depth / agent utilization / DLQ inflow rate vs max values
  - System Events: timeline (dot + event + timestamp, 5 latest)
- User Compute Budgets: 5-col grid, one card per user (name, plan, %, bar, agents count)

#### 2. Agent Pool (`/admin/agents`)
- 4 StatCards: Total Agents, Active (with bar), Draining, Idle
- Table with "+ Provision Agents" button:
  - Columns: Agent ID (blue mono), User, Project, Current Job (mono truncated), Pages, CPU% (bar), Started, Status, Actions
  - Actions: Drain (amber) / Terminate (ghost) for active agents

#### 3. Job Queue (`/admin/queue`)
- 4 StatCards: Queue Depth (live), Processing, Throughput (jobs/min), Avg Wait
- Table: "Partitioned by project · Priority sorted" subtitle
  - Columns: Job ID, User, URL (mono truncated), Priority Score (colored by value), Depth, Retries, Proxy, Status

#### 4. Admin DLQ (`/admin/dlq`)
- 4 StatCards: Pending, Total, Resolved, Failure Rate
- Error Type Breakdown: 5 mini cards (proxy_exhaustion, 403_blocked, timeout, parse_failure, domain_expired)
- Warning banner + "Retry All" button
- Table: URL, User, Project, Error (mono red), Retries, Occurred, Status, Actions

#### 5. Proxy Pool (`/admin/proxies`)
- 4 StatCards: Total, Active (with bar), Quarantined, Avg Success Rate
- 3 sections, one per tier (Tier 1 Residential / Tier 2 Datacenter / Tier 3 Rotating)
- Each section has color dot + label + count
- Table per tier: Proxy ID, Type, IP (mono), Success Rate (colored bar), Last Used, Cooldown, Blocked Domains, Status, Actions (Demote / Restore)

#### 6. AI Classifier (`/admin/ai`)
- 4 StatCards: Avg Accuracy, Pages Classified, Corrections, Model Name
- Deployment Mode card: 3 selectable mode buttons (Shadow/Advisory/Autonomous) + Apply button
- Per-Domain Accuracy table + "Trigger Retrain" button:
  - Columns: Domain, Accuracy (colored bar), Labeled Pages, Corrections, Status, Action (Add Labels if <80%)

#### 7. Users (`/admin/users`)
- 4 StatCards: Total, Enterprise, Pro, Starter counts
- Table with search input:
  - Columns: User, Email (mono), Plan (colored pill), Agents, Projects, Compute% (bar), Joined, Status

#### 8. Global Patterns (`/admin/patterns`)
- 4 StatCards: Total, Global (seed), AI-Learned, Decaying
- Table: Keyword (green mono), Source (pill), Confidence (bar), Total Matches, Status, Actions (Pin/Block)

---

## Worker Architecture

### 1. Scraper Worker (`workers/scraper.ts`)
```
Queue: "scrape-queue"
Concurrency: 3 per worker instance

Process:
1. Receive job { websiteId, url, depth, crawlBudget, userId, projectId }
2. Select proxy via proxy.service.ts (weighted tier algorithm)
3. Launch Playwright (or Cheerio for static detection)
4. Discover all links on page
5. Score each link via prioritization engine (5 signals)
6. Add top-N to priority queue (N = remaining budget)
7. For each page fetched:
   a. Send content to Ollama classifier
   b. Store Result in DB if classification = bidding|selling
   c. Update job.pagesScraped
8. On error:
   a. retries++ 
   b. If retries < 3: rotate proxy tier, re-enqueue with backoff (2-10s jitter)
   c. If retries >= 3: push to DLQ stream
9. On complete: update Job, Website (lastCrawled, totalPages, yieldRate)
```

**Link Prioritization Engine (5 signals):**
```
Signal              Weight  Logic
Keyword Match         40%   URL/anchor contains TargetPattern keywords
Structural Depth      20%   Score = 1 / (depth_segments + 1)
Freshness Signal      20%   URL contains /2026/, date pattern → boost
Historical Yield      15%   Past Result URLs from same domain pattern
Sibling Context        5%   Adjacent links match → minor boost to neighbors

Final score = weighted sum (0.0 – 1.0)
Stored in Job.result.urlScores[] for Historical Yield learning
```

### 2. Classifier Worker (`workers/classifier.ts`)
```
Called inline by scraper (not a separate queue)

Input:  { url, title, bodySnippet: first 500 chars }
Output: { classification, confidence, reason }

Ollama call:
  POST http://localhost:11434/api/generate
  { model: "llama3.2", stream: false, format: "json", prompt: ... }

Prompt template:
  "Classify this web page for an ITAD procurement intelligence system.
   URL: {url}
   Title: {title}
   Content: {bodySnippet}
   Respond with JSON only:
   {"classification":"bidding|selling|informational|irrelevant","confidence":0.0-1.0,"reason":"one sentence"}"

Target latency: <200ms (send only title + 500 chars)
Fallback: if Ollama unavailable → classify as "informational" with confidence 0
```

### 3. DLQ Triage Worker (`workers/dlq-triage.ts`)
```
Schedule: every 30 seconds (setInterval)

Process:
1. Read new entries from Redis DLQ stream (XREAD)
2. For each entry:
   a. Write to PostgreSQL DlqEvent table
   b. Classify error type:
      - transient (timeout, 5xx) → re-enqueue after backoff (5min, 30min, 2hr)
      - permanent (404, domain_expired) → status=archived, flag domain
      - proxy_exhaustion → flag domain for manual review
3. Emit SSE event to /api/monitor/stream
```

### 4. Proxy Health Worker (`workers/proxy-health.ts`)
```
Schedule: every 5 minutes

Process:
1. Fetch all ProxyHealth records
2. For each proxy: GET known-good test URL through proxy
3. Update successRate (rolling 1-hour window)
4. If successRate < 0.5: status=quarantined, cooldownUntil = now + 10min
5. If cooldownUntil passed: status=idle, ready for re-evaluation
```

### 5. Pattern Learner Worker (`workers/pattern-learner.ts`)
```
Schedule: every 6 hours

Process:
1. Fetch Results from last 6hr where classification = bidding|selling
2. Extract URL path n-grams (2-3 word sequences)
3. Compare against existing TargetPatterns
4. New candidates: confidenceScore = 0.3 (start low)
5. Existing patterns found in new results: confidenceScore += 0.05
6. Patterns not found in 90 days: confidenceScore -= 0.1
7. Promote if confidenceScore >= 0.75 (status=active)
8. Archive if confidenceScore < 0.2 (status=archived)
9. Log all changes for weekly digest
```

---

## Build Order

Follow these steps in sequence. Each step is a working increment.

---

### STEP 1 — Monorepo Scaffold (Day 1 AM)
```bash
mkdir itad-scraper && cd itad-scraper
# Root package.json with workspaces
npm init -y
# Create docker-compose.yml
# Create .env.example
# Create subpackages: frontend, backend, workers
mkdir frontend backend workers shared design
```

**Deliverable:** `docker compose up -d` runs Redis + PostgreSQL

---

### STEP 2 — Backend Foundation (Day 1 PM)
```bash
cd backend
npm init -y
npm install express cors helmet express-rate-limit
npm install jsonwebtoken bcrypt
npm install @prisma/client zod
npm install -D prisma typescript ts-node @types/node @types/express
```

1. Write `prisma/schema.prisma` (full schema above)
2. `npx prisma migrate dev --name init`
3. Express app: cors, helmet, rate limit, JSON body
4. Error handler middleware
5. Auth routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`
6. JWT middleware (verifyJWT, requireAdmin)

**Deliverable:** `POST /api/auth/register` returns JWT, `GET /api/auth/me` returns user

---

### STEP 3 — Core API Routes (Day 2)
1. Projects CRUD (`/api/projects`)
2. Websites CRUD + crawl trigger (`/api/websites`)
3. Jobs read routes (`/api/jobs`)
4. Results read routes (`/api/results`)
5. DLQ routes + retry/archive (`/api/dlq`)
6. Patterns read route (`/api/patterns`)

**Deliverable:** All user routes respond with mock/empty data. Test via Postman.

---

### STEP 4 — BullMQ Queue Setup (Day 2 PM)
```bash
npm install bullmq ioredis
```

1. Redis connection (`lib/redis.ts`)
2. Queue definitions (`lib/bullmq.ts`): `scrape-queue`, `dlq-stream`
3. Queue service: `addScrapeJob()`, `getQueueStats()`, `getJobsByProject()`
4. Wire `POST /websites/:id/crawl` to enqueue a job

**Deliverable:** POST crawl endpoint enqueues a BullMQ job visible in queue stats

---

### STEP 5 — Scraper Worker (Day 3)
```bash
cd workers
npm install bullmq ioredis playwright cheerio @prisma/client
npx playwright install chromium
```

1. BullMQ worker consuming `scrape-queue`
2. Playwright browser pool (2 instances)
3. Link discovery + prioritization scoring engine (5 signals)
4. 3-retry loop with proxy placeholder (HTTP agent headers rotation)
5. Cheerio fallback for static HTML
6. On failure after 3 retries: push to Redis DLQ stream
7. Update Job and Website records in DB

**Deliverable:** Enqueue a real website → worker scrapes it → pages stored in DB

---

### STEP 6 — Ollama Classifier (Day 3 PM)
1. `classifier.ts` service with 500-char truncation
2. Parse JSON response from llama3.2
3. Fallback to "informational" if Ollama unavailable
4. Store Results with classification + confidence in DB
5. Update Website.yieldRate after each crawl

**Deliverable:** Scraped pages classified as bidding/selling/etc, stored in DB

---

### STEP 7 — DLQ Triage + Proxy Health Workers (Day 4)
1. DLQ triage: reads Redis DLQ stream, writes to PostgreSQL DlqEvent, auto-retries transient
2. Proxy health: reads ProxyHealth table, pings test URLs, updates successRate, quarantines bad proxies
3. Seed proxy pool with 8 test proxies (from PROXIES_DATA in design)
4. Wire proxy selection into scraper worker

**Deliverable:** Jobs failing after 3 retries appear in `dlq_events` table

---

### STEP 8 — SSE Monitor Endpoint (Day 4 PM)
1. `GET /api/monitor/stream` — SSE endpoint
2. Push events every 5 seconds: queue depth, active agents, DLQ inflow rate
3. Push on events: job completed, DLQ entry created, proxy quarantined

**Deliverable:** `curl /api/monitor/stream` streams JSON events

---

### STEP 9 — Admin Routes (Day 5)
1. All `/api/admin/*` routes (agents, queue, DLQ, proxies, AI, users, patterns)
2. requireAdmin middleware guards
3. AgentRegistry seed data + heartbeat update
4. AI Classifier mode stored in DB (or Redis)

**Deliverable:** Admin endpoints return data

---

### STEP 10 — Frontend Setup (Day 5 PM)
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install tailwindcss postcss autoprefixer
npx tailwindcss init
npx shadcn@latest init
npm install @tanstack/react-query zustand axios react-router-dom
npm install recharts lucide-react
npm install -D @types/node
```

1. Configure Tailwind with design CSS variables
2. Install shadcn components: Button, Card, Badge, Table, Dialog, Input, Progress, Alert, Tabs, DropdownMenu, Skeleton, Toast
3. Add Google Fonts to `index.html`
4. Set up `lib/api.ts` (Axios with JWT interceptor + refresh logic)
5. Set up `queryClient.ts`
6. Set up `authStore.ts` (Zustand)
7. React Router: Landing, Auth, User app (`/app/*`), Admin app (`/admin/*`)

**Deliverable:** `npm run dev` shows blank app with routing working

---

### STEP 11 — Shared Components (Day 6 AM)
Build these first — used everywhere:
1. `StatusPill` — all statuses with exact colors from design
2. `MiniBar` — progress bar (height, color props)
3. `StatCard` — label + value + sub + optional bar
4. `DataTable` — thead/tbody with hover, sorting stub
5. `LiveDot` — animated green pulse dot
6. `UserSidebar` + `AdminSidebar` (collapse logic)
7. `TopBar` (user and admin variants)
8. `AppShell` — sidebar + topbar + content area

**Deliverable:** Storybook-level: components visible with mock props

---

### STEP 12 — Auth Pages (Day 6 AM)
1. `/login` — centered card, email/password, error states, loading
2. `/register` — name + email + password + plan select
3. Zustand auth store: set/clear user + token
4. Protected route wrapper (redirect to /login if no token)
5. Admin route wrapper (redirect if role !== admin)

**Deliverable:** Full auth flow working with real backend

---

### STEP 13 — User Dashboard Pages (Day 6 PM – Day 7)
Build in this order (each ~1-2 hours):

1. **Overview** — 4 stats, projects table, queue health, recent discoveries
2. **Projects** — project cards grid, new project form
3. **Project Detail** — website table, add website modal
4. **Website Detail** — job log timeline, AI results
5. **Discoveries** — filtered results list
6. **DLQ** — table + retry/archive actions + warning banner
7. **Keywords** — table with confidence bars
8. **Settings** — 4 settings panels with inputs

**Deliverable:** Full user dashboard navigable with real API data

---

### STEP 14 — Admin Dashboard Pages (Day 7 PM – Day 8)
Build in this order:

1. **System Overview** — 5 stats, 3 panels (queue/scaling/events), compute budgets
2. **Agent Pool** — agent table with drain/terminate
3. **Job Queue** — live table with priority scores
4. **Admin DLQ** — error breakdown cards + table
5. **Proxy Pool** — 3 tier sections with demote/restore
6. **AI Classifier** — mode selector + domain accuracy table
7. **Users** — user table with search
8. **Global Patterns** — pattern table with pin/block

**Deliverable:** Full admin dashboard with real data

---

### STEP 15 — SSE Live Monitor (Day 8 PM)
1. `useQueueStream` hook (EventSource + reconnect logic)
2. Wire into System Overview: queue depth chart animates live
3. Live agent count update
4. Toast notifications on DLQ events
5. Queue depth counter in Admin TopBar animates

**Deliverable:** Admin system overview updates in real-time without refresh

---

### STEP 16 — Landing Page (Day 9 AM)
1. Build all 10 sections as React components
2. No data fetching needed — all static
3. Links to `/login` and `/admin`
4. Responsive (mobile: single col, tablet: 2 col, desktop: 3 col)

**Deliverable:** Marketing landing page fully built

---

### STEP 17 — Pattern Learner Worker (Day 9 PM)
1. N-gram extraction from Results
2. Confidence scoring + promotion/decay logic
3. Wire to TargetPattern table
4. Test: scrape 10 pages, check if new keywords promoted

**Deliverable:** New keywords appear in /admin/patterns after scraping

---

### STEP 18 — Polish & Edge Cases (Day 10)
1. Loading skeletons on all table/card sections
2. Error boundaries + fallback UI
3. Empty states (no projects yet, no results yet)
4. Toast notifications (shadcn Toaster): crawl started, job complete, DLQ alert
5. Responsive check for all pages
6. Input validation (Zod) on all forms
7. Rate limiting validation on backend
8. 404 page

**Deliverable:** Production-quality UX, no blank states

---

## Feature Checklist

### Infrastructure
- [ ] PostgreSQL + Prisma with full schema
- [ ] Redis 7 connection
- [ ] BullMQ scrape-queue with priority support
- [ ] Redis DLQ stream
- [ ] Docker Compose (Redis + PostgreSQL)

### Auth
- [ ] Register with name/email/password/plan
- [ ] Login → JWT access token (15min)
- [ ] Refresh token (httpOnly cookie, 7 days)
- [ ] Protected routes (user + admin)
- [ ] requireAdmin middleware

### Scraper
- [ ] Playwright browser pool
- [ ] Cheerio static fallback
- [ ] 5-signal link prioritization engine
- [ ] Crawl budget enforcement
- [ ] 3-retry loop with jitter
- [ ] Proxy tier rotation on failure
- [ ] DLQ push after 3 retries

### Ollama AI Classifier
- [ ] llama3.2 classification (bidding/selling/informational/irrelevant)
- [ ] Confidence score (0.0–1.0)
- [ ] <200ms target (500 char truncation)
- [ ] Fallback on Ollama unavailable
- [ ] Results stored in DB

### DLQ
- [ ] Redis stream DLQ ingestion
- [ ] PostgreSQL dlq_events persistence
- [ ] Auto-triage (transient vs permanent)
- [ ] User retry/archive actions
- [ ] Admin bulk retry
- [ ] Failure rate calculation
- [ ] DLQ alert badge in sidebar

### Proxy Management
- [ ] ProxyHealth table with 8+ proxy records
- [ ] Tiered selection (residential → datacenter → rotating)
- [ ] Weighted algorithm (success rate + idle time)
- [ ] Per-domain block tracking
- [ ] 5-minute health check worker
- [ ] Auto-quarantine at <50% success rate
- [ ] Demote/restore actions in admin

### Pattern Learning
- [ ] Seed keyword corpus (8 initial keywords)
- [ ] N-gram extraction from confirmed results
- [ ] Confidence scoring (promote at 0.75, archive at 0.2)
- [ ] 90-day decay mechanism
- [ ] Pin/block governance controls
- [ ] 6-hour learning cycle

### SSE Monitor
- [ ] /api/monitor/stream endpoint
- [ ] Queue depth events
- [ ] Agent count events
- [ ] DLQ inflow events
- [ ] Frontend useQueueStream hook
- [ ] Auto-reconnect on disconnect

### User Dashboard
- [ ] Overview page with live stats
- [ ] Projects list + create project
- [ ] Project detail with website table
- [ ] Add website with URL/depth/budget/priority
- [ ] Website detail with job timeline
- [ ] Crawl now button
- [ ] Discoveries page with type filter
- [ ] DLQ page with retry/archive
- [ ] Keywords corpus view
- [ ] Settings page (account/plan/scraping/alerts)

### Admin Dashboard
- [ ] System overview with live scaling metrics
- [ ] Agent pool with drain/terminate/provision
- [ ] Job queue with priority sort + partition view
- [ ] Admin DLQ with error breakdown
- [ ] Proxy pool tiered management
- [ ] AI classifier mode (shadow/advisory/autonomous)
- [ ] Per-domain accuracy tracking
- [ ] User management table
- [ ] Global patterns with pin/block

### Landing Page
- [ ] Hero with badge + CTA
- [ ] Stats bar (5 metrics)
- [ ] Dashboard preview card
- [ ] 6-feature grid (Phase 1/2/3 labels)
- [ ] How it works pipeline
- [ ] Pricing table (3 plans)
- [ ] Tech stack section
- [ ] CTA banner
- [ ] Footer

---

## Docker & Dev Setup

`docker-compose.yml`:
```yaml
version: '3.9'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: itad
      POSTGRES_USER: itad
      POSTGRES_PASSWORD: itad_secret
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  redis_data:
  pg_data:
```

Root `package.json` scripts:
```json
{
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:workers": "cd workers && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:workers\" \"npm run dev:frontend\"",
    "db:migrate": "cd backend && npx prisma migrate dev",
    "db:studio": "cd backend && npx prisma studio",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down"
  }
}
```

---

## Environment Variables

`.env.example` (copy to `.env`):
```env
# Database
DATABASE_URL="postgresql://itad:itad_secret@localhost:5432/itad"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_ACCESS_SECRET="change-me-access-secret-32chars"
JWT_REFRESH_SECRET="change-me-refresh-secret-32chars"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"

# Ollama
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"

# App
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# Admin (seed account)
ADMIN_EMAIL="admin@itadintel.io"
ADMIN_PASSWORD="change-me-admin-password"
```

---

## Verification Checklist (End of Each Step)

| Step | Test |
|---|---|
| Step 1 | `docker compose ps` → redis + postgres healthy |
| Step 2 | `POST /api/auth/register` → 201 with JWT |
| Step 3 | `GET /api/projects` → 200 (empty array) |
| Step 4 | `POST /websites/:id/crawl` → job appears in BullMQ |
| Step 5 | Worker picks job, scrapes real URL, pages in DB |
| Step 6 | Result rows with classification=bidding appear in DB |
| Step 7 | Failed job appears in dlq_events table after 3 retries |
| Step 8 | `curl /api/monitor/stream` streams JSON every 5s |
| Step 9 | `GET /api/admin/agents` → returns AgentRegistry data |
| Step 10 | `npm run dev` → Vite app loads, routing works |
| Step 11 | StatusPill renders all 10 states correctly |
| Step 12 | Login → JWT stored → /app loads → /login redirect if no token |
| Step 13 | Projects page shows real DB data, create project works |
| Step 14 | Admin proxy pool shows tiered proxies with demote button |
| Step 15 | Admin system overview queue depth animates without reload |
| Step 16 | Landing page renders fully at 375px, 768px, 1440px |
| Step 17 | After scraping, new keyword appears in patterns with confidence |
| Step 18 | No blank states, all loading skeletons visible during fetch |

---

## Design Reference Files
- `design/ITAD User Dashboard.html` — User app mockup
- `design/ITAD Admin Dashboard.html` — Admin app mockup  
- `design/ITAD Landing.html` — Landing page mockup

Open these in a browser to reference the exact UI while building each page.
