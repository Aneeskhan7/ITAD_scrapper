import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MiniBar } from '@/components/shared/MiniBar';

interface AIStats {
  totalClassifications: number;
  bidding: number;
  selling: number;
  informational: number;
  irrelevant: number;
  avgConfidence: number;
  avgLatencyMs: number;
  fallbackCount: number;
  mode: string;
}

const MODES = [
  { key: 'shadow', label: 'Shadow', icon: '👁️', desc: 'Classifies in background. Results not shown to users. Safe for testing.' },
  { key: 'advisory', label: 'Advisory', icon: '💡', desc: 'Results shown with "AI suggestion" label. Users can override.' },
  { key: 'autonomous', label: 'Autonomous', icon: '🤖', desc: 'AI labels are authoritative. Fully automated procurement intelligence.' },
];

const DOMAIN_ACCURACY = [
  { domain: 'procurement.state.gov', total: 142, correct: 138, accuracy: 0.972 },
  { domain: 'bids.county.us', total: 89, correct: 83, accuracy: 0.933 },
  { domain: 'itad-exchange.com', total: 204, correct: 192, accuracy: 0.941 },
  { domain: 'surplus.gov', total: 67, correct: 61, accuracy: 0.910 },
  { domain: 'rfp.enterprise.io', total: 33, correct: 28, accuracy: 0.848 },
];

