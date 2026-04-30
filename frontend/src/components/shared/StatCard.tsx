interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  pct?: number;
}

export function StatCard({ label, value, sub, color = '#1a9e57', pct }: StatCardProps) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'Space Grotesk', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', color }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.73rem', color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
      {pct !== undefined && (
        <div style={{ height: 4, borderRadius: 2, background: '#e8e9ec', overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, transition: 'width 0.5s' }} />
        </div>
      )}
    </div>
  );
}
