import { useEffect, useState } from "react";
import { Message } from "@/types";
import { subscribeToMessages } from "@/services/messages";

export function useMessages(requestId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!requestId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeToMessages(
      requestId,
      (data) => {
        setMessages(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [requestId]);

  return { messages, loading, error };
}
