import {
  MaintenanceRequest,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  User,
} from "@/types";

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Group requests by status, returning a count map keyed by RequestStatus. */
export function groupByStatus(requests: MaintenanceRequest[]): Record<RequestStatus, number> {
  const counts: Record<RequestStatus, number> = {
    submitted: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    on_hold: 0,
  };
  for (const r of requests) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }
  return counts;
}

/** Group requests by category, returning a count map. */
export function groupByCategory(requests: MaintenanceRequest[]): Record<RequestCategory, number> {
  const counts: Record<RequestCategory, number> = {
    Plumbing: 0,
    Electrical: 0,
    General: 0,
  };
  for (const r of requests) {
    counts[r.category] = (counts[r.category] ?? 0) + 1;
  }
  return counts;
}

/** Group requests by priority, returning a count map. */
export function groupByPriority(requests: MaintenanceRequest[]): Record<RequestPriority, number> {
  const counts: Record<RequestPriority, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };
  for (const r of requests) {
    const p = r.priority ?? "medium";
    counts[p] = (counts[p] ?? 0) + 1;
  }
  return counts;
}

export interface MonthBucket {
  label: string;
  count: number;
  completed: number;
}

/**
 * Compute a 6-month rolling window of request counts (current month last).
 * Each bucket counts requests created within the calendar month and how many
 * of those reached the "completed" status.
 */
export function last6MonthsTrend(requests: MaintenanceRequest[]): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  const keyToIndex = new Map<string, number>();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    keyToIndex.set(key, buckets.length);
    buckets.push({
      label: MONTH_SHORT[d.getMonth()],
      count: 0,
      completed: 0,
    });
  }

  for (const r of requests) {
    if (!r.createdAt) continue;
    const created = r.createdAt.toDate();
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const idx = keyToIndex.get(key);
    if (idx == null) continue;
    buckets[idx].count += 1;
    if (r.status === "completed") {
      buckets[idx].completed += 1;
    }
  }

  return buckets;
}

/**
 * Build a 7x24 (day-of-week × hour) heatmap counting when requests were
 * submitted. Row 0 = Sunday … Row 6 = Saturday.
 */
export function hourlyHeatmap(requests: MaintenanceRequest[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const r of requests) {
    if (!r.createdAt) continue;
    const date = r.createdAt.toDate();
    const day = date.getDay();
    const hour = date.getHours();
    if (day < 0 || day > 6 || hour < 0 || hour > 23) continue;
    grid[day][hour] += 1;
  }
  return grid;
}

/**
 * Average resolution time in hours for completed requests with both a
 * createdAt and resolvedAt timestamp. Returns 0 when no data is available.
 */
export function avgResolutionHours(requests: MaintenanceRequest[]): number {
  let total = 0;
  let count = 0;
  for (const r of requests) {
    if (r.status !== "completed") continue;
    if (!r.createdAt || !r.resolvedAt) continue;
    const startMs = r.createdAt.toMillis();
    const endMs = r.resolvedAt.toMillis();
    if (endMs <= startMs) continue;
    total += (endMs - startMs) / (1000 * 60 * 60);
    count += 1;
  }
  if (count === 0) return 0;
  return total / count;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  completedJobs: number;
  avgRating: number;
  totalEarnings: number;
}

/**
 * Build a leaderboard of maintainers, ranked by completed jobs (desc).
 * Includes maintainers with zero jobs so the UI can show their slot.
 * Earnings come from RequestCost.total when set.
 */
export function maintainerLeaderboard(
  requests: MaintenanceRequest[],
  maintainers: User[],
): LeaderboardEntry[] {
  const stats = new Map<string, {
    name: string;
    completedJobs: number;
    ratingSum: number;
    ratingCount: number;
    totalEarnings: number;
  }>();

  // Seed each known maintainer.
  for (const m of maintainers) {
    stats.set(m.uid, {
      name: m.name,
      completedJobs: 0,
      ratingSum: 0,
      ratingCount: 0,
      totalEarnings: 0,
    });
  }

  for (const r of requests) {
    if (!r.assignedTo) continue;
    let entry = stats.get(r.assignedTo);
    if (!entry) {
      // Maintainer record may have been removed but their work remains.
      entry = {
        name: r.assignedToName ?? "Unknown",
        completedJobs: 0,
        ratingSum: 0,
        ratingCount: 0,
        totalEarnings: 0,
      };
      stats.set(r.assignedTo, entry);
    }
    if (r.status === "completed") {
      entry.completedJobs += 1;
    }
    if (typeof r.rating === "number") {
      entry.ratingSum += r.rating;
      entry.ratingCount += 1;
    }
    if (r.cost && Number.isFinite(r.cost.total)) {
      entry.totalEarnings += r.cost.total;
    }
  }

  const entries: LeaderboardEntry[] = [];
  for (const [uid, s] of stats) {
    entries.push({
      uid,
      name: s.name,
      completedJobs: s.completedJobs,
      avgRating: s.ratingCount > 0 ? s.ratingSum / s.ratingCount : 0,
      totalEarnings: s.totalEarnings,
    });
  }

  entries.sort((a, b) => {
    if (b.completedJobs !== a.completedJobs) return b.completedJobs - a.completedJobs;
    if (b.totalEarnings !== a.totalEarnings) return b.totalEarnings - a.totalEarnings;
    return b.avgRating - a.avgRating;
  });

  return entries;
}

export interface RevenueSummary {
  total: number;
  paid: number;
  unpaid: number;
  jobCount: number;
}

/**
 * Aggregate the cost / payment data on the request set.
 * - total: sum of cost.total across all requests with a cost set
 * - paid: sum of payment.amount where payment.status === "paid"
 * - unpaid: total minus paid (clamped at 0 to avoid negative noise)
 * - jobCount: requests that had a cost set
 */
export function revenueSummary(requests: MaintenanceRequest[]): RevenueSummary {
  let total = 0;
  let paid = 0;
  let jobCount = 0;
  for (const r of requests) {
    if (r.cost && Number.isFinite(r.cost.total)) {
      total += r.cost.total;
      jobCount += 1;
    }
    if (r.payment && r.payment.status === "paid" && Number.isFinite(r.payment.amount)) {
      paid += r.payment.amount;
    }
  }
  const unpaid = Math.max(0, total - paid);
  return { total, paid, unpaid, jobCount };
}
