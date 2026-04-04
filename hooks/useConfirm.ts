import { useState, useCallback } from "react";

interface ConfirmState {
  visible: boolean;
  title: string;
  message: string;
  destructive: boolean;
  onConfirm: () => void;
}

const INITIAL: ConfirmState = {
  visible: false,
  title: "",
  message: "",
  destructive: false,
  onConfirm: () => {},
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(INITIAL);

  const confirm = useCallback(
    (title: string, message: string, onConfirm: () => void, options?: { destructive?: boolean }) => {
      setState({
        visible: true,
        title,
        message,
        destructive: options?.destructive ?? false,
        onConfirm,
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    state.onConfirm();
    setState(INITIAL);
  }, [state]);

  const handleCancel = useCallback(() => {
    setState(INITIAL);
  }, []);

  return {
    confirmProps: {
      visible: state.visible,
      title: state.title,
      message: state.message,
      destructive: state.destructive,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
    confirm,
  };
}
