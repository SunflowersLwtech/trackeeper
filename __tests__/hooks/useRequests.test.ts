import { renderHook, act } from "@testing-library/react-native/pure";
import { useTenantRequests, useAllRequests } from "@/hooks/useRequests";
import {
  subscribeToTenantRequests,
  subscribeToAllRequests,
  loadMoreTenantRequests,
  loadMoreAllRequests,
  PAGE_SIZE,
} from "@/services/requests";

jest.mock("@/services/requests", () => ({
  subscribeToTenantRequests: jest.fn(),
  subscribeToAllRequests: jest.fn(),
  loadMoreTenantRequests: jest.fn(),
  loadMoreAllRequests: jest.fn(),
  PAGE_SIZE: 20,
}));

const mockTenantSub = subscribeToTenantRequests as jest.Mock;
const mockAllSub = subscribeToAllRequests as jest.Mock;
const mockLoadMoreTenant = loadMoreTenantRequests as jest.Mock;
const mockLoadMoreAll = loadMoreAllRequests as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("useTenantRequests", () => {
  it("starts with loading=true and empty requests", () => {
    mockTenantSub.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useTenantRequests("user-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.requests).toEqual([]);
  });

  it("sets requests and loading=false on callback", () => {
    const reqs = [{ id: "r1", title: "A" }];
    mockTenantSub.mockImplementation((_id: string, callback: (data: unknown[], lastDoc: unknown) => void) => {
      callback(reqs, null);
      return jest.fn();
    });

    const { result } = renderHook(() => useTenantRequests("user-1"));
    expect(result.current.loading).toBe(false);
    expect(result.current.requests).toEqual(reqs);
  });

  it("does not subscribe if tenantId is undefined", () => {
    renderHook(() => useTenantRequests(undefined));
    expect(mockTenantSub).not.toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const mockUnsub = jest.fn();
    mockTenantSub.mockReturnValue(mockUnsub);

    const { unmount } = renderHook(() => useTenantRequests("user-1"));
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });

  it("supports refresh (resubscribe)", () => {
    mockTenantSub.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useTenantRequests("user-1"));

    act(() => {
      result.current.refresh();
    });

    // Should have called subscribe twice (initial + refresh)
    expect(mockTenantSub).toHaveBeenCalledTimes(2);
    expect(result.current.refreshing).toBe(true);
  });

  it("sets error on error callback", () => {
    const error = new Error("Network error");
    mockTenantSub.mockImplementation((_id: string, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(error);
      return jest.fn();
    });

    const { result } = renderHook(() => useTenantRequests("user-1"));
    expect(result.current.error).toBe(error);
    expect(result.current.loading).toBe(false);
  });
});

describe("useAllRequests", () => {
  it("starts with loading=true and empty requests", () => {
    mockAllSub.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useAllRequests());
    expect(result.current.loading).toBe(true);
    expect(result.current.requests).toEqual([]);
  });

  it("sets requests on callback", () => {
    const reqs = [{ id: "r1" }, { id: "r2" }];
    mockAllSub.mockImplementation((callback: (data: unknown[], lastDoc: unknown) => void) => {
      callback(reqs, null);
      return jest.fn();
    });

    const { result } = renderHook(() => useAllRequests());
    expect(result.current.requests).toEqual(reqs);
    expect(result.current.loading).toBe(false);
  });

  it("cleans up on unmount", () => {
    const mockUnsub = jest.fn();
    mockAllSub.mockReturnValue(mockUnsub);

    const { unmount } = renderHook(() => useAllRequests());
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });

  it("supports refresh", () => {
    mockAllSub.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useAllRequests());

    act(() => {
      result.current.refresh();
    });

    expect(mockAllSub).toHaveBeenCalledTimes(2);
  });

  it("sets error on error callback", () => {
    const error = new Error("fail");
    mockAllSub.mockImplementation((_cb: unknown, errCb: (e: Error) => void) => {
      errCb(error);
      return jest.fn();
    });

    const { result } = renderHook(() => useAllRequests());
    expect(result.current.error).toBe(error);
    expect(result.current.loading).toBe(false);
  });

  it("loadMore appends paginated results", async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: `r${i}` }));
    mockAllSub.mockImplementation((cb: (data: unknown[], lastDoc: unknown) => void) => {
      cb(page1, "last-doc");
      return jest.fn();
    });

    mockLoadMoreAll.mockResolvedValue({ requests: [{ id: "extra-1" }], lastDoc: "last-2", hasMore: false });

    const { result } = renderHook(() => useAllRequests());

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockLoadMoreAll).toHaveBeenCalled();
    expect(result.current.requests).toHaveLength(PAGE_SIZE + 1);
    expect(result.current.hasMore).toBe(false);
  });

  it("loadMore handles errors", async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: `r${i}` }));
    mockAllSub.mockImplementation((cb: (data: unknown[], lastDoc: unknown) => void) => {
      cb(page1, "last-doc");
      return jest.fn();
    });

    mockLoadMoreAll.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAllRequests());

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.error?.message).toBe("Network error");
    expect(result.current.loadingMore).toBe(false);
  });
});

describe("useTenantRequests — loadMore", () => {
  it("loadMore appends paginated results", async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: `r${i}` }));
    mockTenantSub.mockImplementation((_id: string, cb: (data: unknown[], lastDoc: unknown) => void) => {
      cb(page1, "last-doc");
      return jest.fn();
    });

    mockLoadMoreTenant.mockResolvedValue({ requests: [{ id: "extra-1" }], lastDoc: "last-2", hasMore: false });

    const { result } = renderHook(() => useTenantRequests("user-1"));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockLoadMoreTenant).toHaveBeenCalled();
    expect(result.current.requests).toHaveLength(PAGE_SIZE + 1);
  });

  it("loadMore handles errors gracefully", async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: `r${i}` }));
    mockTenantSub.mockImplementation((_id: string, cb: (data: unknown[], lastDoc: unknown) => void) => {
      cb(page1, "last-doc");
      return jest.fn();
    });

    mockLoadMoreTenant.mockRejectedValue("string error");

    const { result } = renderHook(() => useTenantRequests("user-1"));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.error?.message).toBe("Failed to load more");
    expect(result.current.loadingMore).toBe(false);
  });

  it("loadMore does nothing when hasMore is false", async () => {
    // Return fewer items than PAGE_SIZE → hasMore=false
    mockTenantSub.mockImplementation((_id: string, cb: (data: unknown[], lastDoc: unknown) => void) => {
      cb([{ id: "r1" }], "last-doc");
      return jest.fn();
    });

    const { result } = renderHook(() => useTenantRequests("user-1"));
    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockLoadMoreTenant).not.toHaveBeenCalled();
  });
});
