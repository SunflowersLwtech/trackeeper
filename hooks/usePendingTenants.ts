import { useEffect, useState } from "react";
import { User } from "@/types";
import { subscribeToPendingTenants } from "@/services/approvals";

export function usePendingTenants() {
  const [tenants, setTenants] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToPendingTenants(
      (list) => {
        setTenants(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return { tenants, loading, error };
}
