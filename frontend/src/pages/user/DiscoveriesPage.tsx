import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TypePill } from '@/components/shared/StatusPill';
import type { Result } from '@/types';

export function DiscoveriesPage() {
  const [filter, setFilter] = useState('all');
  const { data } = useQuery({ queryKey: ['results', filter], queryFn: () => api.get(`/results?limit=50${filter !== 'all' ? `&type=${filter}` : ''}`).then(r => r.data) });
  const results: Result[] = data?.results ?? [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>Discoveries</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 3 }}>AI-classified bidding and selling pages found by your agents.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'bidding', 'selling'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${filter === f ? 'var(--green)' : 'var(--border)'}`, background: filter === f ? 'var(--mint)' : 'transparent', color: filter === f ? 'var(--green)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(r => (
          <div key={r.id}
            style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: 18, display: 'flex', gap: 14, alignItems: 'center', transition: 'border-color 0.15s, transform 0.15s', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--green)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: r.classification === 'bidding' ? 'var(--mint)' : 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {r.classification === 'bidding' ? '📋' : '💰'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, marginBottom: 3, fontSize: '0.875rem' }}>{r.title ?? r.url}</div>
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.74rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.url}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
              <TypePill type={r.classification} />
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: '0.71rem', color: 'var(--green)', fontFamily: 'DM Mono', fontWeight: 600 }}>AI: {(r.confidence * 100).toFixed(0)}%</span>
                <span style={{ fontSize: '0.71rem', color: 'var(--muted)' }}>{new Date(r.foundAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔍</div>
            <p style={{ fontWeight: 500, marginBottom: 8 }}>No discoveries yet</p>
            <p style={{ fontSize: '0.84rem' }}>Run crawls on your websites to find bidding and selling pages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
