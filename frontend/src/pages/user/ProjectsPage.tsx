import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/shared/StatusPill';
import type { Project } from '@/types';

const ROBOT_TYPES = [
  {
    key: 'extract',
    title: 'Extract Structured Data',
    desc: "Extract structured data from any website with no code! Download data as a spreadsheet or integrate it with your software using ITAD Intel API.",
    badge: 'Most Popular',
    accent: '#1a9e57',
    accentBg: '#f0fdf4',
    illustration: (
      <div style={{ background: 'linear-gradient(135deg, #1a9e57 0%, #4ade80 100%)', borderRadius: 12, padding: 14, height: 200, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
          <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#fff', opacity: 0.85, fontFamily: 'DM Mono' }}>Spreadsheet</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 7, flex: 1, padding: 8, fontSize: '0.62rem', fontFamily: 'DM Mono', color: 'var(--muted)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 60px 60px', gap: 4, paddingBottom: 4, borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>
            <span>#</span><span>URL</span><span>Pages</span><span>Status</span>
          </div>
          {[
            ['1', 'lacity.gov/bids', '142', 'active'],
            ['2', 'sfgov.org', '89', 'active'],
            ['3', 'austintexas.gov', '12', 'failed'],
            ['4', 'nyc.gov', '0', 'queued'],
            ['5', 'txdot.gov', '67', 'active'],
            ['6', 'lacounty.gov', '34', 'active'],
            ['7', 'glendale.ca.us', '8', 'idle'],
          ].map(([n, u, p, s]) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 60px 60px', gap: 4, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{n}</span><span style={{ color: '#1a9e57' }}>{u}</span><span>{p}</span><span style={{ color: s === 'active' ? '#1a9e57' : s === 'failed' ? '#dc2626' : 'var(--muted)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: 'monitor',
    title: 'Monitor Site Changes',
    desc: 'Monitor your competitors and get notified when they change their website or their listings on other sites.',
    badge: null,
    accent: '#2563eb',
    accentBg: '#eff6ff',
    illustration: (
      <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', borderRadius: 12, padding: 14, height: 200, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
          <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#fff', opacity: 0.85, fontFamily: 'DM Mono' }}>Changes</div>
        </div>
        <div style={{ background: 'var(--bg2)', borderRadius: 7, flex: 1, padding: 8, fontSize: '0.62rem', fontFamily: 'DM Mono', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px', gap: 4, paddingBottom: 4, borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
            <span>Name</span><span>Previous</span><span>New</span><span>Δ</span>
          </div>
          {[
            ['RFP-2026-04', '$3,420', '$3,200', 'down'],
            ['Bid-1402', '$5,100', '$5,500', 'up'],
            ['Surplus-99', '$280', '$340', 'up'],
            ['Auction-22', '$1,210', '$1,210', 'flat'],
            ['Tender-A8', '$890', '$910', 'up'],
            ['RFQ-712', '$3,100', '$2,950', 'down'],
            ['Lot-1420', '$420', '$510', 'up'],
          ].map(([n, prev, nw, d]) => (
            <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px', gap: 4, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{n}</span>
              <span style={{ color: 'var(--muted)' }}>{prev}</span>
              <span>{nw}</span>
              <span style={{ color: d === 'up' ? '#1a9e57' : d === 'down' ? '#dc2626' : 'var(--muted)' }}>{d === 'up' ? '↑' : d === 'down' ? '↓' : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

function BuildNewRobot({ onChoose }: { onChoose: (key: string) => void }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.03em', marginBottom: 10 }}>Build New Robot</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          Select a category below so we can show you more relevant instructions. Regardless of the category you choose, you will be able to enable monitoring after the robot is created.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 880, margin: '0 auto 22px' }}>
        {ROBOT_TYPES.map(t => (
          <div key={t.key} onClick={() => onChoose(t.key)}
            style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s', position: 'relative' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = t.accent; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
            {t.badge && (
              <div style={{ position: 'absolute', top: 14, left: 14, background: '#1a9e57', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, zIndex: 2 }}>
                {t.badge}
              </div>
            )}
            <div style={{ padding: 18 }}>
              {t.illustration}
            </div>
            <div style={{ padding: '4px 22px 22px' }}>
              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.15rem', marginBottom: 9 }}>{t.title}</div>
              <div style={{ fontSize: '0.86rem', color: 'var(--muted)', lineHeight: 1.6 }}>{t.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a9e57', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>Want us to build it for you? Explore managed services options.</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Complex needs or want us to handle everything? <span style={{ color: '#1a9e57', fontWeight: 600, cursor: 'pointer' }}>Book a call</span> to learn more about fully managed services.
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const [mode, setMode] = useState<'list' | 'build' | 'name'>('list');
  const [robotType, setRobotType] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (name: string) => api.post('/projects', { name, robotType }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setMode('list'); setNewName(''); setRobotType(null);
      const newId = res?.data?.id;
      if (newId) navigate(`/app/projects/${newId}`);
    },
  });

  const onChooseRobot = (key: string) => { setRobotType(key); setMode('name'); };

  if (mode === 'build' || (mode === 'list' && projects.length === 0)) {
    return (
      <div style={{ padding: 24 }}>
        {mode === 'build' && (
          <button onClick={() => setMode('list')}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.86rem', marginBottom: 20, padding: 0 }}>
            ← Back to projects
          </button>
        )}
        <BuildNewRobot onChoose={onChooseRobot} />
      </div>
    );
  }

  if (mode === 'name') {
    const chosen = ROBOT_TYPES.find(t => t.key === robotType);
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
        <button onClick={() => setMode('build')}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.86rem', marginBottom: 18, padding: 0 }}>
          ← Back
        </button>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.03em', marginBottom: 8 }}>
          Name your project
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--muted)', marginBottom: 20 }}>
          You picked <strong style={{ color: chosen?.accent }}>{chosen?.title}</strong>. Give your project a name to get started.
        </p>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && newName.trim() && create.mutate(newName.trim())}
          placeholder="e.g., SoCal Government Bids"
          style={{ width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 9, padding: '11px 14px', fontSize: '0.92rem', outline: 'none', fontFamily: 'DM Sans', boxSizing: 'border-box', marginBottom: 14 }}
          autoFocus />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => newName.trim() && create.mutate(newName.trim())} disabled={!newName.trim() || create.isPending}
            style={{ padding: '10px 22px', background: '#1a9e57', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: newName.trim() ? 'pointer' : 'not-allowed', fontSize: '0.88rem', opacity: newName.trim() ? 1 : 0.5 }}>
            {create.isPending ? 'Creating…' : 'Create Project'}
          </button>
          <button onClick={() => { setMode('list'); setRobotType(null); setNewName(''); }}
            style={{ padding: '10px 16px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 9, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.88rem' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>Projects</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 3 }}>Each project groups related websites for scraping.</p>
        </div>
        <button onClick={() => setMode('build')}
          style={{ padding: '8px 18px', background: '#1a9e57', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
          + New Robot
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {projects.map(p => (
          <div key={p.id} onClick={() => navigate(`/app/projects/${p.id}`)}
            style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 22, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1a9e57'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.95rem', marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>Created {new Date(p.createdAt).toLocaleDateString()}</div>
              </div>
              <StatusPill status={p.status} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 14 }}>
              {[['Websites', p.websiteCount, '#2563eb'], ['Total Jobs', p.jobCount, '#1a9e57'], ['Active', p.activeAgents, '#d97706']].map(([l, v, c]) => (
                <div key={l as string} style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.2rem', color: c as string }}>{v as number}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>{l as string}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
