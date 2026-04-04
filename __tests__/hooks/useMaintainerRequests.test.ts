import { renderHook, act } from "@testing-library/react-native/pure";
import { useMaintainerRequests } from "@/hooks/useMaintainerRequests";
import { subscribeToMaintainerRequests, loadMoreMaintainerRequests, PAGE_SIZE } from "@/services/requests";
import { MaintenanceRequest } from "@/types";

jest.mock("@/services/requests", () => ({
  subscribeToMaintainerRequests: jest.fn(),
  loadMoreMaintainerRequests: jest.fn(),
  PAGE_SIZE: 20,
}));

const mockSubscribe = subscribeToMaintainerRequests as jest.MockedFunction<typeof subscribeToMaintainerRequests>;
const mockLoadMore = loadMoreMaintainerRequests as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("useMaintainerRequests", () => {
  it("starts with loading true", () => {
    mockSubscribe.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useMaintainerRequests("maint-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.requests).toEqual([]);
  });

  it("does not subscribe without maintainerId", () => {
    renderHook(() => useMaintainerRequests(undefined));
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("updates with request data", () => {
    const mockUnsub = jest.fn();
    mockSubscribe.mockImplementation((id, cb) => {
      cb([{ id: "r1", title: "Fix pipe", status: "assigned" } as MaintenanceRequest], null);
      return mockUnsub;
    });
    const { result } = renderHook(() => useMaintainerRequests("maint-1"));
    expect(result.current.loading).toBe(false);
    expect(result.current.requests).toHaveLength(1);
  });

  it("cleans up on unmount", () => {
    const mockUnsub = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsub);
    const { unmount } = renderHook(() => useMaintainerRequests("maint-1"));
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });

  it("sets error on error callback", () => {
    const error = new Error("Network error");
    mockSubscribe.mockImplementation((_id, _cb, errCb) => {
      if (errCb) errCb(error);
      return jest.fn();
    });
    const { result } = renderHook(() => useMaintainerRequests("maint-1"));
    expect(result.current.error).toBe(error);
    expect(result.current.loading).toBe(false);
  });

  it("supports refresh (resubscribe)", () => {
    mockSubscribe.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useMaintainerRequests("maint-1"));

    act(() => {
      result.current.refresh();
    });

    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(result.current.refreshing).toBe(true);
  });

  it("sets hasMore=false when page not full", () => {
    // Return fewer items than PAGE_SIZE → hasMore should be false
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `r${i}`,
      title: `Request ${i}`,
    })) as unknown as MaintenanceRequest[];

    mockSubscribe.mockImplementation((_id, cb) => {
      cb(items, "last-doc" as never);
      return jest.fn();
    });

    const { result } = renderHook(() => useMaintainerRequests("maint-1"));
    expect(result.current.hasMore).toBe(false);
  });

  it("sets hasMore=true when page is full", () => {
    const items = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: `r${i}`,
      title: `Request ${i}`,
    })) as unknown as MaintenanceRequest[];

    mockSubscribe.mockImplementation((_id, cb) => {
      cb(items, "last-doc" as never);
      return jest.fn();
    });

    const { result } = renderHook(() => useMaintainerRequests("maint-1"));
    expect(result.current.hasMore).toBe(true);
  });

  it("loadMore does nothing without maintainerId", async () => {
    renderHook(() => useMaintainerRequests(undefined));
    // loadMore should not call the service
    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it("loadMore appends paginated results", async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: `r${i}`,
      title: `Request ${i}`,
    })) as unknown as MaintenanceRequest[];

    mockSubscribe.mockImplementation((_id, cb) => {
      cb(page1, "last-doc" as never);
      return jest.fn();
    });

    const extraItems = [{ id: "extra-1", title: "Extra" }] as unknown as MaintenanceRequest[];
    mockLoadMore.mockResolvedValue({ requests: extraItems, lastDoc: "last-doc-2", hasMore: false });

    const { result } = renderHook(() => useMaintainerRequests("maint-1"));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockLoadMore).toHaveBeenCalled();
    expect(result.current.requests).toHaveLength(PAGE_SIZE + 1);
    expect(result.current.hasMore).toBe(false);
  });

  it("loadMore handles errors gracefully", async () => {
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) => ({
      id: `r${i}`,
    })) as unknown as MaintenanceRequest[];

    mockSubscribe.mockImplementation((_id, cb) => {
      cb(page1, "last-doc" as never);
      return jest.fn();
    });

    mockLoadMore.mockRejectedValue(new Error("Load more failed"));

    const { result } = renderHook(() => useMaintainerRequests("maint-1"));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.error?.message).toBe("Load more failed");
    expect(result.current.loadingMore).toBe(false);
  });
});
