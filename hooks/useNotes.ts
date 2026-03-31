import { useEffect, useState } from "react";
import { Note } from "@/types";
import { subscribeToNotes } from "@/services/notes";

export function useNotes(requestId: string | undefined) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    const unsubscribe = subscribeToNotes(
      requestId,
      (data) => {
        setNotes(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [requestId]);

  return { notes, loading };
}
