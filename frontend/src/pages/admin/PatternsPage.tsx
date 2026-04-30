import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MiniBar } from '@/components/shared/MiniBar';
import type { TargetPattern } from '@/types';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active:   { bg: '#e4f5ed', text: '#1a9e57' },
  pinned:   { bg: '#ede9fe', text: '#6d28d9' },
  blocked:  { bg: '#fee2e2', text: '#dc2626' },
  archived: { bg: 'var(--bg)', text: '#6b7280' },
};

export function PatternsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: patterns = [] } = useQuery<TargetPattern[]>({
    queryKey: ['admin-patterns'],
    queryFn: () => api.get('/admin/patterns').then(r => r.data),
  });

  const pin = useMutation({
    mutationFn: (id: string) => api.post(`/admin/patterns/${id}/pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-patterns'] }),
  });
  const block = useMutation({
    mutationFn: (id: string) => api.post(`/admin/patterns/${id}/block`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-patterns'] }),
  });

  const globalSeed = patterns.filter(p => p.source === 'seed');
  const aiLearned = patterns.filter(p => p.source === 'learned');
  const decaying = patterns.filter(p => p.confidenceScore < 0.4 && p.source === 'learned' && p.status !== 'blocked');

  const filtered = patterns.filter(p => {
    const matchSearch = p.keyword.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      p.status === filter ||
      (filter === 'learned' && p.source === 'learned') ||
      (filter === 'seed' && p.source === 'seed') ||
      (filter === 'decaying' && p.confidenceScore < 0.4);
    return matchSearch && matchFilter;
  });

  const FILTER_TABS = ['all', 'active', 'pinned', 'blocked', 'seed', 'learned', 'decaying'];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>Keyword Patterns</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Global keyword corpus used for link scoring and page prioritization.</p>
      </div>

      {/* 3 stat cards: GLOBAL(SEED) / AI-LEARNED / DECAYING */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 13, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Global (Seed)</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#1a9e57' }}>{globalSeed.length}</div>
          <div style={{ fontSize: '0.71rem', color: 'var(--muted)', marginTop: 4 }}>permanently active</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>AI-Learned</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#6d28d9' }}>{aiLearned.length}</div>
          <div style={{ fontSize: '0.71rem', color: 'var(--muted)', marginTop: 4 }}>from classifications</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Decaying</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#d97706' }}>{decaying.length}</div>
          <div style={{ fontSize: '0.71rem', color: 'var(--muted)', marginTop: 4 }}>confidence {'<'} 40%</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Total</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: '#2563eb' }}>{patterns.length}</div>
          <div style={{ fontSize: '0.71rem', color: 'var(--muted)', marginTop: 4 }}>all patterns</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {FILTER_TABS.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1.5px solid ${filter === t ? '#1a9e57' : 'var(--border)'}`, background: filter === t ? '#e4f5ed' : 'transparent', color: filter === t ? '#1a9e57' : 'var(--muted)', cursor: 'pointer', fontSize: '0.73rem', fontWeight: 500 }}>
                {t}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search keyword…"
            style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '6px 11px', color: 'var(--text)', fontSize: '0.8rem', outline: 'none', fontFamily: 'DM Mono', width: 180 }} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['Keyword', 'Source', 'Confidence', 'Matches', 'First Seen', 'Last Matched', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const sc = STATUS_COLOR[p.status] ?? STATUS_COLOR.active;
              const confPct = p.confidenceScore * 100;
              const isSeed = p.source === 'seed';
              return (
                <tr key={p.id}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontWeight: 600, fontSize: '0.82rem' }}>{p.keyword}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    {isSeed ? (
                      <span style={{ background: '#e4f5ed', color: '#1a9e57', borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 700 }}>global</span>
                    ) : (
                      <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 700 }}>ai-learned</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', minWidth: 130 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <MiniBar pct={confPct} color={confPct >= 75 ? '#1a9e57' : confPct >= 40 ? '#d97706' : '#dc2626'} />
                      <span style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)', minWidth: 32 }}>{confPct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>{p.matchCount.toLocaleString()}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.73rem' }}>{new Date(p.firstSeen).toLocaleDateString()}</td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.73rem' }}>
                    {p.lastMatched ? new Date(p.lastMatched).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: sc.bg, color: sc.text, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>{p.status}</span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    {!isSeed && (
                      <div style={{ display: 'flex', gap: 5 }}>
                        {p.status !== 'pinned' && (
                          <button onClick={() => pin.mutate(p.id)}
                            style={{ padding: '3px 8px', background: '#ede9fe', border: '1.5px solid #c4b5fd', borderRadius: 5, color: '#6d28d9', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                            Pin
                          </button>
                        )}
                        {p.status !== 'blocked' && (
                          <button onClick={() => block.mutate(p.id)}
                            style={{ padding: '3px 8px', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 5, color: '#dc2626', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                            Block
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>No patterns match your filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
