import { useCallback, useEffect, useRef, useState } from "react";
import { User } from "@/types";
import { subscribeToMaintainers } from "@/services/users";
import { Unsubscribe } from "firebase/firestore";

export function useMaintainers() {
  const [maintainers, setMaintainers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  const subscribe = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = subscribeToMaintainers(
      (data) => {
        setMaintainers(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    subscribe();
    return () => unsubRef.current?.();
  }, [subscribe]);

  return { maintainers, loading, error };
}
