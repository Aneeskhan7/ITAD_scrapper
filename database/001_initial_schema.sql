-- ITAD Intelligence SaaS — Initial Schema Migration
-- Run this once against a fresh PostgreSQL database.
-- After running this, run 002_seed.sql to populate initial data.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────
-- Users
-- ──────────────────────────────────────────────
CREATE TABLE "User" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "email"         TEXT        NOT NULL,
  "passwordHash"  TEXT        NOT NULL,
  "name"          TEXT        NOT NULL,
  "role"          TEXT        NOT NULL DEFAULT 'user',          -- user | admin
  "plan"          TEXT        NOT NULL DEFAULT 'starter',       -- starter | pro | enterprise
  "computeBudget" INTEGER     NOT NULL DEFAULT 5,
  "status"        TEXT        NOT NULL DEFAULT 'active',        -- active | suspended
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("email")
);

-- ──────────────────────────────────────────────
-- Refresh Tokens
-- ──────────────────────────────────────────────
CREATE TABLE "RefreshToken" (
  "id"        TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT        NOT NULL,
  "token"     TEXT        NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("token"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- ──────────────────────────────────────────────
-- Projects
-- ──────────────────────────────────────────────
CREATE TABLE "Project" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "status"      TEXT        NOT NULL DEFAULT 'active',          -- active | paused | archived
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- ──────────────────────────────────────────────
-- Websites
-- ──────────────────────────────────────────────
CREATE TABLE "Website" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "projectId"   TEXT        NOT NULL,
  "userId"      TEXT        NOT NULL,
  "url"         TEXT        NOT NULL,
  "depth"       INTEGER     NOT NULL DEFAULT 2,
  "crawlBudget" INTEGER     NOT NULL DEFAULT 200,
  "schedule"    TEXT,
  "status"      TEXT        NOT NULL DEFAULT 'idle',            -- idle | crawling | queued | failed | paused
  "priority"    TEXT        NOT NULL DEFAULT 'medium',          -- high | medium | low
  "lastCrawled" TIMESTAMPTZ,
  "totalPages"  INTEGER     NOT NULL DEFAULT 0,
  "yieldRate"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);
CREATE INDEX "Website_projectId_idx" ON "Website"("projectId");
CREATE INDEX "Website_userId_idx"    ON "Website"("userId");

-- ──────────────────────────────────────────────
-- Jobs
-- ──────────────────────────────────────────────
CREATE TABLE "Job" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "websiteId"   TEXT        NOT NULL,
  "projectId"   TEXT        NOT NULL,
  "userId"      TEXT        NOT NULL,
  "url"         TEXT        NOT NULL,
  "status"      TEXT        NOT NULL DEFAULT 'pending',         -- pending | active | completed | failed
  "retries"     INTEGER     NOT NULL DEFAULT 0,
  "proxyTier"   INTEGER,
  "proxyId"     TEXT,
  "errorType"   TEXT,
  "errorDetail" TEXT,
  "pagesScraped" INTEGER    NOT NULL DEFAULT 0,
  "duration"    INTEGER,
  "startedAt"   TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE
);
CREATE INDEX "Job_websiteId_idx"  ON "Job"("websiteId");
CREATE INDEX "Job_projectId_idx"  ON "Job"("projectId");
CREATE INDEX "Job_status_idx"     ON "Job"("status");
CREATE INDEX "Job_createdAt_idx"  ON "Job"("createdAt");

-- ──────────────────────────────────────────────
-- Results (AI-classified pages)
-- ──────────────────────────────────────────────
CREATE TABLE "Result" (
  "id"             TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "websiteId"      TEXT             NOT NULL,
  "projectId"      TEXT             NOT NULL,
  "userId"         TEXT             NOT NULL,
  "url"            TEXT             NOT NULL,
  "title"          TEXT,
  "bodySnippet"    TEXT,
  "classification" TEXT             NOT NULL,                   -- bidding | selling | informational | irrelevant
  "confidence"     DOUBLE PRECISION NOT NULL,
  "reason"         TEXT,
  "rawContent"     JSONB,
  "foundAt"        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE
);
CREATE INDEX "Result_websiteId_idx"      ON "Result"("websiteId");
CREATE INDEX "Result_projectId_idx"      ON "Result"("projectId");
CREATE INDEX "Result_userId_idx"         ON "Result"("userId");
CREATE INDEX "Result_classification_idx" ON "Result"("classification");

