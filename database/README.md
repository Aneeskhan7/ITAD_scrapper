# Database Migrations

## Option A — Prisma (recommended)
Prisma auto-generates and runs migrations. Just set DATABASE_URL in .env, then:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

## Option B — Raw SQL (manual)
Run these files in order against your PostgreSQL database:

```bash
psql $DATABASE_URL -f 001_initial_schema.sql
psql $DATABASE_URL -f 002_seed.sql
psql $DATABASE_URL -f 003_add_keyword_watchlist.sql
```

Or paste them directly into Supabase SQL Editor, Neon console, pgAdmin, or DBeaver.

> **Note:** Prisma migrations under `backend/prisma/migrations/` are now the source of truth. The raw-SQL files are kept for the alternative-path setup but each new schema change ships as both a Prisma migration and a numbered SQL file in this folder.

## Default credentials after seeding
| Role  | Email               | Password     |
|-------|---------------------|--------------|
| Admin | scrapperadmin@gmail.com | admin123 |
| User  | john@itadintel.io   | Demo@123456  |

**Change these before deploying to production.**
