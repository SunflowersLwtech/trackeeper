import { renderHook, act } from "@testing-library/react-native/pure";
import { useMaintainerRequests } from "@/hooks/useMaintainerRequests";
import { subscribeToMaintainerRequests } from "@/services/requests";

jest.mock("@/services/requests", () => ({
  subscribeToMaintainerRequests: jest.fn(),
}));

const mockSubscribe = subscribeToMaintainerRequests as jest.MockedFunction<typeof subscribeToMaintainerRequests>;

beforeEach(() => jest.clearAllMocks());

describe("useMaintainerRequests", () => {
  it("starts with loading true", () => {
    mockSubscribe.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useMaintainerRequests("maint-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.requests).toEqual([]);
  });

  it("does not subscribe without maintainerId", () => {
    const { result } = renderHook(() => useMaintainerRequests(undefined));
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("updates with request data", () => {
    const mockUnsub = jest.fn();
    mockSubscribe.mockImplementation((id, cb) => {
      cb([{ id: "r1", title: "Fix pipe", status: "assigned" }] as any);
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
});
