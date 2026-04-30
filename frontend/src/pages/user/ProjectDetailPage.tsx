import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StatCard } from '@/components/shared/StatCard';
import { StatusPill } from '@/components/shared/StatusPill';
import type { Project, Website } from '@/types';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');

  const { data: project } = useQuery<Project>({ queryKey: ['project', id], queryFn: () => api.get(`/projects/${id}`).then(r => r.data) });
  const { data: websites = [] } = useQuery<Website[]>({ queryKey: ['websites', id], queryFn: () => api.get(`/websites/project/${id}`).then(r => r.data) });

  const addWebsite = useMutation({
    mutationFn: (url: string) => api.post(`/websites/project/${id}`, { url }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['websites', id] }); setShowAdd(false); setNewUrl(''); },
  });

  const crawl = useMutation({
    mutationFn: (wid: string) => api.post(`/websites/${wid}/crawl`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['websites', id] }),
  });

  const filtered = websites.filter(w => w.url.includes(search));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button onClick={() => navigate('/app/projects')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.83rem' }}>← Projects</button>
        <span style={{ color: 'var(--border2)' }}>/</span>
        <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem' }}>{project?.name}</span>
        {project && <StatusPill status={project.status} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Websites" value={websites.length} color="#2563eb" />
        <StatCard label="Active Now" value={websites.filter(w => w.status === 'crawling').length} color="#1a9e57" />
        <StatCard label="Total Pages" value={websites.reduce((s, w) => s + w.totalPages, 0)} color="#2563eb" />
        <StatCard label="Avg Yield" value={Math.round(websites.filter(w => w.yieldRate > 0).reduce((s, w) => s + w.yieldRate, 0) / (websites.filter(w => w.yieldRate > 0).length || 1)) + '%'} color="#d97706" />
      </div>

      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem' }}>Websites ({websites.length})</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter…"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '6px 11px', color: 'var(--text)', fontSize: '0.8rem', outline: 'none', fontFamily: 'DM Sans', width: 160 }} />
            <button onClick={() => setShowAdd(!showAdd)}
              style={{ padding: '7px 14px', background: 'var(--green)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>+ Add</button>
          </div>
        </div>

        {showAdd && (
          <div style={{ padding: '14px 20px', borderBottom: '1.5px solid var(--border)', background: 'var(--mint)', display: 'flex', gap: 8 }}>
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.gov/bids"
              style={{ flex: 1, background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '8px 12px', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', fontFamily: 'DM Mono' }} />
            <button onClick={() => newUrl.trim() && addWebsite.mutate(newUrl.trim())} disabled={addWebsite.isPending}
              style={{ padding: '8px 14px', background: 'var(--green)', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Add</button>
            <button onClick={() => { setShowAdd(false); setNewUrl(''); }}
              style={{ padding: '8px 10px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 7, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead><tr>{['URL', 'Pages', 'Yield', 'Priority', 'Status', 'Last Run', ''].map(h =>
            <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.72rem', background: 'var(--bg)' }}>{h}</th>
          )}</tr></thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem', color: 'var(--muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                  onClick={() => navigate(`/app/projects/${id}/websites/${w.id}`)}>
                  {w.url}
                </td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>{w.totalPages}</td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                  {w.yieldRate > 0 ? <span style={{ color: 'var(--green)', fontFamily: 'DM Mono', fontSize: '0.77rem', fontWeight: 500 }}>{Math.round(w.yieldRate)}%</span> : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}><StatusPill status={w.priority} /></td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}><StatusPill status={w.status} /></td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.75rem' }}>
                  {w.lastCrawled ? new Date(w.lastCrawled).toLocaleString() : '—'}
                </td>
                <td style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)' }}>
                  <button onClick={() => crawl.mutate(w.id)} disabled={w.status === 'crawling'}
                    style={{ padding: '3px 9px', background: 'var(--mint)', border: '1.5px solid #bbf7d0', borderRadius: 5, color: 'var(--green)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                    {w.status === 'crawling' ? '…' : '▶ Run'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>No websites yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
