import { useEffect, useState } from "react";
import { MaintenanceRequest } from "@/types";
import { subscribeToTenantRequests, subscribeToAllRequests } from "@/services/requests";

export function useTenantRequests(tenantId: string | undefined) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const unsubscribe = subscribeToTenantRequests(
      tenantId,
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [tenantId]);

  return { requests, loading, error };
}

export function useAllRequests() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAllRequests(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { requests, loading, error };
}
