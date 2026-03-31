import { renderHook, act } from "@testing-library/react-native/pure";
import { useMaintainers } from "@/hooks/useMaintainers";
import { subscribeToMaintainers } from "@/services/users";

jest.mock("@/services/users", () => ({
  subscribeToMaintainers: jest.fn(),
}));

const mockSubscribe = subscribeToMaintainers as jest.MockedFunction<typeof subscribeToMaintainers>;

beforeEach(() => jest.clearAllMocks());

describe("useMaintainers", () => {
  it("starts with loading true and empty list", () => {
    mockSubscribe.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useMaintainers());
    expect(result.current.loading).toBe(true);
    expect(result.current.maintainers).toEqual([]);
  });

  it("updates with maintainer data", () => {
    const mockUnsub = jest.fn();
    mockSubscribe.mockImplementation((cb) => {
      cb([
        { uid: "m1", name: "John", email: "j@t.com", role: "maintainer" as const },
      ]);
      return mockUnsub;
    });
    const { result } = renderHook(() => useMaintainers());
    expect(result.current.loading).toBe(false);
    expect(result.current.maintainers).toHaveLength(1);
    expect(result.current.maintainers[0].name).toBe("John");
  });

  it("cleans up subscription on unmount", () => {
    const mockUnsub = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsub);
    const { unmount } = renderHook(() => useMaintainers());
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });
});
