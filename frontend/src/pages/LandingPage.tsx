import { useNavigate } from 'react-router-dom';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

const STATS_BAR = [
  { val: '99.8%', label: 'Uptime SLA' },
  { val: '3-Tier', label: 'Proxy Resilience' },
  { val: '0', label: 'DLQ Jobs Lost' },
  { val: '<200ms', label: 'AI Classification' },
  { val: '50+', label: 'Concurrent Agents' },
];

const CAPABILITIES = [
  { phase: 'Phase 1', icon: '🕷️', title: 'Adaptive Web Crawler', desc: 'Playwright + Cheerio with 5-signal link prioritization. Scores every discovered link before crawling to maximize bid-page yield.' },
  { phase: 'Phase 1', icon: '🤖', title: 'AI Page Classification', desc: 'Local llama3.2 classifies every scraped page as bidding, selling, informational, or irrelevant — in under 200ms, fully offline.' },
  { phase: 'Phase 1', icon: '🛡️', title: 'Zero Job Loss DLQ', desc: 'BullMQ with 3-retry exponential backoff. Every failure lands in a persisted Dead-Letter Queue for manual triage or auto-retry.' },
  { phase: 'Phase 1', icon: '🔄', title: '3-Tier Proxy Rotation', desc: 'Residential → Datacenter → Rotating pools. Automatic health monitoring, cooldown management, and per-domain block detection.' },
  { phase: 'Phase 2', icon: '🧠', title: 'Self-Learning Patterns', desc: 'Pattern learner worker extracts new procurement terms from high-confidence results and promotes them into the global keyword corpus.' },
  { phase: 'Phase 2', icon: '📡', title: 'Real-Time Monitoring', desc: 'SSE-powered live queue depth chart, per-agent CPU tracking, and instant DLQ alerts — all without polling.' },
];

const PIPELINE = ['Discover', 'Score', 'Crawl', 'Classify', 'Surface'];

const ROADMAP = [
  { phase: 'Phase 1', label: 'MVP', color: '#1a9e57', bg: '#e4f5ed', items: ['Adaptive crawler', 'AI classification', 'DLQ + retries', '3-tier proxies', 'Live monitor', 'Keyword corpus'] },
  { phase: 'Phase 2', label: 'Intelligence', color: '#2563eb', bg: '#dbeafe', items: ['Pattern learning', 'Auto-scaling agents', 'Per-domain accuracy', 'Shadow/Advisory AI', 'Webhook alerts', 'Export API'] },
  { phase: 'Phase 3', label: 'Scale', color: '#7c3aed', bg: '#ede9fe', items: ['Multi-region workers', 'Custom AI models', 'White-label portal', 'Enterprise SSO', 'Audit logs', 'Dedicated infra'] },
];

