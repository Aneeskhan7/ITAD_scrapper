-- ITAD Intelligence SaaS — Add Keyword Watchlist & Notifications
-- Run this AFTER 001_initial_schema.sql + 002_seed.sql.
-- Equivalent to Prisma migration: 20260501113503_add_keyword_watchlist
-- Adds: WatchKeyword, KeywordHit, Notification tables;
--       targetPagePatterns on Website; fullText/textHash on Result;
--       email/notification fields + unsubscribeToken on User.

-- ──────────────────────────────────────────────
-- User: notification preferences + unsubscribe token
-- ──────────────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailNotifications"   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "emailDigestFrequency" TEXT    NOT NULL DEFAULT 'instant',  -- instant | hourly | daily
  ADD COLUMN IF NOT EXISTS "inAppNotifications"   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "unsubscribeToken"     TEXT;

-- Backfill unsubscribeToken for existing rows
UPDATE "User"
SET "unsubscribeToken" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "unsubscribeToken" IS NULL;

ALTER TABLE "User" ALTER COLUMN "unsubscribeToken" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_unsubscribeToken_key" ON "User"("unsubscribeToken");

-- ──────────────────────────────────────────────
-- Website: target page filter
-- ──────────────────────────────────────────────
ALTER TABLE "Website"
  ADD COLUMN IF NOT EXISTS "targetPagePatterns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ──────────────────────────────────────────────
-- Result: full text + hash for dedupe and keyword scanning
-- ──────────────────────────────────────────────
ALTER TABLE "Result"
  ADD COLUMN IF NOT EXISTS "fullText" TEXT,
  ADD COLUMN IF NOT EXISTS "textHash" TEXT;

CREATE INDEX IF NOT EXISTS "Result_textHash_idx" ON "Result"("textHash");

-- ──────────────────────────────────────────────
-- WatchKeyword — per-user keyword watchlist
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "WatchKeyword" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"        TEXT        NOT NULL,
  "projectId"     TEXT        NOT NULL,
  "websiteId"     TEXT,                                            -- null = all websites in projectId
  "keyword"       TEXT        NOT NULL,
  "matchMode"     TEXT        NOT NULL DEFAULT 'contains',         -- contains | exact | regex | fuzzy
  "caseSensitive" BOOLEAN     NOT NULL DEFAULT FALSE,
  "status"        TEXT        NOT NULL DEFAULT 'active',           -- active | paused
  "hitCount"      INTEGER     NOT NULL DEFAULT 0,
  "lastHitAt"     TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE,
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE,
  FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "WatchKeyword_userId_idx"    ON "WatchKeyword"("userId");
CREATE INDEX IF NOT EXISTS "WatchKeyword_projectId_idx" ON "WatchKeyword"("projectId");
CREATE INDEX IF NOT EXISTS "WatchKeyword_websiteId_idx" ON "WatchKeyword"("websiteId");
CREATE INDEX IF NOT EXISTS "WatchKeyword_keyword_idx"   ON "WatchKeyword"("keyword");
CREATE INDEX IF NOT EXISTS "WatchKeyword_status_idx"    ON "WatchKeyword"("status");

-- ──────────────────────────────────────────────
-- KeywordHit — record of every match
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "KeywordHit" (
  "id"             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "watchKeywordId" TEXT        NOT NULL,
  "userId"         TEXT        NOT NULL,
  "websiteId"      TEXT        NOT NULL,
  "projectId"      TEXT        NOT NULL,
  "resultId"       TEXT,
  "pageUrl"        TEXT        NOT NULL,
  "pageTitle"      TEXT,
  "matchedText"    TEXT        NOT NULL,
  "context"        TEXT        NOT NULL,                            -- ~200-char snippet
  "position"       INTEGER     NOT NULL,                            -- char offset in fullText
  "status"         TEXT        NOT NULL DEFAULT 'new',              -- new | reviewed | relevant | dismissed
  "notifiedInApp"  BOOLEAN     NOT NULL DEFAULT FALSE,
  "notifiedEmail"  BOOLEAN     NOT NULL DEFAULT FALSE,
  "foundAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("watchKeywordId", "resultId", "position"),
  FOREIGN KEY ("watchKeywordId") REFERENCES "WatchKeyword"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId")         REFERENCES "User"("id")         ON DELETE CASCADE,
  FOREIGN KEY ("websiteId")      REFERENCES "Website"("id")      ON DELETE CASCADE,
  FOREIGN KEY ("resultId")       REFERENCES "Result"("id")       ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "KeywordHit_user_status_idx" ON "KeywordHit"("userId", "status");
CREATE INDEX IF NOT EXISTS "KeywordHit_websiteId_idx"   ON "KeywordHit"("websiteId");
CREATE INDEX IF NOT EXISTS "KeywordHit_keyword_idx"     ON "KeywordHit"("watchKeywordId");
CREATE INDEX IF NOT EXISTS "KeywordHit_foundAt_idx"     ON "KeywordHit"("foundAt");

-- ──────────────────────────────────────────────
-- Notification — in-app notifications inbox
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT        NOT NULL,
  "type"      TEXT        NOT NULL,                                  -- keyword_hit | crawl_complete | dlq_alert | discovery_complete | billing
  "title"     TEXT        NOT NULL,
  "body"      TEXT        NOT NULL,
  "link"      TEXT,
  "payload"   JSONB,
  "readAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "Notification_user_read_idx" ON "Notification"("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
