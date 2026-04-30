import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MiniBar } from '@/components/shared/MiniBar';
import type { TargetPattern } from '@/types';

const PROMOTION_THRESHOLD = 0.75;

export function KeywordsPage() {
  const { data: patterns = [] } = useQuery<TargetPattern[]>({
    queryKey: ['patterns'],
    queryFn: () => api.get('/patterns').then(r => r.data),
  });

  const active = patterns.filter(p => p.status === 'active' || p.status === 'pinned');
  const learned = patterns.filter(p => p.source === 'learned');
  const decaying = patterns.filter(p => p.confidenceScore < 0.4 && p.status !== 'blocked');

  const STATUS_PILL: Record<string, { bg: string; color: string }> = {
    active:   { bg: '#e4f5ed', color: '#1a9e57' },
    pinned:   { bg: '#ede9fe', color: '#6d28d9' },
    blocked:  { bg: '#fee2e2', color: '#dc2626' },
    archived: { bg: 'var(--bg)', color: '#6b7280' },
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>Keyword Corpus</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Patterns used to identify and prioritize bid/procurement pages.</p>
      </div>

      {/* 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Active Keywords</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.7rem', color: '#1a9e57' }}>{active.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>seed + pinned</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>AI-Learned</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.7rem', color: '#6d28d9' }}>{learned.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>from classifications</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Decaying</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.7rem', color: '#d97706' }}>{decaying.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>confidence {'<'} 40%</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Promotion Threshold</div>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.7rem', color: '#2563eb' }}>{PROMOTION_THRESHOLD}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>min confidence score</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>All Patterns ({patterns.length})</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['Keyword', 'Source', 'Confidence', 'Matches', 'Last Match', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patterns.map(p => {
              const sp = STATUS_PILL[p.status] ?? STATUS_PILL.active;
              const confPct = p.confidenceScore * 100;
              return (
                <tr key={p.id}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.8rem', fontWeight: 600 }}>
                    {p.keyword}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    {p.source === 'seed' ? (
                      <span style={{ background: '#e4f5ed', color: '#1a9e57', borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>global</span>
                    ) : (
                      <span style={{ background: '#ede9fe', color: '#6d28d9', borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>ai-learned</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', minWidth: 130 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MiniBar pct={confPct} color={confPct >= 75 ? '#1a9e57' : confPct >= 40 ? '#d97706' : '#dc2626'} />
                      <span style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--muted)', minWidth: 32 }}>{confPct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>
                    {p.matchCount.toLocaleString()}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.74rem' }}>
                    {p.lastMatched ? new Date(p.lastMatched).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: sp.bg, color: sp.color, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>{p.status}</span>
                  </td>
                </tr>
              );
            })}
            {patterns.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>No patterns loaded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