-- ──────────────────────────────────────────────
-- Dead-Letter Queue Events
-- ──────────────────────────────────────────────
CREATE TABLE "DlqEvent" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "projectId"  TEXT        NOT NULL,
  "websiteId"  TEXT        NOT NULL,
  "userId"     TEXT        NOT NULL,
  "url"        TEXT        NOT NULL,
  "errorType"  TEXT        NOT NULL,
  "payload"    JSONB       NOT NULL,
  "status"     TEXT        NOT NULL DEFAULT 'pending',          -- pending | retried | archived
  "retry1At"   TIMESTAMPTZ,
  "retry2At"   TIMESTAMPTZ,
  "retry3At"   TIMESTAMPTZ,
  "resolvedAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("projectId") REFERENCES "Project"("id"),
  FOREIGN KEY ("userId")    REFERENCES "User"("id")
);
CREATE INDEX "DlqEvent_projectId_idx" ON "DlqEvent"("projectId");
CREATE INDEX "DlqEvent_errorType_idx" ON "DlqEvent"("errorType");
CREATE INDEX "DlqEvent_status_idx"    ON "DlqEvent"("status");
CREATE INDEX "DlqEvent_userId_idx"    ON "DlqEvent"("userId");

-- ──────────────────────────────────────────────
-- Proxy Health
-- ──────────────────────────────────────────────
CREATE TABLE "ProxyHealth" (
  "id"             TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "proxyUrl"       TEXT             NOT NULL,
  "tier"           INTEGER          NOT NULL,                   -- 1 | 2 | 3
  "proxyType"      TEXT             NOT NULL,                   -- residential | datacenter | rotating
  "ipDisplay"      TEXT             NOT NULL,
  "successRate"    DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "totalRequests"  INTEGER          NOT NULL DEFAULT 0,
  "cooldownUntil"  TIMESTAMPTZ,
  "blockedDomains" TEXT[]           NOT NULL DEFAULT '{}',
  "lastUsed"       TIMESTAMPTZ,
  "status"         TEXT             NOT NULL DEFAULT 'active',  -- active | idle | quarantined
  "createdAt"      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("proxyUrl")
);

-- ──────────────────────────────────────────────
-- Target Patterns (keyword corpus)
-- ──────────────────────────────────────────────
CREATE TABLE "TargetPattern" (
  "id"              TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "keyword"         TEXT             NOT NULL,
  "source"          TEXT             NOT NULL DEFAULT 'seed',   -- seed | learned
  "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "matchCount"      INTEGER          NOT NULL DEFAULT 0,
  "firstSeen"       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "lastMatched"     TIMESTAMPTZ,
  "status"          TEXT             NOT NULL DEFAULT 'active', -- active | archived | pinned | blocked
  "updatedAt"       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("keyword")
);

-- ──────────────────────────────────────────────
-- Agent Registry
-- ──────────────────────────────────────────────
CREATE TABLE "AgentRegistry" (
  "id"          TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "agentId"     TEXT             NOT NULL,
  "userId"      TEXT,
  "projectId"   TEXT,
  "status"      TEXT             NOT NULL DEFAULT 'idle',       -- idle | active | draining | terminated
  "currentJob"  TEXT,
  "currentUrl"  TEXT,
  "pagesScraped" INTEGER         NOT NULL DEFAULT 0,
  "cpuPercent"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startedAt"   TIMESTAMPTZ,
  "heartbeat"   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  "createdAt"   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  UNIQUE ("agentId")
);

-- ──────────────────────────────────────────────
-- Prisma migration tracking (required by Prisma CLI)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                   TEXT        NOT NULL,
  "checksum"             TEXT        NOT NULL,
  "finished_at"          TIMESTAMPTZ,
  "migration_name"       TEXT        NOT NULL,
  "logs"                 TEXT,
  "rolled_back_at"       TIMESTAMPTZ,
  "started_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "applied_steps_count"  INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);
