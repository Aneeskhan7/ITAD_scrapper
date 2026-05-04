import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill, TypePill } from '@/components/shared/StatusPill';
import { ChipInput } from '@/components/shared/ChipInput';
import type { Website, Job, Result } from '@/types';

const PASTEL = ['var(--mint)', 'var(--sky)', 'var(--lavender)', 'var(--yellow)', 'var(--peach)', 'var(--green-bg)'];

export function WebsiteDetailPage() {
  const { projectId, id } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: website } = useQuery<Website>({ queryKey: ['website', id], queryFn: () => api.get(`/websites/${id}`).then(r => r.data) });
  const { data: jobs = [] } = useQuery<Job[]>({ queryKey: ['website-jobs', id], queryFn: () => api.get(`/websites/${id}/jobs`).then(r => r.data) });
  const { data: resultsData } = useQuery({ queryKey: ['website-results', id], queryFn: () => api.get(`/websites/${id}/results?limit=5`).then(r => r.data) });

  const crawl = useMutation({
    mutationFn: () => api.post(`/websites/${id}/crawl`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website', id] }),
  });

  const [editingPatterns, setEditingPatterns] = useState(false);
  const [draftPatterns, setDraftPatterns] = useState<string[]>([]);
  useEffect(() => {
    if (website && !editingPatterns) setDraftPatterns(website.targetPagePatterns ?? []);
  }, [website, editingPatterns]);

  const savePatterns = useMutation({
    mutationFn: (patterns: string[]) =>
      api.patch(`/websites/${id}`, { targetPagePatterns: patterns }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website', id] });
      setEditingPatterns(false);
    },
  });

  const results: Result[] = resultsData?.results ?? [];

  if (!website) return <div style={{ padding: 24, color: 'var(--muted)' }}>Loading…</div>;

  const latestJob = jobs[0];
  const patterns = website.targetPagePatterns ?? [];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/app/projects')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.83rem' }}>← Projects</button>
        <span style={{ color: 'var(--border2)' }}>/</span>
        <button onClick={() => navigate(`/app/projects/${projectId}`)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.83rem' }}>Project</button>
        <span style={{ color: 'var(--border2)' }}>/</span>
        <span style={{ fontFamily: 'DM Mono', fontSize: '0.78rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{website.url}</span>
        <StatusPill status={website.status} />
      </div>

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          Target Page Paths
        </div>
        {editingPatterns ? (
          <>
            <div style={{ flex: 1, minWidth: 280 }}>
              <ChipInput
                value={draftPatterns}
                onChange={setDraftPatterns}
                placeholder="/procurement, /bids — leave empty to crawl all pages"
              />
            </div>
            <button onClick={() => savePatterns.mutate(draftPatterns)} disabled={savePatterns.isPending}
              style={{ padding: '6px 12px', background: 'var(--green)', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.78rem' }}>
              Save
            </button>
            <button onClick={() => { setEditingPatterns(false); setDraftPatterns(patterns); }}
              style={{ padding: '6px 10px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem' }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
              {patterns.length === 0 ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                  No filter — every same-origin page is eligible.
                </span>
              ) : patterns.map(p => (
                <span key={p} style={{ background: 'var(--mint)', color: 'var(--green)', border: '1px solid #bbf7d0', borderRadius: 5, padding: '2px 8px', fontFamily: 'DM Mono', fontSize: '0.74rem', fontWeight: 600 }}>{p}</span>
              ))}
            </div>
            <button onClick={() => setEditingPatterns(true)}
              style={{ padding: '5px 10px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}>
              Edit
            </button>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Pages Scraped" value={website.totalPages} color="#2563eb" />
        <StatCard label="Yield Rate" value={Math.round(website.yieldRate) + '%'} color="#1a9e57" pct={website.yieldRate} />
        <StatCard label="Priority" value={website.priority} color="#d97706" />
        <StatCard label="Last Run" value={website.lastCrawled ? new Date(website.lastCrawled).toLocaleTimeString() : '—'} color="var(--muted)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>Latest Job Log</div>
          {latestJob ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { ev: 'Scrape enqueued', detail: `Depth: ${website.depth} · Budget: ${website.crawlBudget} pages`, t: latestJob.createdAt },
                { ev: 'Job started', detail: `Proxy Tier ${latestJob.proxyTier ?? '—'} assigned`, t: latestJob.startedAt ?? '' },
                { ev: `${latestJob.pagesScraped} pages fetched`, detail: 'Priority scoring applied', t: latestJob.completedAt ?? '' },
                { ev: latestJob.status === 'completed' ? 'Scrape complete' : latestJob.status, detail: latestJob.duration ? `Duration: ${(latestJob.duration / 1000).toFixed(1)}s` : latestJob.errorType ?? '', t: latestJob.completedAt ?? '' },
              ].filter(e => e.t).map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 14, position: 'relative' }}>
                  {i < 3 && <div style={{ position: 'absolute', left: 9, top: 20, bottom: 0, width: 1.5, background: 'var(--border)' }} />}
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: PASTEL[i], border: '1.5px solid var(--border)', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{e.ev}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{e.detail}</div>
                    <div style={{ fontSize: '0.69rem', color: 'var(--muted)', fontFamily: 'DM Mono', marginTop: 2 }}>{e.t ? new Date(e.t).toLocaleTimeString() : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginBottom: 16 }}>No jobs run yet.</p>
          )}
          <button onClick={() => crawl.mutate()} disabled={crawl.isPending || website.status === 'crawling'}
            style={{ width: '100%', marginTop: 4, padding: 9, background: (crawl.isPending || website.status === 'crawling') ? '#9ca3af' : 'var(--green)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
            {(crawl.isPending || website.status === 'crawling') ? 'Crawling…' : '▶ Run Now'}
          </button>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>AI-Classified Discoveries</div>
          {results.map(r => (
            <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title ?? r.url}</div>
                <TypePill type={r.classification} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{r.url}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--green)', flexShrink: 0, marginLeft: 8, fontFamily: 'DM Mono', fontWeight: 600 }}>{(r.confidence * 100).toFixed(0)}%</div>
              </div>
            </div>
          ))}
          {results.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.84rem', textAlign: 'center', padding: '20px 0' }}>Run a crawl to see AI-classified results.</p>}
        </div>
      </div>
    </div>
  );
}
