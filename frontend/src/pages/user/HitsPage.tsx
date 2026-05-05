import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { KeywordHit, HitStats, WatchKeyword } from '@/types';

const MODE_COLORS: Record<string, { bg: string; color: string }> = {
  contains: { bg: '#e4f5ed', color: '#1a9e57' },
  exact:    { bg: '#ede9fe', color: '#6d28d9' },
  regex:    { bg: '#fef3c7', color: '#92400e' },
  fuzzy:    { bg: '#e0f2fe', color: '#0369a1' },
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  new:       { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  relevant:  { bg: '#e4f5ed', color: '#1a9e57', border: '#bbf7d0' },
  dismissed: { bg: 'var(--bg)', color: 'var(--muted)', border: 'var(--border)' },
};

function HighlightedSnippet({ context, matchedText, caseSensitive }: { context: string; matchedText: string; caseSensitive: boolean }) {
  const idx = caseSensitive
    ? context.indexOf(matchedText)
    : context.toLowerCase().indexOf(matchedText.toLowerCase());

  if (idx === -1) return <span style={{ fontSize: '0.81rem', color: 'var(--muted)', lineHeight: 1.6 }}>{context}</span>;

  return (
    <span style={{ fontSize: '0.81rem', color: 'var(--muted)', lineHeight: 1.6 }}>
      {context.slice(0, idx)}
      <mark style={{ background: '#fef08a', color: '#713f12', padding: '1px 3px', borderRadius: 3, fontWeight: 600 }}>
        {context.slice(idx, idx + matchedText.length)}
      </mark>
      {context.slice(idx + matchedText.length)}
    </span>
  );
}

export function HitsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('new');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ limit: '50', page: String(page) });
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (keywordFilter) params.set('keywordId', keywordFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['hits', statusFilter, keywordFilter, page],
    queryFn: () => api.get(`/hits?${params}`).then(r => r.data) as Promise<{ hits: KeywordHit[]; total: number; pages: number }>,
  });

  const { data: stats } = useQuery<HitStats>({
    queryKey: ['hits-stats'],
    queryFn: () => api.get('/hits/stats').then(r => r.data),
  });

  const { data: keywords = [] } = useQuery<WatchKeyword[]>({
    queryKey: ['keywords'],
    queryFn: () => api.get('/keywords').then(r => r.data),
  });

  const markRelevant = useMutation({
    mutationFn: (id: string) => api.post(`/hits/${id}/mark-relevant`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hits'] }); qc.invalidateQueries({ queryKey: ['hits-stats'] }); },
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => api.post(`/hits/${id}/dismiss`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hits'] }); qc.invalidateQueries({ queryKey: ['hits-stats'] }); },
  });

  const hits = data?.hits ?? [];
  const totalPages = data?.pages ?? 1;

  function changeFilter(f: string) { setStatusFilter(f); setPage(1); }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>Keyword Hits</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 3 }}>Pages where your watch keywords matched during crawls.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'New (24h)', value: stats?.newLast24h ?? 0, color: '#d97706', sub: 'awaiting review' },
          { label: 'Total (30d)', value: stats?.totalLast30d ?? 0, color: '#2563eb', sub: 'last 30 days' },
          { label: 'Marked Relevant', value: stats?.totalRelevant ?? 0, color: '#1a9e57', sub: 'confirmed useful' },
          { label: 'Top Keyword', value: stats?.topKeyword ?? '—', color: '#7c3aed', sub: stats?.byKeyword?.[0] ? `${stats.byKeyword[0].hitCount} hits` : 'no hits yet', mono: true },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: (c as any).mono ? 'DM Mono' : 'Space Grotesk', fontWeight: 800, fontSize: typeof c.value === 'string' ? '1rem' : '1.7rem', color: c.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {(['new', 'relevant', 'dismissed', 'all'] as const).map(f => (
            <button key={f} onClick={() => changeFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${statusFilter === f ? 'var(--green)' : 'var(--border)'}`, background: statusFilter === f ? 'var(--mint)' : 'transparent', color: statusFilter === f ? 'var(--green)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
              {f}
              {f === 'new' && (stats?.newLast24h ?? 0) > 0 && (
                <span style={{ marginLeft: 5, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: '0.65rem', fontWeight: 700 }}>
                  {stats!.newLast24h}
                </span>
              )}
            </button>
          ))}
        </div>

        {keywords.length > 0 && (
          <select value={keywordFilter} onChange={e => { setKeywordFilter(e.target.value); setPage(1); }}
            style={{ padding: '6px 10px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '0.8rem', fontFamily: 'DM Sans', outline: 'none', cursor: 'pointer' }}>
            <option value="">All keywords</option>
            {keywords.map(k => <option key={k.id} value={k.id}>{k.keyword}</option>)}
          </select>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '0.76rem', color: 'var(--muted)', fontFamily: 'DM Mono' }}>
          {data?.total ?? 0} total
        </span>
      </div>

      {/* Hit cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: '0.84rem' }}>Loading hits…</div>
        )}

        {!isLoading && hits.map(hit => {
          const kw = hit.watchKeyword;
          const mc = MODE_COLORS[kw?.matchMode ?? 'contains'];
          const sc = STATUS_COLORS[hit.status] ?? STATUS_COLORS.new;
          const isPending = markRelevant.isPending || dismiss.isPending;

          return (
            <div key={hit.id}
              style={{ background: 'var(--bg2)', border: `1.5px solid var(--border)`, borderRadius: 12, padding: 18, transition: 'border-color 0.15s, transform 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--green)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>

              {/* Top row: keyword chip + status + date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ background: mc.bg, color: mc.color, borderRadius: 6, padding: '2px 9px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'DM Mono' }}>
                  {kw?.keyword ?? hit.matchedText}
                </span>
                <span style={{ background: mc.bg, color: mc.color, borderRadius: 5, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 600 }}>
                  {kw?.matchMode}
                </span>
                <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 5, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 600 }}>
                  {hit.status}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: '0.73rem', color: 'var(--muted)' }}>
                  {new Date(hit.foundAt).toLocaleString()}
                </span>
              </div>

              {/* Page title + URL */}
              <div style={{ marginBottom: 10 }}>
                {hit.pageTitle && (
                  <a href={hit.pageUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', textDecoration: 'none', display: 'block', marginBottom: 3 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
                    {hit.pageTitle}
                  </a>
                )}
                <a href={hit.pageUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'DM Mono', fontSize: '0.73rem', color: 'var(--muted)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                  {hit.pageUrl}
                </a>
              </div>

              {/* Context snippet with highlight */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontFamily: 'DM Mono' }}>
                <HighlightedSnippet
                  context={hit.context}
                  matchedText={hit.matchedText}
                  caseSensitive={kw?.caseSensitive ?? false}
                />
              </div>

              {/* Actions */}
              {hit.status === 'new' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => markRelevant.mutate(hit.id)} disabled={isPending}
                    style={{ padding: '6px 14px', background: 'var(--mint)', border: '1.5px solid #bbf7d0', borderRadius: 7, color: 'var(--green)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, opacity: isPending ? 0.6 : 1 }}>
                    ✓ Mark Relevant
                  </button>
                  <button onClick={() => dismiss.mutate(hit.id)} disabled={isPending}
                    style={{ padding: '6px 14px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 7, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, opacity: isPending ? 0.6 : 1 }}>
                    ✕ Dismiss
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty states */}
        {!isLoading && hits.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>
              {statusFilter === 'new' ? '🎯' : statusFilter === 'relevant' ? '✓' : statusFilter === 'dismissed' ? '✕' : '⬌'}
            </div>
            <p style={{ fontWeight: 500, marginBottom: 8 }}>
              {statusFilter === 'new' && 'No new hits'}
              {statusFilter === 'relevant' && 'No relevant hits yet'}
              {statusFilter === 'dismissed' && 'No dismissed hits'}
              {statusFilter === 'all' && 'No hits yet'}
            </p>
            <p style={{ fontSize: '0.84rem' }}>
              {statusFilter === 'new' ? 'Your keywords are scanning. Run a crawl to find matches.' : 'Hits will appear here after crawls run.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'transparent', color: page === 1 ? 'var(--muted)' : 'var(--text)', cursor: page === 1 ? 'default' : 'pointer', fontSize: '0.8rem' }}>
            ← Prev
          </button>
          <span style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--muted)' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1.5px solid var(--border)', background: 'transparent', color: page === totalPages ? 'var(--muted)' : 'var(--text)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '0.8rem' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
