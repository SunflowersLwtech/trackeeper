import { renderHook } from "@testing-library/react-native/pure";
import { useMessages } from "@/hooks/useMessages";
import { subscribeToMessages } from "@/services/messages";

jest.mock("@/services/messages", () => ({
  subscribeToMessages: jest.fn(),
}));

const mockSubscribe = subscribeToMessages as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("useMessages", () => {
  it("starts with loading=true and empty messages", () => {
    mockSubscribe.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useMessages("req-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);
  });

  it("sets messages and loading=false on callback", () => {
    const msgs = [{ id: "m1", text: "Hi" }, { id: "m2", text: "Hey" }];
    mockSubscribe.mockImplementation((_id: string, callback: (data: unknown[]) => void) => {
      callback(msgs);
      return jest.fn();
    });

    const { result } = renderHook(() => useMessages("req-1"));
    expect(result.current.loading).toBe(false);
    expect(result.current.messages).toEqual(msgs);
  });

  it("sets error on error callback", () => {
    const error = new Error("fail");
    mockSubscribe.mockImplementation((_id: string, _cb: unknown, errCb: (e: Error) => void) => {
      errCb(error);
      return jest.fn();
    });

    const { result } = renderHook(() => useMessages("req-1"));
    expect(result.current.error).toBe(error);
  });

  it("does not subscribe if requestId is undefined", () => {
    renderHook(() => useMessages(undefined));
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const mockUnsub = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsub);

    const { unmount } = renderHook(() => useMessages("req-1"));
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });
});
