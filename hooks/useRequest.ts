import { useEffect, useState } from "react";
import { MaintenanceRequest } from "@/types";
import { subscribeToRequest } from "@/services/requests";

export function useRequest(requestId: string | undefined) {
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    const unsubscribe = subscribeToRequest(
      requestId,
      (data) => {
        setRequest(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [requestId]);

  return { request, loading, error };
}