const STACK = [
  { cat: 'Frontend', items: 'React 18 · Vite · TanStack Query · Zustand' },
  { cat: 'Backend', items: 'Node.js · Express 5 · Prisma ORM' },
  { cat: 'Database', items: 'PostgreSQL 16 · Redis 7' },
  { cat: 'Queue', items: 'BullMQ · Redis Streams' },
  { cat: 'Scraper', items: 'Playwright · Cheerio · Proxy Rotation' },
  { cat: 'AI', items: 'Ollama · llama3.2 · Local inference' },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>

      <LandingNav />

      {/* Hero */}
      <section style={{ padding: '90px 60px 60px', textAlign: 'center', maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#e4f5ed', border: '1px solid #bbf7d0', borderRadius: 20, padding: '5px 16px', fontSize: '0.76rem', color: '#1a9e57', fontWeight: 700, marginBottom: 28, letterSpacing: '0.02em' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a9e57', display: 'inline-block' }} />
          Phase 1 · MVP Now Available
        </div>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '3.4rem', lineHeight: 1.08, letterSpacing: '-0.04em', marginBottom: 22 }}>
          ITAD Intelligence<br />
          <span style={{ color: '#1a9e57' }}>Platform</span>
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: 36, maxWidth: 580, margin: '0 auto 36px' }}>
          AI-powered web scraping for ITAD procurement intelligence. Automatically discovers bidding and selling opportunities across government portals and enterprise procurement boards.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 18 }}>
          <button onClick={() => navigate('/register')}
            style={{ padding: '13px 32px', background: '#1a9e57', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.96rem' }}>
            Get Started Free →
          </button>
          <button onClick={() => navigate('/login')}
            style={{ padding: '13px 28px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontWeight: 500, cursor: 'pointer', fontSize: '0.96rem' }}>
            Sign In
          </button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>No credit card required · Runs fully local with Ollama</p>
      </section>

      {/* Stats Bar */}
      <section style={{ background: '#0f1923', padding: '28px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 60, flexWrap: 'wrap' }}>
          {STATS_BAR.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#1a9e57', marginBottom: 3 }}>{s.val}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard Mockup */}
      <section style={{ padding: '70px 60px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.03em', marginBottom: 10 }}>Everything in one view</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Real-time queue monitoring, project management, and AI classification results.</p>
          </div>
          {/* Browser frame mockup */}
          <div style={{ border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--bg)', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
            {/* Browser chrome */}
            <div style={{ background: '#f1f3f4', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#27c93f' }} />
              </div>
              <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', color: '#6b7280', fontFamily: 'DM Mono', border: '1px solid var(--border)' }}>
                app.itadintel.io/app
              </div>
            </div>
            {/* App mockup content */}
            <div style={{ display: 'flex', height: 340 }}>
              {/* Sidebar */}
              <div style={{ width: 180, background: 'var(--bg2)', borderRight: '1px solid var(--border)', padding: '16px 0' }}>
                {['Overview', 'Projects', 'Discoveries', 'DLQ', 'Keywords', 'Settings'].map((item, i) => (
                  <div key={item} style={{ padding: '8px 18px', fontSize: '0.78rem', fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#1a9e57' : 'var(--muted)', background: i === 0 ? '#e4f5ed' : 'transparent', marginBottom: 2, borderLeft: i === 0 ? '2px solid #1a9e57' : '2px solid transparent' }}>
                    {item}
                  </div>
                ))}
              </div>
              {/* Main area */}
              <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { l: 'Total Jobs', v: '12,847', c: '#1a9e57' },
                    { l: 'Active Agents', v: '8 / 20', c: '#2563eb' },
                    { l: 'DLQ Events', v: '3', c: '#d97706' },
                    { l: 'Yield Rate', v: '73%', c: '#1a9e57' },
                  ].map(c => (
                    <div key={c.l} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', color: c.c }}>{c.v}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 2 }}>{c.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 10 }}>
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: 8, fontFamily: 'Space Grotesk' }}>Recent Discoveries</div>
                    {[
                      { t: 'RFP — IT Asset Disposal Q1 2025', type: 'bidding', conf: '0.97' },
                      { t: 'Surplus Equipment Auction — State Dept.', type: 'selling', conf: '0.91' },
                      { t: 'ITAD Services Solicitation #2025-001', type: 'bidding', conf: '0.95' },
                    ].map(r => (
                      <div key={r.t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.71rem' }}>
                        <span style={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{r.t}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ background: r.type === 'bidding' ? '#e4f5ed' : '#fef3c7', color: r.type === 'bidding' ? '#1a9e57' : '#d97706', borderRadius: 4, padding: '1px 6px', fontSize: '0.67rem', fontWeight: 600 }}>{r.type}</span>
                          <span style={{ fontFamily: 'DM Mono', fontSize: '0.67rem', color: '#1a9e57' }}>{r.conf}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: 10, fontFamily: 'Space Grotesk' }}>Queue Health</div>
                    {[
                      { l: 'Pending', v: 23, c: '#d97706', pct: 46 },
                      { l: 'Processing', v: 8, c: '#2563eb', pct: 40 },
                      { l: 'Completed', v: 841, c: '#1a9e57', pct: 100 },
                    ].map(q => (
                      <div key={q.l} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.67rem', color: 'var(--muted)', marginBottom: 3 }}>
                          <span>{q.l}</span><span style={{ color: q.c, fontFamily: 'DM Mono' }}>{q.v}</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${q.pct}%`, background: q.c, borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section id="features" style={{ padding: '80px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: 10 }}>Platform Capabilities</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Production-grade components built for scale, resilience, and intelligence.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {CAPABILITIES.map(c => (
            <div key={c.title} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1a9e57'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
              style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden', transition: 'border-color 0.15s, transform 0.15s', cursor: 'default' }}>
              <div style={{ position: 'absolute', top: 16, right: 16 }}>
                <span style={{ fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 4, background: c.phase === 'Phase 1' ? '#e4f5ed' : '#ede9fe', color: c.phase === 'Phase 1' ? '#1a9e57' : '#6d28d9' }}>{c.phase}</span>
              </div>
              <div style={{ fontSize: '1.9rem', marginBottom: 14 }}>{c.icon}</div>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.95rem', marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.65 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline + Roadmap */}
      <section style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '70px 60px' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          {/* Pipeline */}
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.03em', marginBottom: 10 }}>Crawl-to-Classification Pipeline</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 36 }}>From seed URL to classified procurement result in seconds.</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
              {PIPELINE.map((step, i) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: i === 2 ? '#1a9e57' : i === 3 ? '#1d4ed8' : 'var(--bg)', border: `2px solid ${i === 2 ? '#1a9e57' : i === 3 ? '#1d4ed8' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: i >= 2 ? '#fff' : 'var(--muted)' }}>
                      {['🔗', '⚖️', '🕷️', '🤖', '📊'][i]}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: i === 2 ? '#1a9e57' : i === 3 ? '#1d4ed8' : 'var(--muted)', whiteSpace: 'nowrap' }}>{step}</span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div style={{ width: 60, height: 2, background: 'var(--border)', margin: '0 4px', marginBottom: 24 }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Roadmap */}
          <div>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.03em', marginBottom: 8 }}>Phased Roadmap</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Built in phases — ship value early, layer intelligence later.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
              {ROADMAP.map((r, i) => (
                <div key={r.phase} style={{ border: `1.5px solid ${r.color}22`, borderRadius: 14, padding: 22, background: r.bg + '44', position: 'relative', overflow: 'hidden' }}>
                  {i === 0 && (
                    <div style={{ position: 'absolute', top: 14, right: 14, background: '#1a9e57', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.03em' }}>CURRENT</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ background: r.color, color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 5, letterSpacing: '0.04em' }}>{r.phase}</span>
                    <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.92rem', color: r.color }}>{r.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {r.items.map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: i === 0 ? 'var(--text)' : 'var(--muted)' }}>
                        <span style={{ color: r.color, fontWeight: 700, fontSize: '0.8rem' }}>{i === 0 ? '✓' : '◦'}</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="stack" style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', padding: '60px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 42 }}>
            <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.03em', marginBottom: 8 }}>Built on the modern stack</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Every component chosen for reliability, performance, and developer experience.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {STACK.map(s => (
              <div key={s.cat} style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: '0.71rem', fontWeight: 700, color: '#1a9e57', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>{s.cat}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>{s.items}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA */}
      <section style={{ background: '#0f1923', padding: '80px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(26,158,87,0.15)', border: '1px solid rgba(26,158,87,0.3)', borderRadius: 20, padding: '5px 16px', fontSize: '0.76rem', color: '#1a9e57', fontWeight: 700, marginBottom: 28 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a9e57', display: 'inline-block' }} />
            Free to start. No card required.
          </div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '-0.04em', color: '#fff', marginBottom: 18, lineHeight: 1.1 }}>
            Start finding procurement intelligence today
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.94rem', lineHeight: 1.6, marginBottom: 36 }}>
            Deploy in minutes. Add websites, let the AI do the work. Every bid page surfaced, classified, and organized — automatically.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => navigate('/register')}
              style={{ padding: '13px 34px', background: '#1a9e57', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.96rem' }}>
              Create Free Account →
            </button>
            <button onClick={() => navigate('/login')}
              style={{ padding: '13px 28px', background: 'transparent', border: '1.5px solid #374151', borderRadius: 10, color: '#9ca3af', fontWeight: 500, cursor: 'pointer', fontSize: '0.96rem' }}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
