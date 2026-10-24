const COLORS = ['#0f766e', '#c2410c', '#6d28d9', '#be185d', '#1d4ed8', '#4d7c0f', '#b45309'];

export default function Avatar({ name = '?', size = 28, online }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span className="avatar" title={name} style={{ width: size, height: size, fontSize: size * 0.4, background: COLORS[hash % COLORS.length] }}>
      {name[0]?.toUpperCase()}
      {online && <span className="online-dot" aria-label="online" />}
    </span>
  );
}
