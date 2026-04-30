# ITAD Intelligence — Setup Guide

Full-stack AI-powered web scraping SaaS for ITAD procurement intelligence. This guide gets you from a fresh clone to a running app in ~15 minutes.

---

## 1. System Prerequisites

Install these on your machine before doing anything else.

| Tool | Min Version | Why | Install |
|------|-------------|-----|---------|
| **Node.js** | 20.x | Runs frontend + backend + workers | https://nodejs.org/ |
| **npm** | 10.x | Comes with Node | (bundled) |
| **PostgreSQL** | 16.x | Primary database | https://www.postgresql.org/download/ |
| **Redis** | 7.x | Job queue (BullMQ) | Windows: https://github.com/microsoftarchive/redis/releases · macOS: `brew install redis` · Linux: `apt install redis-server` |
| **Ollama** | latest | Local AI classifier | https://ollama.com/download |
| **Git** | 2.x | Clone the repo | https://git-scm.com/ |

After installing Ollama, pull the model the project uses:
```bash
ollama pull llama3.2
```

Verify everything is on PATH:
```bash
node --version       # v20.x.x
npm --version        # 10.x.x
psql --version       # 16.x
redis-cli --version  # 7.x
ollama list          # should show llama3.2
git --version
```

---

## 2. Clone & Install

```bash
git clone https://github.com/Aneeskhan7/ITAD_scrapper.git
cd ITAD_scrapper
npm install
```

`npm install` at the root installs dependencies for **all four workspaces** (frontend, backend, workers, shared) thanks to npm workspaces — no need to `cd` into each folder.

---

## 3. Database Setup

### 3a. Create the PostgreSQL database

Open `psql` (or pgAdmin) and run:
```sql
CREATE DATABASE "ITAD_scrapper";
```

(Or use whatever DB name you want — just match it in `DATABASE_URL` later.)

### 3b. Apply the schema

```bash
cd database
psql -U postgres -d ITAD_scrapper -f 001_initial_schema.sql
psql -U postgres -d ITAD_scrapper -f 002_seed.sql
cd ..
```

This creates all 10 tables (User, Project, Website, Job, Result, DlqEvent, ProxyHealth, TargetPattern, AgentRegistry, RefreshToken) and seeds:
- Admin user: `scrapperadmin@gmail.com` / `admin123`
- Demo user: `john@itadintel.io` / `Demo@123456`
- 10 seed keywords (`bid`, `rfp`, `tender`, etc.)
- 8 seed proxies across 3 tiers
- 8 seed agents

> **Alternative (Prisma):** if you prefer Prisma migrations over raw SQL, run `cd backend && npx prisma migrate dev --name init && npx prisma db seed` instead.

---

## 4. Environment Variables

The repo ships `.env.example` files. Copy each to `.env` and fill in your values:

```bash
cp backend/.env.example backend/.env
cp workers/.env.example workers/.env
```

### `backend/.env` — required values

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ITAD_scrapper"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="<paste hex string from below>"
JWT_REFRESH_SECRET="<paste a DIFFERENT hex string>"
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

Generate the two JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Run it twice. Paste the first output as `JWT_ACCESS_SECRET`, the second as `JWT_REFRESH_SECRET`.

### `workers/.env` — required values

Same `DATABASE_URL`, `REDIS_URL`, `OLLAMA_URL`, `OLLAMA_MODEL` as above. No JWT needed (workers don't serve HTTP).

---

## 5. Start the Stack

You need **four things running at once**: Postgres, Redis, Ollama, and the Node app. The first three run as services. For the Node app, open three terminals from the repo root.

### Make sure services are up

```bash
# Postgres (Windows: starts as Windows service automatically; macOS: brew services start postgresql@16)
# Redis (Windows: redis-server.exe; macOS: brew services start redis; Linux: systemctl start redis)
ollama serve   # if not already running as a service
```

### Terminal 1 — backend API
```bash
npm run dev:backend
# → http://localhost:3001
```

### Terminal 2 — workers (scraper + classifier + DLQ triage + pattern learner)
```bash
npm run dev:workers
```

### Terminal 3 — frontend
```bash
npm run dev:frontend
# → http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## 6. Verify It's Working

1. Land on the marketing page → click **Login**.
2. Log in as admin: `scrapperadmin@gmail.com` / `admin123` → you should land on `/admin` (System Overview).
3. Log out, log in as user: `john@itadintel.io` / `Demo@123456` → you should land on `/app` (Overview).
4. Click **+ New Robot** → choose **Extract Structured Data** → name it → it should create a project and route you to the project detail page.
5. In the admin **AI Classifier** page, paste a URL/title/body into the live test box → click **Classify** → you should get a JSON response from Ollama within ~200ms.

If step 5 fails, Ollama isn't running or `llama3.2` isn't pulled.

---

## 7. Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `Can't reach database server` | Postgres not running, or wrong password in `DATABASE_URL` | Start the Postgres service; double-check the password (escape special chars like `!` if needed) |
| `connect ECONNREFUSED 127.0.0.1:6379` | Redis not running | Start Redis (`redis-server` or platform service) |
| `Invalid credentials` on admin login | DB seeded with the OLD admin email but you're using the new one | Run `database/002_seed.sql` again, OR update the existing row: `UPDATE "User" SET email='scrapperadmin@gmail.com', "passwordHash"='$2b$12$hkUy4e4mdhIMq0nq3F4PwuaEYG5syiHErvx6ANxgjk7EQjv3br0TS' WHERE role='admin';` |
| AI Classifier returns "fallback" labels | Ollama not reachable or `llama3.2` not pulled | Run `ollama pull llama3.2` then `ollama serve` |
| Frontend shows blank page | Backend not running on port 3001 | Start backend in Terminal 1 |
| `EADDRINUSE: port 3001` | Another process on 3001 | Change `PORT=3001` in `backend/.env`, or kill the conflicting process |

---

## 8. Project Structure

```
ITAD_scrapper/
├── frontend/         React 18 + Vite + TanStack Query (port 5173)
├── backend/          Express 5 + Prisma + JWT auth (port 3001)
├── workers/          BullMQ workers: scraper, classifier, DLQ triage, pattern learner
├── shared/           Shared TypeScript types (workspace dummy)
├── database/         Raw SQL migrations + seed (run via psql)
├── docker-compose.yml  Optional: spins up Postgres + Redis in Docker
└── package.json      npm workspaces root with dev/build scripts
```

---

## 9. Optional — Docker for Postgres + Redis

If you'd rather not install Postgres/Redis natively, the repo ships a `docker-compose.yml`:

```bash
docker compose up -d   # starts postgres + redis
```

You'll still need Ollama installed natively (it's not in the compose file because the model files are large and host-specific).

---

## 10. Stack Reference

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, TypeScript, TanStack Query, Zustand, React Router |
| Backend | Node.js 20, Express 5, Prisma 5, PostgreSQL 16, JWT |
| Workers | BullMQ, Playwright, Cheerio, Redis Streams |
| AI | Ollama, llama3.2 (local inference) |
| DevOps | Docker Compose (optional), npm workspaces |

---

## Help

Stuck? Check `PLAN.md` in the repo root for the full architecture write-up, or ask Anees.
