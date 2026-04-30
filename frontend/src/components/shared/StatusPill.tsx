const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:      { bg: '#dcfce7', color: '#16a34a' },
  queued:      { bg: '#fef9c3', color: '#a16207' },
  pending:     { bg: '#fef9c3', color: '#a16207' },
  failed:      { bg: '#fee2e2', color: '#dc2626' },
  idle:        { bg: '#f3f4f6', color: '#6b7280' },
  paused:      { bg: '#f3f4f6', color: '#6b7280' },
  resolved:    { bg: '#dcfce7', color: '#16a34a' },
  retried:     { bg: '#dcfce7', color: '#16a34a' },
  archived:    { bg: '#f3f4f6', color: '#6b7280' },
  suspended:   { bg: '#fee2e2', color: '#dc2626' },
  quarantined: { bg: '#fee2e2', color: '#dc2626' },
  draining:    { bg: '#fef9c3', color: '#a16207' },
  crawling:    { bg: '#e4f0fc', color: '#2563eb' },
  completed:   { bg: '#dcfce7', color: '#16a34a' },
  high:        { bg: '#e4f5ed', color: '#1a9e57' },
  medium:      { bg: '#fef9c3', color: '#a16207' },
  low:         { bg: '#f3f4f6', color: '#6b7280' },
  pinned:      { bg: '#e4f5ed', color: '#1a9e57' },
  blocked:     { bg: '#fee2e2', color: '#dc2626' },
};

export function StatusPill({ status }: { status: string }) {
  const { bg, color } = STATUS_COLORS[status] ?? { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px',
      borderRadius: 100, fontSize: '0.7rem', fontWeight: 600, background: bg, color, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {status}
    </span>
  );
}

export function TypePill({ type }: { type: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    bidding: { bg: '#e4f5ed', color: '#1a9e57' },
    selling: { bg: '#fffbe5', color: '#a16207' },
  };
  const { bg, color } = map[type] ?? { bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ padding: '2px 9px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 600, background: bg, color }}>
      {type}
    </span>
  );
}
