export const PRIORITIES = ['low', 'medium', 'high'];

export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// due dates are stored as UTC midnight; use the date part only so timezones don't shift the day
export const dateInput = (iso) => (iso ? iso.slice(0, 10) : '');

export function formatDue(iso) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function isOverdue(iso) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return iso.slice(0, 10) < todayStr;
}

// Returns a new task list after moving a task (used for instant, optimistic drag & drop)
export function applyMove(tasks, taskId, columnId, index) {
  const moving = tasks.find((t) => t._id === taskId);
  if (!moving) return tasks;
  const rest = tasks.filter((t) => t._id !== taskId);
  const target = rest.filter((t) => t.column === columnId).sort((a, b) => a.position - b.position);
  target.splice(Math.min(index, target.length), 0, { ...moving, column: columnId });
  const reordered = target.map((t, i) => ({ ...t, position: i }));
  return [...rest.filter((t) => t.column !== columnId), ...reordered];
}