export function AIClassifierPage() {
  const qc = useQueryClient();
  const { data: stats } = useQuery<AIStats>({
    queryKey: ['admin-ai-stats'],
    queryFn: () => api.get('/admin/ai/stats').then(r => r.data),
    refetchInterval: 10000,
  });

  const [testUrl, setTestUrl] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [testBody, setTestBody] = useState('');
  const [testResult, setTestResult] = useState<{ classification: string; confidence: number; reason: string } | null>(null);

  const setMode = useMutation({
    mutationFn: (mode: string) => api.post('/admin/ai/mode', { mode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-ai-stats'] }),
  });

  const testClassify = useMutation({
    mutationFn: () => api.post('/admin/ai/test', { url: testUrl, title: testTitle, bodySnippet: testBody }).then(r => r.data),
    onSuccess: (data) => setTestResult(data),
  });

  const total = stats?.totalClassifications ?? 0;
  const currentMode = stats?.mode ?? 'shadow';

  const DIST = [
    { label: 'Bidding', val: stats?.bidding ?? 0, color: '#1a9e57' },
    { label: 'Selling', val: stats?.selling ?? 0, color: '#d97706' },
    { label: 'Informational', val: stats?.informational ?? 0, color: '#2563eb' },
    { label: 'Irrelevant', val: stats?.irrelevant ?? 0, color: '#6b7280' },
  ];

  const CLASS_COLOR: Record<string, { bg: string; text: string }> = {
    bidding:       { bg: '#e4f5ed', text: '#1a9e57' },
    selling:       { bg: '#fef3c7', text: '#d97706' },
    informational: { bg: '#dbeafe', text: '#1d4ed8' },
    irrelevant:    { bg: 'var(--bg)', text: 'var(--muted)' },
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', marginBottom: 4 }}>AI Classifier</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Ollama llama3.2 · local inference · page classification control.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 13, marginBottom: 18 }}>
        {[
          { label: 'Total Classified', val: total.toLocaleString(), color: '#2563eb' },
          { label: 'Avg Confidence', val: `${((stats?.avgConfidence ?? 0) * 100).toFixed(1)}%`, color: '#1a9e57' },
          { label: 'Avg Latency', val: `${stats?.avgLatencyMs ?? 0}ms`, color: '#d97706' },
          { label: 'Fallbacks', val: stats?.fallbackCount ?? 0, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.6rem', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* 3-Mode Control */}
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 14 }}>
        <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>Classification Mode</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {MODES.map(m => {
            const isActive = currentMode === m.key;
            return (
              <button key={m.key} onClick={() => setMode.mutate(m.key)}
                style={{ padding: '16px', borderRadius: 10, border: `2px solid ${isActive ? '#1a9e57' : 'var(--border)'}`, background: isActive ? '#e4f5ed' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
                  <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '0.9rem', color: isActive ? '#1a9e57' : 'var(--text)' }}>{m.label}</span>
                  {isActive && <span style={{ marginLeft: 'auto', background: '#1a9e57', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>ACTIVE</span>}
                </div>
                <div style={{ fontSize: '0.79rem', color: 'var(--muted)', lineHeight: 1.5 }}>{m.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'DM Mono', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span>Model: <strong>llama3.2</strong></span>
            <span style={{ color: '#1a9e57' }}>● local · Ollama</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Distribution */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>Classification Distribution</div>
          {DIST.map(d => (
            <div key={d.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{d.label}</span>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.78rem', color: d.color, fontWeight: 600 }}>
                  {d.val.toLocaleString()} ({total > 0 ? Math.round((d.val / total) * 100) : 0}%)
                </span>
              </div>
              <MiniBar pct={total > 0 ? (d.val / total) * 100 : 0} color={d.color} />
            </div>
          ))}
        </div>

        {/* Live Test */}
        <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.9rem', marginBottom: 14 }}>Live Classification Test</div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 5, display: 'block' }}>URL</label>
            <input value={testUrl} onChange={e => setTestUrl(e.target.value)} placeholder="https://procurement.gov/bids"
              style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '8px 12px', color: 'var(--text)', fontSize: '0.82rem', outline: 'none', fontFamily: 'DM Mono', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 5, display: 'block' }}>Page Title</label>
            <input value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="RFP — IT Asset Disposal 2025"
              style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '8px 12px', color: 'var(--text)', fontSize: '0.82rem', outline: 'none', fontFamily: 'DM Sans', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 5, display: 'block' }}>Body Snippet</label>
            <textarea value={testBody} onChange={e => setTestBody(e.target.value)} rows={3} placeholder="Paste page content (first 500 chars)…"
              style={{ width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 7, padding: '8px 12px', color: 'var(--text)', fontSize: '0.82rem', outline: 'none', fontFamily: 'DM Mono', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => testClassify.mutate()} disabled={!testUrl || testClassify.isPending}
              style={{ padding: '8px 18px', background: '#1a9e57', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.84rem', opacity: !testUrl ? 0.5 : 1 }}>
              {testClassify.isPending ? 'Classifying…' : '▶ Classify'}
            </button>
            {testResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: CLASS_COLOR[testResult.classification]?.bg ?? 'var(--bg)', color: CLASS_COLOR[testResult.classification]?.text ?? 'var(--text)', borderRadius: 6, padding: '3px 10px', fontSize: '0.79rem', fontWeight: 700 }}>
                  {testResult.classification}
                </span>
                <span style={{ fontFamily: 'DM Mono', fontSize: '0.79rem', color: '#1a9e57', fontWeight: 600 }}>{(testResult.confidence * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
          {testResult && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 7, fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>
              {testResult.reason}
            </div>
          )}
        </div>
      </div>

      {/* Per-Domain Accuracy */}
      <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 20px', borderBottom: '1.5px solid var(--border)' }}>
          <span style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.88rem' }}>Per-Domain Accuracy</span>
          <span style={{ fontSize: '0.77rem', color: 'var(--muted)' }}>Based on feedback signals</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr>
              {['Domain', 'Classified', 'Correct', 'Accuracy', 'Action'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 14px', color: 'var(--muted)', fontWeight: 500, borderBottom: '1.5px solid var(--border)', fontSize: '0.71rem', background: 'var(--bg)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOMAIN_ACCURACY.map(d => (
              <tr key={d.domain}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.78rem' }}>{d.domain}</td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>{d.total}</td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'DM Mono', fontSize: '0.76rem' }}>{d.correct}</td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)', minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MiniBar pct={d.accuracy * 100} color={d.accuracy >= 0.9 ? '#1a9e57' : d.accuracy >= 0.75 ? '#d97706' : '#dc2626'} />
                    <span style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: d.accuracy >= 0.9 ? '#1a9e57' : '#d97706', fontWeight: 600, minWidth: 36 }}>{(d.accuracy * 100).toFixed(1)}%</span>
                  </div>
                </td>
                <td style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                  {d.accuracy < 0.9 && (
                    <button style={{ padding: '3px 9px', background: '#ede9fe', border: '1.5px solid #c4b5fd', borderRadius: 5, color: '#6d28d9', cursor: 'pointer', fontSize: '0.71rem', fontWeight: 600 }}>
                      Trigger Retrain
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
