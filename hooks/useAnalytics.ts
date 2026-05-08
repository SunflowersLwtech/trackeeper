import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Unsubscribe } from "firebase/firestore";
import {
  MaintenanceRequest,
  RequestPriority,
  RequestStatus,
  User,
} from "@/types";
import { subscribeToAllRequests } from "@/services/requests";
import { subscribeToUsersByRole } from "@/services/users";
import {
  LeaderboardEntry,
  MonthBucket,
  RevenueSummary,
  avgResolutionHours,
  groupByCategory,
  groupByPriority,
  groupByStatus,
  hourlyHeatmap,
  last6MonthsTrend,
  maintainerLeaderboard,
  revenueSummary,
} from "@/utils/analytics";

export interface AnalyticsKpis {
  totalRequests: number;
  openNow: number;
  completedThisMonth: number;
  avgRating: number;
  ratingCount: number;
  avgResolutionHours: number;
}

export interface AnalyticsResult {
  loading: boolean;
  error: Error | null;
  kpis: AnalyticsKpis;
  statusBreakdown: Record<RequestStatus, number>;
  priorityBreakdown: Record<RequestPriority, number>;
  categoryBreakdown: ReturnType<typeof groupByCategory>;
  monthlyTrend: MonthBucket[];
  leaderboard: LeaderboardEntry[];
  heatmap: number[][];
  revenue: RevenueSummary;
  refresh: () => void;
}

const OPEN_STATUSES: RequestStatus[] = ["submitted", "assigned", "in_progress", "on_hold"];

/**
 * Composes the analytics data feed for the manager dashboard. Subscribes to
 * the all-requests stream and the maintainer roster, then derives KPIs,
 * breakdowns, monthly trend, heatmap, leaderboard, and revenue numbers via
 * the pure helpers in utils/analytics.
 */
export function useAnalytics(): AnalyticsResult {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [maintainers, setMaintainers] = useState<User[]>([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [maintainersLoaded, setMaintainersLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const reqUnsubRef = useRef<Unsubscribe | null>(null);
  const userUnsubRef = useRef<Unsubscribe | null>(null);

  const subscribe = useCallback(() => {
    reqUnsubRef.current?.();
    userUnsubRef.current?.();
    setRequestsLoaded(false);
    setMaintainersLoaded(false);
    setError(null);

    reqUnsubRef.current = subscribeToAllRequests(
      (data) => {
        setRequests(data);
        setRequestsLoaded(true);
      },
      (err) => {
        setError(err);
        setRequestsLoaded(true);
      },
    );

    userUnsubRef.current = subscribeToUsersByRole(
      "maintainer",
      (data) => {
        setMaintainers(data);
        setMaintainersLoaded(true);
      },
      (err) => {
        setError(err);
        setMaintainersLoaded(true);
      },
    );
  }, []);

  useEffect(() => {
    subscribe();
    return () => {
      reqUnsubRef.current?.();
      userUnsubRef.current?.();
    };
  }, [subscribe, version]);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  const loading = !requestsLoaded || !maintainersLoaded;

  const result = useMemo(() => {
    const statusBreakdown = groupByStatus(requests);
    const priorityBreakdown = groupByPriority(requests);
    const categoryBreakdown = groupByCategory(requests);
    const monthlyTrend = last6MonthsTrend(requests);
    const heatmap = hourlyHeatmap(requests);
    const leaderboard = maintainerLeaderboard(requests, maintainers);
    const revenue = revenueSummary(requests);

    const openNow = OPEN_STATUSES.reduce((sum, s) => sum + (statusBreakdown[s] ?? 0), 0);

    // Completed this month
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    let completedThisMonth = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    for (const r of requests) {
      if (r.status === "completed" && r.resolvedAt) {
        const d = r.resolvedAt.toDate();
        if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) {
          completedThisMonth += 1;
        }
      }
      if (typeof r.rating === "number") {
        ratingSum += r.rating;
        ratingCount += 1;
      }
    }
    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

    const kpis: AnalyticsKpis = {
      totalRequests: requests.length,
      openNow,
      completedThisMonth,
      avgRating,
      ratingCount,
      avgResolutionHours: avgResolutionHours(requests),
    };

    return {
      kpis,
      statusBreakdown,
      priorityBreakdown,
      categoryBreakdown,
      monthlyTrend,
      heatmap,
      leaderboard,
      revenue,
    };
  }, [requests, maintainers]);

  return {
    loading,
    error,
    refresh,
    ...result,
  };
}
