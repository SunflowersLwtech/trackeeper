import { renderHook } from "@testing-library/react-native/pure";
import { useNotes } from "@/hooks/useNotes";
import { subscribeToNotes } from "@/services/notes";

jest.mock("@/services/notes", () => ({
  subscribeToNotes: jest.fn(),
}));

const mockSubscribe = subscribeToNotes as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("useNotes", () => {
  it("starts with loading=true and empty notes", () => {
    mockSubscribe.mockReturnValue(jest.fn());
    const { result } = renderHook(() => useNotes("req-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.notes).toEqual([]);
  });

  it("sets notes and loading=false on callback", () => {
    const notes = [{ id: "n1", text: "Note" }];
    mockSubscribe.mockImplementation((_id: string, callback: (data: unknown[]) => void) => {
      callback(notes);
      return jest.fn();
    });

    const { result } = renderHook(() => useNotes("req-1"));
    expect(result.current.loading).toBe(false);
    expect(result.current.notes).toEqual(notes);
  });

  it("does not subscribe if requestId is undefined", () => {
    renderHook(() => useNotes(undefined));
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("cleans up on unmount", () => {
    const mockUnsub = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsub);

    const { unmount } = renderHook(() => useNotes("req-1"));
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });
});
