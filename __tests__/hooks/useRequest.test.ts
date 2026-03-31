import { renderHook, act } from "@testing-library/react-native/pure";
import { useRequest } from "@/hooks/useRequest";
import { subscribeToRequest } from "@/services/requests";

jest.mock("@/services/requests", () => ({
  subscribeToRequest: jest.fn(),
}));

const mockSubscribe = subscribeToRequest as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("useRequest", () => {
  it("starts with loading=true and request=null", () => {
    mockSubscribe.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useRequest("req-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.request).toBeNull();
  });

  it("calls subscribeToRequest with requestId", () => {
    mockSubscribe.mockReturnValue(jest.fn());
    renderHook(() => useRequest("req-1"));
    expect(mockSubscribe).toHaveBeenCalledWith("req-1", expect.any(Function), expect.any(Function));
  });

  it("sets request data and loading=false on callback", () => {
    mockSubscribe.mockImplementation((_id: string, callback: (data: unknown) => void) => {
      callback({ id: "req-1", title: "Test", status: "submitted" });
      return jest.fn();
    });

    const { result } = renderHook(() => useRequest("req-1"));
    expect(result.current.loading).toBe(false);
    expect(result.current.request).toEqual({ id: "req-1", title: "Test", status: "submitted" });
  });

  it("sets error on error callback", () => {
    const error = new Error("Network error");
    mockSubscribe.mockImplementation((_id: string, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(error);
      return jest.fn();
    });

    const { result } = renderHook(() => useRequest("req-1"));
    expect(result.current.error).toBe(error);
    expect(result.current.loading).toBe(false);
  });

  it("does not subscribe if requestId is undefined", () => {
    const { result } = renderHook(() => useRequest(undefined));
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  it("calls unsubscribe on unmount", () => {
    const mockUnsub = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsub);

    const { unmount } = renderHook(() => useRequest("req-1"));
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });
});
