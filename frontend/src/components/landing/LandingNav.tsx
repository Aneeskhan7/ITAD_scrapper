import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const FEATURES_ITEMS = [
  { icon: '🤖', title: 'AI Page Classifier', desc: 'llama3.2 classifies bid/selling/info pages in <200ms.' },
  { icon: '📊', title: 'Websites to Discoveries', desc: 'Turn government portals into structured bid feeds.' },
  { icon: '🛡️', title: 'Dead-Letter Queue', desc: 'Zero job loss. 3-retry exponential backoff with full DLQ.' },
  { icon: '🔄', title: '3-Tier Proxy Rotation', desc: 'Residential → Datacenter → Rotating with auto-cooldown.' },
  { icon: '🕷️', title: 'Adaptive Web Crawler', desc: 'Playwright + Cheerio with 5-signal link prioritization.' },
  { icon: '🧠', title: 'Self-Learning Patterns', desc: 'Keyword corpus that grows from classified results.' },
  { icon: '📡', title: 'Real-Time Monitor', desc: 'SSE-powered queue depth chart, live agent telemetry.' },
];

const USE_CASES = [
  { icon: '🏛️', title: 'Government Bids', desc: 'Monitor procurement portals & state RFPs reliably.' },
  { icon: '💰', title: 'ITAD Auctions', desc: 'Track surplus equipment auctions & disposal lots.' },
  { icon: '🏢', title: 'Enterprise RFPs', desc: 'Corporate procurement & sealed bid solicitations.' },
  { icon: '🇺🇸', title: 'Federal Contracts', desc: 'SAM.gov & federal opportunity feeds at scale.' },
  { icon: '📍', title: 'State & Municipal', desc: 'County, city, and special-district procurement.' },
  { icon: '⚖️', title: 'Legal Solicitations', desc: 'Tender notices, court bids, and legal filings.' },
  { icon: '🔍', title: 'Explore all use cases', desc: 'See every workflow ITAD Intel supports.' },
];

const RESOURCES = [
  { icon: '📰', title: 'Blog', desc: 'News, tutorials, and engineering deep-dives. Updated weekly.' },
  { icon: '💬', title: 'Talk to Sales', desc: 'Discuss your procurement intelligence needs with experts.' },
  { icon: '❓', title: 'Help Center', desc: 'Get quick answers to your questions.' },
  { icon: '🏛️', title: 'About ITAD Intel', desc: 'Learn more about our story and mission.' },
  { icon: '⚙️', title: 'API Documentation', desc: 'Integrate with or build apps on top of ITAD Intel.' },
  { icon: '🤝', title: 'Affiliate Program', desc: '20% commission for every subscriber you refer. Forever.' },
];

type DropdownKey = 'features' | 'use-cases' | 'resources' | null;

