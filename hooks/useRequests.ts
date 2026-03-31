import { useCallback, useEffect, useRef, useState } from "react";
import { MaintenanceRequest } from "@/types";
import { subscribeToTenantRequests, subscribeToAllRequests } from "@/services/requests";
import { Unsubscribe } from "firebase/firestore";

export function useTenantRequests(tenantId: string | undefined) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  const subscribe = useCallback(() => {
    if (!tenantId) return;
    unsubRef.current?.();
    unsubRef.current = subscribeToTenantRequests(
      tenantId,
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
  }, [tenantId]);

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

export function useAllRequests() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  const subscribe = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = subscribeToAllRequests(
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
  }, []);

  useEffect(() => {
    subscribe();
    return () => unsubRef.current?.();
  }, [subscribe]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    subscribe();
  }, [subscribe]);

  return { requests, loading, error, refreshing, refresh };
}
