import { useEffect, useMemo, useState } from "react";
import { MaintenanceRequest } from "@/types";
import { subscribeToMaintainerEarnings } from "@/services/requests";

export interface EarningsSummary {
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  jobCount: number;
  paidCount: number;
  pendingCount: number;
}

export function useEarnings(maintainerId: string | undefined) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!maintainerId) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToMaintainerEarnings(
      maintainerId,
      (list) => {
        setRequests(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [maintainerId]);

  const summary = useMemo<EarningsSummary>(() => {
    let totalEarnings = 0;
    let paidEarnings = 0;
    let pendingEarnings = 0;
    let paidCount = 0;
    let pendingCount = 0;
    for (const r of requests) {
      const amount = r.cost?.total ?? 0;
      totalEarnings += amount;
      if (r.payment?.status === "paid") {
        paidEarnings += amount;
        paidCount += 1;
      } else {
        pendingEarnings += amount;
        pendingCount += 1;
      }
    }
    return {
      totalEarnings,
      paidEarnings,
      pendingEarnings,
      jobCount: requests.length,
      paidCount,
      pendingCount,
    };
  }, [requests]);

  return { requests, summary, loading, error };
}
