import { useCallback, useEffect, useRef, useState } from "react";
import { MaintenanceRequest } from "@/types";
import {
  subscribeToTenantRequests,
  subscribeToAllRequests,
  loadMoreTenantRequests,
  loadMoreAllRequests,
  PAGE_SIZE,
} from "@/services/requests";
import { Unsubscribe, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

/** Merge real-time page-1 data with extra paginated items, deduplicating by id. */
function mergeRequests(page1: MaintenanceRequest[], extra: MaintenanceRequest[]): MaintenanceRequest[] {
  if (extra.length === 0) return page1;
  const page1Ids = new Set(page1.map((r) => r.id));
  return [...page1, ...extra.filter((r) => !page1Ids.has(r.id))];
}

export function useTenantRequests(tenantId: string | undefined) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const extraRef = useRef<MaintenanceRequest[]>([]);

  const subscribe = useCallback(() => {
    if (!tenantId) return;
    unsubRef.current?.();
    setHasMore(true);
    lastDocRef.current = null;
    extraRef.current = [];
    unsubRef.current = subscribeToTenantRequests(
      tenantId,
      (data, lastDoc) => {
        setRequests(mergeRequests(data, extraRef.current));
        lastDocRef.current = lastDoc;
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
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

  const loadMore = useCallback(async () => {
    if (!tenantId || !lastDocRef.current || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await loadMoreTenantRequests(tenantId, lastDocRef.current);
      extraRef.current = [...extraRef.current, ...result.requests];
      setRequests((prev) => mergeRequests(prev, result.requests));
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more"));
    } finally {
      setLoadingMore(false);
    }
  }, [tenantId, loadingMore, hasMore]);

  return { requests, loading, error, refreshing, refresh, loadMore, loadingMore, hasMore };
}

export function useAllRequests() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const extraRef = useRef<MaintenanceRequest[]>([]);

  const subscribe = useCallback(() => {
    unsubRef.current?.();
    setHasMore(true);
    lastDocRef.current = null;
    extraRef.current = [];
    unsubRef.current = subscribeToAllRequests(
      (data, lastDoc) => {
        setRequests(mergeRequests(data, extraRef.current));
        lastDocRef.current = lastDoc;
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
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

  const loadMore = useCallback(async () => {
    if (!lastDocRef.current || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await loadMoreAllRequests(lastDocRef.current);
      extraRef.current = [...extraRef.current, ...result.requests];
      setRequests((prev) => mergeRequests(prev, result.requests));
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more"));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  return { requests, loading, error, refreshing, refresh, loadMore, loadingMore, hasMore };
}
