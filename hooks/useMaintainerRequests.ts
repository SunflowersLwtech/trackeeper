import { useCallback, useEffect, useRef, useState } from "react";
import { MaintenanceRequest } from "@/types";
import { subscribeToMaintainerRequests } from "@/services/requests";
import { Unsubscribe } from "firebase/firestore";

export function useMaintainerRequests(maintainerId: string | undefined) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  const subscribe = useCallback(() => {
    if (!maintainerId) return;
    unsubRef.current?.();
    unsubRef.current = subscribeToMaintainerRequests(
      maintainerId,
      (data) => {
        setRequests(data);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
        setRefreshing(false);
      },
    );
  }, [maintainerId]);

  useEffect(() => {
    setLoading(true);
    subscribe();
    return () => unsubRef.current?.();
  }, [subscribe]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    subscribe();
  }, [subscribe]);

  return { requests, loading, error, refreshing, refresh };
}
