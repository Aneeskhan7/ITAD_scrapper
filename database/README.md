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
```

Or paste them directly into Supabase SQL Editor, Neon console, pgAdmin, or DBeaver.

## Default credentials after seeding
| Role  | Email               | Password     |
|-------|---------------------|--------------|
| Admin | scrapperadmin@gmail.com | admin123 |
| User  | john@itadintel.io   | Demo@123456  |

**Change these before deploying to production.**
