import { Timestamp } from "firebase/firestore";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Format a numeric value as a currency string. Defaults to RM (Malaysian Ringgit). */
export function formatCurrency(n: number, currency: string = "RM"): string {
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  // Insert thousands separators
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${currency} ${withCommas}.${decPart}`;
}

/** Format a duration in hours into "3h 24m" or "45m". Hours under 0 → "0m". */
export function formatHours(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return "0m";
  const totalMinutes = Math.round(h * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Format a number as a percentage with the given decimal digits. */
export function formatPercent(n: number, digits: number = 0): string {
  if (!Number.isFinite(n)) return "0%";
  return `${n.toFixed(digits)}%`;
}

/** Convert a Firestore Timestamp into a 3-letter month label like "Jan". */
export function formatRelativeMonth(ts: Timestamp): string {
  const date = ts.toDate();
  return MONTH_SHORT[date.getMonth()];
}

/** Convert a Firestore Timestamp into a short label like "Apr 15". */
export function formatShortDate(ts: Timestamp): string {
  const date = ts.toDate();
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}
