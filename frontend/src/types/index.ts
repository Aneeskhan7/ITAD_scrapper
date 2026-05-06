export interface User {
  id: string; name: string; email: string; role: string; plan: string;
  computeBudget: number; status: string; createdAt: string;
}

export interface Project {
  id: string; name: string; description?: string; status: string;
  websiteCount: number; dlqCount: number; activeAgents: number; jobCount: number;
  lastActive?: string; createdAt: string;
}

export interface Website {
  id: string; projectId: string; url: string; depth: number; crawlBudget: number;
  schedule?: string; status: string; priority: string; targetPagePatterns: string[];
  lastCrawled?: string; totalPages: number; yieldRate: number; createdAt: string;
}

export interface Job {
  id: string; websiteId: string; url: string; status: string; retries: number;
  proxyTier?: number; errorType?: string; pagesScraped: number;
  duration?: number; startedAt?: string; completedAt?: string; createdAt: string;
}

export interface Result {
  id: string; websiteId: string; projectId: string; url: string; title?: string;
  classification: string; confidence: number; reason?: string; foundAt: string;
}

export interface DlqEvent {
  id: string; projectId: string; websiteId: string; url: string; errorType: string;
  status: string; payload?: Record<string, unknown>; createdAt: string;
  project?: { name: string }; user?: { name: string };
}

export interface ProxyHealth {
  id: string; proxyUrl: string; tier: number; proxyType: string; ipDisplay: string;
  successRate: number; totalRequests: number; cooldownUntil?: string;
  blockedDomains: string[]; lastUsed?: string; status: string;
}

export interface TargetPattern {
  id: string; keyword: string; source: string; confidenceScore: number;
  matchCount: number; firstSeen: string; lastMatched?: string; status: string;
}

export interface KeywordHit {
  id: string;
  watchKeywordId: string;
  userId: string;
  websiteId: string;
  projectId: string;
  resultId: string | null;
  pageUrl: string;
  pageTitle: string | null;
  matchedText: string;
  context: string;
  position: number;
  status: string;
  notifiedInApp: boolean;
  notifiedEmail: boolean;
  foundAt: string;
  watchKeyword?: { keyword: string; matchMode: string; caseSensitive: boolean };
}

export interface HitStats {
  newLast24h: number;
  totalLast30d: number;
  totalRelevant: number;
  topKeyword: string;
  byKeyword: Array<{ keyword: string; hitCount: number }>;
}

export interface WatchKeyword {
  id: string;
  userId: string;
  projectId: string;
  websiteId: string | null;
  keyword: string;
  matchMode: 'contains' | 'exact' | 'regex' | 'fuzzy';
  caseSensitive: boolean;
  status: string;
  hitCount: number;
  lastHitAt: string | null;
  createdAt: string;
  project?: { name: string };
  website?: { url: string } | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface AgentRegistry {
  id: string; agentId: string; userId?: string; projectId?: string; status: string;
  currentJobId?: string; currentUrl?: string; pagesScraped: number; jobsCompleted: number;
  cpuPercent: number; errorCount: number; startedAt?: string; lastHeartbeat?: string;
  heartbeat?: string;
}
