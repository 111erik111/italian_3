export function Pill({ kind = 'terracotta', children }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}

export function Card({ children, paper, style }) {
  return (
    <div className={`card${paper ? ' paper' : ''}`} style={style}>
      {children}
    </div>
  );
}

export function ScreenHeader({ kicker, title }) {
  return (
    <div className="screen-header">
      {kicker && <div className="caption kicker">{kicker}</div>}
      <h1 className="h1">{title}</h1>
    </div>
  );
}

export function ProgressBar({ value, max, color = 'var(--terracotta)' }) {
  const pct = Math.min(100, (max > 0 ? value / max : 0) * 100);
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Feedback({ correct, children }) {
  return (
    <div className={`feedback ${correct ? 'ok' : 'no'}`}>{children}</div>
  );
}
