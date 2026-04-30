interface MiniBarProps { pct: number; color?: string; height?: number; }

export function MiniBar({ pct, color = '#1a9e57', height = 4 }: MiniBarProps) {
  return (
    <div style={{ height, borderRadius: height / 2, background: '#e8e9ec', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color, transition: 'width 0.5s' }} />
    </div>
  );
}
