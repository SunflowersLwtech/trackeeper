/** Relative time string like "3m ago", "2h ago", "5d ago". */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/** Clock time string like "09:45". */
export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Short date+time like "4/03 09:45". */
export function formatDateTime(date: Date): string {
  const d = date.getDate();
  const mo = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${mo} ${formatTime(date)}`;
}