export function LandingNav() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<DropdownKey>(null);
  const closeTimer = useRef<number | null>(null);

  const openMenu = (key: DropdownKey) => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(key);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(null), 120);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6%' }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'var(--text)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#1a9e57', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>I</div>
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>ITAD<span style={{ color: '#1a9e57' }}>Intel</span></span>
      </Link>

      {/* Center nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {/* Features */}
        <div style={{ position: 'relative' }} onMouseEnter={() => openMenu('features')} onMouseLeave={scheduleClose}>
          <button style={{ background: 'none', border: 'none', color: open === 'features' ? '#1a9e57' : 'var(--muted)', fontSize: '0.92rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', fontFamily: 'DM Sans' }}>
            Features <span style={{ fontSize: 10, transition: 'transform 0.15s', transform: open === 'features' ? 'rotate(180deg)' : 'none' }}>▼</span>
          </button>
          {open === 'features' && (
            <div onMouseEnter={() => openMenu('features')} onMouseLeave={scheduleClose}
              style={{ position: 'absolute', top: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.10)', display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 0, padding: 0, width: 880, overflow: 'hidden' }}>
              {/* Two-column items */}
              <div style={{ padding: '24px', gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
                <div style={{ gridColumn: '1 / -1', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>Features</div>
                {FEATURES_ITEMS.map(f => (
                  <div key={f.title} style={{ display: 'flex', gap: 12, padding: '10px 8px', borderRadius: 9, cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7f8f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e4f5ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 2 }}>{f.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Right panel */}
              <div style={{ background: '#f0fdf4', padding: '24px 22px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a9e57', marginBottom: 12 }}>Platform Overview</div>
                <div style={{ background: 'var(--bg2)', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <div style={{ height: 90, background: 'linear-gradient(135deg, #e4f5ed 0%, #bbf7d0 100%)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>📊</div>
                </div>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>Discover bids on autopilot</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
                  Find every government RFP, surplus auction, and procurement opportunity. No coding required.
                </div>
                <button onClick={() => navigate('/register')}
                  style={{ marginTop: 'auto', padding: '10px 0', background: '#1a9e57', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}>
                  Sign up
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Use cases */}
        <div style={{ position: 'relative' }} onMouseEnter={() => openMenu('use-cases')} onMouseLeave={scheduleClose}>
          <button style={{ background: 'none', border: 'none', color: open === 'use-cases' ? '#1a9e57' : 'var(--muted)', fontSize: '0.92rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', fontFamily: 'DM Sans' }}>
            Use cases <span style={{ fontSize: 10, transition: 'transform 0.15s', transform: open === 'use-cases' ? 'rotate(180deg)' : 'none' }}>▼</span>
          </button>
          {open === 'use-cases' && (
            <div onMouseEnter={() => openMenu('use-cases')} onMouseLeave={scheduleClose}
              style={{ position: 'absolute', top: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.10)', padding: '24px', width: 720 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 14 }}>By Data Category</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
                {USE_CASES.map(u => (
                  <div key={u.title} style={{ display: 'flex', gap: 12, padding: '10px 8px', borderRadius: 9, cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7f8f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e4f5ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{u.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 2 }}>{u.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>{u.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resources */}
        <div style={{ position: 'relative' }} onMouseEnter={() => openMenu('resources')} onMouseLeave={scheduleClose}>
          <button style={{ background: 'none', border: 'none', color: open === 'resources' ? '#1a9e57' : 'var(--muted)', fontSize: '0.92rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', fontFamily: 'DM Sans' }}>
            Resources <span style={{ fontSize: 10, transition: 'transform 0.15s', transform: open === 'resources' ? 'rotate(180deg)' : 'none' }}>▼</span>
          </button>
          {open === 'resources' && (
            <div onMouseEnter={() => openMenu('resources')} onMouseLeave={scheduleClose}
              style={{ position: 'absolute', top: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.10)', display: 'grid', gridTemplateColumns: '1fr 1fr 260px', width: 760, overflow: 'hidden' }}>
              <div style={{ padding: '22px', gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 18px' }}>
                <div style={{ gridColumn: '1 / -1', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>Resources</div>
                {RESOURCES.map(r => (
                  <div key={r.title} style={{ display: 'flex', gap: 10, padding: '8px 6px', borderRadius: 9, cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7f8f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#e4f5ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{r.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600, marginBottom: 1 }}>{r.title}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.45 }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#f0fdf4', padding: '22px 20px', borderLeft: '1px solid var(--border)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1a9e57', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>
                  <span style={{ color: '#fff' }}>📞</span>
                </div>
                <div style={{ fontFamily: 'Space Grotesk', fontSize: '1rem', fontWeight: 700, marginBottom: 10 }}>Book a consultation call</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>If you're looking for:</div>
                <ul style={{ listStyle: 'disc', paddingLeft: 18, marginBottom: 16 }}>
                  {['Dedicated scraping services', 'Customized data pipelines', 'Complex use case', 'Highly scaled use case'].map(b => (
                    <li key={b} style={{ fontSize: '0.79rem', color: 'var(--muted)', lineHeight: 1.6 }}>{b}</li>
                  ))}
                </ul>
                <button style={{ width: '100%', padding: '10px 0', background: '#1a9e57', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>
                  Book a call with sales
                </button>
              </div>
            </div>
          )}
        </div>

        <Link to="/pricing" style={{ color: 'var(--muted)', fontSize: '0.92rem', fontWeight: 500, textDecoration: 'none', padding: '6px 0', fontFamily: 'DM Sans' }}>
          Pricing
        </Link>
      </div>

      {/* Right CTAs */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Link to="/login" style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', padding: '7px 14px' }}>
          Login
        </Link>
        <button onClick={() => navigate('/register')}
          style={{ padding: '9px 22px', background: '#1a9e57', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>
          Get started for free
        </button>
      </div>
    </nav>
  );
}
