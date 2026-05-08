import type { Timestamp } from "firebase/firestore";

type TimeInput = Date | Timestamp | number | { seconds: number; nanoseconds?: number } | null | undefined;

function toDate(input: TimeInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  if (typeof input === "object" && "toDate" in input && typeof input.toDate === "function") {
    return input.toDate();
  }
  if (typeof input === "object" && "seconds" in input) {
    return new Date(input.seconds * 1000);
  }
  return null;
}

/** Relative time string like "3m ago", "2h ago", "5d ago". */
export function formatTimeAgo(input: TimeInput): string {
  const date = toDate(input);
  if (!date) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Just now";
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}

/** Clock time string like "09:45". */
export function formatTime(input: TimeInput): string {
  const date = toDate(input);
  if (!date) return "";
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Short date+time like "4/03 09:45". */
export function formatDateTime(input: TimeInput): string {
  const date = toDate(input);
  if (!date) return "";
  const d = date.getDate();
  const mo = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${mo} ${formatTime(date)}`;
}

/** Long, human-readable date — "April 5, 2026". */
export function formatLongDate(input: TimeInput): string {
  const date = toDate(input);
  if (!date) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
