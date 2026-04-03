import { renderHook, act } from "@testing-library/react-native/pure";
import { useTenantRequests, useAllRequests } from "@/hooks/useRequests";
import { subscribeToTenantRequests, subscribeToAllRequests } from "@/services/requests";

jest.mock("@/services/requests", () => ({
  subscribeToTenantRequests: jest.fn(),
  subscribeToAllRequests: jest.fn(),
}));

const mockTenantSub = subscribeToTenantRequests as jest.Mock;
const mockAllSub = subscribeToAllRequests as jest.Mock;

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
});
