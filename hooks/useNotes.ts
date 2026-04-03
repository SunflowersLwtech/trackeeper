import { useEffect, useState } from "react";
import { Note } from "@/types";
import { subscribeToNotes } from "@/services/notes";

export function useNotes(requestId: string | undefined) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!requestId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToNotes(
      requestId,
      (data) => {
        setNotes(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [requestId]);

  return { notes, loading, error };
}
