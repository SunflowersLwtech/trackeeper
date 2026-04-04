import { renderHook, act } from "@testing-library/react-native/pure";
import { useConfirm } from "@/hooks/useConfirm";

describe("useConfirm", () => {
  it("starts with visible=false and empty fields", () => {
    const { result } = renderHook(() => useConfirm());
    expect(result.current.confirmProps.visible).toBe(false);
    expect(result.current.confirmProps.title).toBe("");
    expect(result.current.confirmProps.message).toBe("");
    expect(result.current.confirmProps.destructive).toBe(false);
  });

  it("opens confirmation dialog with provided values", () => {
    const { result } = renderHook(() => useConfirm());
    const onConfirm = jest.fn();

    act(() => {
      result.current.confirm("Delete?", "Are you sure?", onConfirm);
    });

    expect(result.current.confirmProps.visible).toBe(true);
    expect(result.current.confirmProps.title).toBe("Delete?");
    expect(result.current.confirmProps.message).toBe("Are you sure?");
    expect(result.current.confirmProps.destructive).toBe(false);
  });

  it("supports destructive option", () => {
    const { result } = renderHook(() => useConfirm());

    act(() => {
      result.current.confirm("Delete", "Permanent action", jest.fn(), { destructive: true });
    });

    expect(result.current.confirmProps.destructive).toBe(true);
  });

  it("calls onConfirm and resets state on handleConfirm", () => {
    const { result } = renderHook(() => useConfirm());
    const onConfirm = jest.fn();

    act(() => {
      result.current.confirm("Title", "Message", onConfirm);
    });

    act(() => {
      result.current.confirmProps.onConfirm();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(result.current.confirmProps.visible).toBe(false);
    expect(result.current.confirmProps.title).toBe("");
  });

  it("resets state on handleCancel without calling onConfirm", () => {
    const { result } = renderHook(() => useConfirm());
    const onConfirm = jest.fn();

    act(() => {
      result.current.confirm("Title", "Message", onConfirm);
    });

    act(() => {
      result.current.confirmProps.onCancel();
    });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(result.current.confirmProps.visible).toBe(false);
  });
});
