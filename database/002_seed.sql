-- ITAD Intelligence SaaS — Seed Data
-- Run AFTER 001_initial_schema.sql
-- Replace the placeholder password hash below before running in production.
-- Hash below is bcrypt for password: Admin@123456
-- Generate your own with: node -e "require('bcrypt').hash('YourPassword',12).then(console.log)"

-- ── Admin User ────────────────────────────────
INSERT INTO "User" ("id","email","passwordHash","name","role","plan","computeBudget","status")
VALUES (
  'admin-seed-001',
  'scrapperadmin@gmail.com',
  '$2b$12$hkUy4e4mdhIMq0nq3F4PwuaEYG5syiHErvx6ANxgjk7EQjv3br0TS',  -- admin123
  'Admin',
  'admin',
  'enterprise',
  100,
  'active'
) ON CONFLICT ("email") DO NOTHING;

-- ── Demo User ─────────────────────────────────
-- Hash below is bcrypt for password: Demo@123456
INSERT INTO "User" ("id","email","passwordHash","name","role","plan","computeBudget","status")
VALUES (
  'demo-user-001',
  'john@itadintel.io',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC.oXiB8p/lJkKHxM6Xu',  -- Demo@123456
  'John Demo',
  'user',
  'pro',
  20,
  'active'
) ON CONFLICT ("email") DO NOTHING;

-- ── Keyword Corpus (Seed) ─────────────────────
INSERT INTO "TargetPattern" ("keyword","source","confidenceScore","matchCount","status")
VALUES
  ('bid',             'seed', 0.95, 0, 'pinned'),
  ('rfp',             'seed', 0.95, 0, 'pinned'),
  ('rfq',             'seed', 0.95, 0, 'pinned'),
  ('tender',          'seed', 0.92, 0, 'pinned'),
  ('solicitation',    'seed', 0.90, 0, 'active'),
  ('procurement',     'seed', 0.88, 0, 'active'),
  ('auction',         'seed', 0.85, 0, 'active'),
  ('surplus',         'seed', 0.82, 0, 'active'),
  ('itad',            'seed', 0.99, 0, 'pinned'),
  ('disposal',        'seed', 0.80, 0, 'active')
ON CONFLICT ("keyword") DO NOTHING;

-- ── Proxy Pool ────────────────────────────────
INSERT INTO "ProxyHealth" ("proxyUrl","tier","proxyType","ipDisplay","successRate","status")
VALUES
  ('http://proxy-t1-us-east-1:8080',  1, 'residential', '104.28.x.x',  0.97, 'active'),
  ('http://proxy-t1-us-west-1:8080',  1, 'residential', '172.64.x.x',  0.94, 'active'),
  ('http://proxy-t1-eu-west-1:8080',  1, 'residential', '198.41.x.x',  0.96, 'active'),
  ('http://proxy-t2-us-east-1:8080',  2, 'datacenter',  '45.90.x.x',   0.88, 'active'),
  ('http://proxy-t2-us-west-1:8080',  2, 'datacenter',  '162.159.x.x', 0.85, 'active'),
  ('http://proxy-t2-eu-central:8080', 2, 'datacenter',  '188.114.x.x', 0.82, 'active'),
  ('http://proxy-t3-rotate-1:8080',   3, 'rotating',    '141.101.x.x', 0.74, 'idle'),
  ('http://proxy-t3-rotate-2:8080',   3, 'rotating',    '108.162.x.x', 0.70, 'idle')
ON CONFLICT ("proxyUrl") DO NOTHING;

-- ── Agent Registry ────────────────────────────
INSERT INTO "AgentRegistry" ("agentId","status","pagesScraped","cpuPercent")
VALUES
  ('agent-worker-01', 'idle', 1240, 0),
  ('agent-worker-02', 'idle',  987, 0),
  ('agent-worker-03', 'idle', 2103, 0),
  ('agent-worker-04', 'idle',  456, 0),
  ('agent-worker-05', 'idle',  789, 0),
  ('agent-worker-06', 'idle', 1567, 0),
  ('agent-worker-07', 'idle',  234, 0),
  ('agent-worker-08', 'idle', 3201, 0)
ON CONFLICT ("agentId") DO NOTHING;
