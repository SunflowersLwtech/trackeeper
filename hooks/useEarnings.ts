import { useEffect, useMemo, useState } from "react";
import { MaintenanceRequest } from "@/types";
import { subscribeToMaintainerEarnings } from "@/services/requests";

export interface EarningsSummary {
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  refundedEarnings: number;
  jobCount: number;
  paidCount: number;
  pendingCount: number;
  refundedCount: number;
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
    let refundedEarnings = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    for (const r of requests) {
      const amount = r.cost?.total ?? 0;
      const status = r.payment?.status;
      if (status === "refunded") {
        // Refunded jobs are excluded from total earnings — funds were reversed.
        refundedEarnings += amount;
        refundedCount += 1;
        continue;
      }
      totalEarnings += amount;
      if (status === "paid") {
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
      refundedEarnings,
      jobCount: requests.length - refundedCount,
      paidCount,
      pendingCount,
      refundedCount,
    };
  }, [requests]);

  return { requests, summary, loading, error };
}
