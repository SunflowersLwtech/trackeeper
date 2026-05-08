import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { Message } from "@/types";
import { subscribeToMessages } from "@/services/messages";

/** Typing-indicator entries are stored on the parent request doc as a map of uid → ms-timestamp. */
export interface TypingMap {
  [userId: string]: number;
}

/** Names of other participants currently typing (recently). */
export interface TypingUser {
  name: string;
}

/** A typing record older than this is ignored (and considered stale). */
const TYPING_STALE_MS = 4000;
/** When the user is actively typing we re-write the typing record at most this often. */
const TYPING_DEBOUNCE_MS = 1500;

interface UseMessagesOptions {
  /** Current user id — required for typing-indicator features. */
  currentUserId?: string;
  /** Current user's display name — written into the typing map so others can show "Alice is typing". */
  currentUserName?: string;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  /** Names of other participants currently typing (excluding self, excluding stale entries). */
  othersTyping: TypingUser[];
  /**
   * Mark the current user as typing (true) or clear their typing entry (false).
   * Debounced — calling repeatedly with `true` won't write more than once every
   * `TYPING_DEBOUNCE_MS`. Fire-and-forget; failures are swallowed (best-effort).
   */
  setTyping: (typing: boolean) => void;
}

/**
 * Subscribe to a request's messages and (optionally) participate in the
 * typing-indicator feature on the parent request document.
 */
export function useMessages(
  requestId: string | undefined,
  options: UseMessagesOptions = {},
): UseMessagesReturn {
  const { currentUserId, currentUserName } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [typingMap, setTypingMap] = useState<Record<string, { ts: number; name: string }>>({});

  // Tick state used solely to invalidate stale typing entries on a timer.
  const [now, setNow] = useState<number>(() => Date.now());

  // Tracking refs for the typing debounce/auto-clear behaviour.
  const lastTypingWriteRef = useRef<number>(0);
  const isTypingRef = useRef<boolean>(false);

  // ─── Messages subscription ───
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

  // ─── Typing-map subscription on the parent request doc ───
  useEffect(() => {
    if (!requestId) return;
    const unsubscribe = onSnapshot(
      doc(db, "requests", requestId),
      (snapshot) => {
        const data = snapshot.data();
        const raw = data?.typing as Record<string, unknown> | undefined;
        if (!raw) {
          setTypingMap({});
          return;
        }
        const next: Record<string, { ts: number; name: string }> = {};
        for (const uid of Object.keys(raw)) {
          const value = raw[uid];
          if (typeof value === "number") {
            next[uid] = { ts: value, name: "" };
          } else if (value && typeof value === "object") {
            const obj = value as { ts?: unknown; name?: unknown };
            const ts = typeof obj.ts === "number" ? obj.ts : 0;
            const name = typeof obj.name === "string" ? obj.name : "";
            next[uid] = { ts, name };
          }
        }
        setTypingMap(next);
      },
      // Failures here are non-fatal — typing UI just stays empty.
      () => undefined,
    );
    return unsubscribe;
  }, [requestId]);

  // Re-evaluate stale typing entries every second so the UI updates without
  // requiring another Firestore round-trip.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Derive `othersTyping` — exclude self and stale entries.
  const othersTyping: TypingUser[] = useMemo(() => {
    const result: TypingUser[] = [];
    for (const uid of Object.keys(typingMap)) {
      if (currentUserId && uid === currentUserId) continue;
      const entry = typingMap[uid];
      if (!entry) continue;
      if (now - entry.ts > TYPING_STALE_MS) continue;
      result.push({ name: entry.name || "Someone" });
    }
    return result;
  }, [typingMap, currentUserId, now]);

  // ─── setTyping action ───
  const setTyping = useCallback(
    (typing: boolean) => {
      if (!requestId || !currentUserId) return;
      const requestRef = doc(db, "requests", requestId);

      if (typing) {
        const nowMs = Date.now();
        if (isTypingRef.current && nowMs - lastTypingWriteRef.current < TYPING_DEBOUNCE_MS) {
          return; // already typing; debounce
        }
        isTypingRef.current = true;
        lastTypingWriteRef.current = nowMs;
        // Use dot-path so we only mutate this user's slot — required by the
        // Firestore security rule that pins every other field to its previous value.
        const update: Record<string, { ts: number; name: string }> = {};
        update[`typing.${currentUserId}`] = { ts: nowMs, name: currentUserName ?? "" };
        updateDoc(requestRef, update).catch(() => undefined);
      } else {
        if (!isTypingRef.current) return;
        isTypingRef.current = false;
        const update: Record<string, { ts: number; name: string }> = {};
        update[`typing.${currentUserId}`] = { ts: 0, name: currentUserName ?? "" };
        updateDoc(requestRef, update).catch(() => undefined);
      }
    },
    [requestId, currentUserId, currentUserName],
  );

  // Auto-clear: if the user types and then goes idle, clear their entry after the stale window.
  useEffect(() => {
    if (!isTypingRef.current) return;
    const id = setTimeout(() => {
      if (isTypingRef.current && Date.now() - lastTypingWriteRef.current >= TYPING_STALE_MS) {
        setTyping(false);
      }
    }, TYPING_STALE_MS);
    return () => clearTimeout(id);
  }, [now, setTyping]);

  // Best-effort cleanup on unmount so the indicator clears for other users.
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        if (requestId && currentUserId) {
          const update: Record<string, { ts: number; name: string }> = {};
          update[`typing.${currentUserId}`] = { ts: 0, name: currentUserName ?? "" };
          updateDoc(doc(db, "requests", requestId), update).catch(() => undefined);
        }
      }
    };
  }, [requestId, currentUserId, currentUserName]);

  return { messages, loading, error, othersTyping, setTyping };
}
