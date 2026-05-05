import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { WatchKeyword, Project, Website } from '@/types';

const PLAN_LIMITS: Record<string, number> = {
  starter: 10, pro: 100, premium: 500, enterprise: 9999,
};

const MODE_COLORS: Record<string, { bg: string; color: string }> = {
  contains: { bg: '#e4f5ed', color: '#1a9e57' },
  exact:    { bg: '#ede9fe', color: '#6d28d9' },
  regex:    { bg: '#fef3c7', color: '#92400e' },
  fuzzy:    { bg: '#e0f2fe', color: '#0369a1' },
};

type MatchMode = 'contains' | 'exact' | 'regex' | 'fuzzy';
type FormState = { keyword: string; projectId: string; websiteId: string; matchMode: MatchMode; caseSensitive: boolean };
const emptyForm: FormState = { keyword: '', projectId: '', websiteId: '', matchMode: 'contains', caseSensitive: false };

export function KeywordsPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [modal, setModal] = useState<null | 'add' | WatchKeyword>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');

  const { data: keywords = [], isLoading } = useQuery<WatchKeyword[]>({
    queryKey: ['keywords'],
    queryFn: () => api.get('/keywords').then(r => r.data),
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const { data: modalWebsites = [] } = useQuery<Website[]>({
    queryKey: ['websites', form.projectId],
    queryFn: () => api.get(`/websites/project/${form.projectId}`).then(r => r.data),
    enabled: !!form.projectId,
  });

  const create = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/keywords', {
        projectId: data.projectId,
        websiteId: data.websiteId || null,
        keyword: data.keyword,
        matchMode: data.matchMode,
        caseSensitive: data.caseSensitive,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keywords'] }); closeModal(); },
    onError: (e: any) => setFormError(e.response?.data?.error ?? 'Failed to add keyword'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form & { status: string }> }) =>
      api.patch(`/keywords/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keywords'] }); closeModal(); },
    onError: (e: any) => setFormError(e.response?.data?.error ?? 'Failed to update keyword'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/keywords/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['keywords'] }),
  });

  const toggleStatus = (kw: WatchKeyword) =>
    update.mutate({ id: kw.id, data: { status: kw.status === 'active' ? 'paused' : 'active' } });

  function openAdd() {
    setForm({ ...emptyForm, projectId: projects[0]?.id ?? '', matchMode: 'contains' });
    setFormError('');
    setModal('add');
  }

  function openEdit(kw: WatchKeyword) {
    setForm({ keyword: kw.keyword, projectId: kw.projectId, websiteId: kw.websiteId ?? '', matchMode: kw.matchMode, caseSensitive: kw.caseSensitive });
    setFormError('');
    setModal(kw);
  }

  function closeModal() { setModal(null); setFormError(''); }

  function submitForm() {
    if (!form.keyword.trim()) { setFormError('Keyword is required'); return; }
    if (!form.projectId) { setFormError('Select a project'); return; }
    setFormError('');
    if (modal === 'add') {
      create.mutate(form);
    } else if (modal && typeof modal === 'object') {
      update.mutate({ id: modal.id, data: { keyword: form.keyword, matchMode: form.matchMode, caseSensitive: form.caseSensitive } });
    }
  }

  const isEditing = modal && typeof modal === 'object';
  const planLimit = PLAN_LIMITS[user?.plan ?? 'starter'] ?? 10;
  const used = keywords.length;
  const filtered = filterStatus === 'all' ? keywords : keywords.filter(k => k.status === filterStatus);
  const totalHits = keywords.reduce((s, k) => s + k.hitCount, 0);

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.03em' }}>Keywords</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: 3 }}>Watch for specific terms across all your monitored websites.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.76rem', color: used >= planLimit ? '#dc2626' : 'var(--muted)', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '5px 10px', fontFamily: 'DM Mono' }}>
            {used} / {planLimit === 9999 ? '∞' : planLimit} used
          </span>
          <button onClick={openAdd}
            style={{ padding: '8px 16px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem' }}>
            + Add Keyword
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Keywords', value: keywords.length, color: '#2563eb', sub: 'across all projects' },
          { label: 'Active', value: keywords.filter(k => k.status === 'active').length, color: '#1a9e57', sub: 'scanning now' },
          { label: 'Paused', value: keywords.filter(k => k.status === 'paused').length, color: '#d97706', sub: 'not scanning' },
          { label: 'Total Hits', value: totalHits, color: '#7c3aed', sub: 'all time' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.7rem', color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: '1.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>All Keywords ({filtered.length})</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'active', 'paused'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                style={{ padding: '4px 12px', borderRadius: 6, border: `1.5px solid ${filterStatus === f ? 'var(--green)' : 'var(--border)'}`, background: filterStatus === f ? 'var(--mint)' : 'transparent', color: filterStatus === f ? 'var(--green)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['Keyword', 'Scope', 'Mode', 'Case', 'Hits', 'Last Hit', 'Status', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(kw => {
              const mc = MODE_COLORS[kw.matchMode] ?? MODE_COLORS.contains;
              const isPaused = kw.status === 'paused';
              return (
                <tr key={kw.id}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.82rem', fontWeight: 600, opacity: isPaused ? 0.5 : 1 }}>
                    {kw.keyword}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', maxWidth: 180 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.project?.name}</div>
                    {kw.website && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {new URL(kw.website.url).hostname}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: mc.bg, color: mc.color, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>{kw.matchMode}</span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.76rem', fontFamily: 'DM Mono' }}>
                    {kw.caseSensitive ? 'Aa' : 'aa'}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.8rem', fontWeight: 600, color: kw.hitCount > 0 ? 'var(--green)' : 'var(--muted)' }}>
                    {kw.hitCount.toLocaleString()}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.74rem' }}>
                    {kw.lastHitAt ? new Date(kw.lastHitAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ background: isPaused ? 'var(--bg)' : '#e4f5ed', color: isPaused ? 'var(--muted)' : '#1a9e57', border: `1.5px solid ${isPaused ? 'var(--border)' : '#bbf7d0'}`, borderRadius: 5, padding: '2px 8px', fontSize: '0.71rem', fontWeight: 600 }}>
                      {kw.status}
                    </span>
                  </td>
                  <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => toggleStatus(kw)} title={isPaused ? 'Resume' : 'Pause'}
                        style={{ padding: '3px 8px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 5, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                        {isPaused ? '▶' : '⏸'}
                      </button>
                      <button onClick={() => openEdit(kw)}
                        style={{ padding: '3px 8px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 5, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                        Edit
                      </button>
                      <button onClick={() => remove.mutate(kw.id)}
                        style={{ padding: '3px 8px', background: 'transparent', border: '1.5px solid #fee2e2', borderRadius: 5, color: '#dc2626', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !isLoading && (
              <tr>
                <td colSpan={8} style={{ padding: '52px', textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>⬌</div>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>No keywords yet</div>
                  <div style={{ fontSize: '0.82rem' }}>Add your first keyword to start receiving alerts when matching content appears on your monitored websites.</div>
                  <button onClick={openAdd} style={{ marginTop: 14, padding: '8px 18px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem' }}>
                    + Add Keyword
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 28, width: 460, maxWidth: '90vw' }}>
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>
              {isEditing ? 'Edit Keyword' : 'Add Keyword'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Keyword */}
              <div>
                <label style={labelStyle}>Keyword</label>
                <input value={form.keyword} onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                  placeholder="e.g. Chromebook, computer surplus, IT refresh"
                  style={inputStyle} maxLength={200} />
                <div style={{ fontSize: '0.69rem', color: 'var(--muted)', marginTop: 3 }}>{form.keyword.length} / 200</div>
              </div>

              {/* Project — disabled in edit mode */}
              <div>
                <label style={labelStyle}>Project</label>
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value, websiteId: '' }))}
                  disabled={!!isEditing} style={{ ...inputStyle, opacity: isEditing ? 0.5 : 1 }}>
                  <option value="">Select project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Website — disabled in edit mode */}
              <div>
                <label style={labelStyle}>Website <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional — leave blank to scan all)</span></label>
                <select value={form.websiteId} onChange={e => setForm(f => ({ ...f, websiteId: e.target.value }))}
                  disabled={!!isEditing || !form.projectId} style={{ ...inputStyle, opacity: (isEditing || !form.projectId) ? 0.5 : 1 }}>
                  <option value="">All websites in project</option>
                  {modalWebsites.map(w => <option key={w.id} value={w.id}>{new URL(w.url).hostname}</option>)}
                </select>
              </div>

              {/* Match Mode */}
              <div>
                <label style={labelStyle}>Match Mode</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['contains', 'exact', 'regex', 'fuzzy'] as const).map(m => {
                    const mc = MODE_COLORS[m];
                    const active = form.matchMode === m;
                    return (
                      <button key={m} onClick={() => setForm(f => ({ ...f, matchMode: m }))}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: `1.5px solid ${active ? mc.color : 'var(--border)'}`, background: active ? mc.bg : 'transparent', color: active ? mc.color : 'var(--muted)', cursor: 'pointer', fontSize: '0.76rem', fontWeight: 600 }}>
                        {m}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: '0.69rem', color: 'var(--muted)', marginTop: 5 }}>
                  {form.matchMode === 'contains' && 'Finds the keyword anywhere in the page text.'}
                  {form.matchMode === 'exact' && 'Matches the exact whole word (word boundary).'}
                  {form.matchMode === 'regex' && 'Your keyword is treated as a regex pattern. Complex patterns may be rejected.'}
                  {form.matchMode === 'fuzzy' && 'Fuzzy match — tolerates minor typos (pg_trgm similarity ≥ 0.7).'}
                </div>
              </div>

              {/* Case Sensitive */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={form.caseSensitive} onChange={e => setForm(f => ({ ...f, caseSensitive: e.target.checked }))}
                  style={{ width: 15, height: 15, accentColor: 'var(--green)', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.83rem', fontWeight: 500 }}>Case sensitive</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>(Chromebook ≠ chromebook)</span>
              </label>

              {formError && (
                <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: '#dc2626' }}>
                  {formError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
              <button onClick={closeModal}
                style={{ padding: '8px 16px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--muted)', cursor: 'pointer', fontSize: '0.84rem' }}>
                Cancel
              </button>
              <button onClick={submitForm} disabled={create.isPending || update.isPending}
                style={{ padding: '8px 18px', background: 'var(--green)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem', opacity: (create.isPending || update.isPending) ? 0.7 : 1 }}>
                {(create.isPending || update.isPending) ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Keyword'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)',
  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5,
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)',
  borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.875rem',
  outline: 'none', fontFamily: 'DM Sans', boxSizing: 'border-box',
};
