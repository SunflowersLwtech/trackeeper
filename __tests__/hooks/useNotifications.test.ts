import { renderHook } from "@testing-library/react-native/pure";

const mockRegister = jest.fn(() => Promise.resolve("token"));
const mockReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
const mockResponseListener = jest.fn(() => ({ remove: jest.fn() }));
const mockRouterPush = jest.fn();

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => ({ user: null })),
}));

jest.mock("@/services/notifications", () => ({
  registerForPushNotifications: (...args: unknown[]) => mockRegister(...args),
  addNotificationReceivedListener: (...args: unknown[]) => mockReceivedListener(...args),
  addNotificationResponseListener: (...args: unknown[]) => mockResponseListener(...args),
}));

jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

jest.mock("expo-notifications", () => ({
  EventSubscription: {},
}));

import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const mockUseAuth = useAuth as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: null });
});

describe("useNotifications", () => {
  it("does nothing when user is null", () => {
    renderHook(() => useNotifications());
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockReceivedListener).not.toHaveBeenCalled();
  });

  it("registers and sets up listeners when user is present", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "u1", role: "tenant" } });
    renderHook(() => useNotifications());

    expect(mockRegister).toHaveBeenCalledWith("u1");
    expect(mockReceivedListener).toHaveBeenCalled();
    expect(mockResponseListener).toHaveBeenCalled();
  });

  it("navigates to tenant route on notification tap for tenant", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "u1", role: "tenant" } });
    mockResponseListener.mockImplementation((handler: (response: unknown) => void) => {
      handler({
        notification: { request: { content: { data: { requestId: "req-1" } } } },
      });
      return { remove: jest.fn() };
    });

    renderHook(() => useNotifications());
    expect(mockRouterPush).toHaveBeenCalledWith("/(tenant)/req-1");
  });

  it("navigates to manager route for manager role", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "u1", role: "manager" } });
    mockResponseListener.mockImplementation((handler: (response: unknown) => void) => {
      handler({
        notification: { request: { content: { data: { requestId: "req-2" } } } },
      });
      return { remove: jest.fn() };
    });

    renderHook(() => useNotifications());
    expect(mockRouterPush).toHaveBeenCalledWith("/(manager)/req-2");
  });

  it("navigates to maintainer route for maintainer role", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "u1", role: "maintainer" } });
    mockResponseListener.mockImplementation((handler: (response: unknown) => void) => {
      handler({
        notification: { request: { content: { data: { requestId: "req-3" } } } },
      });
      return { remove: jest.fn() };
    });

    renderHook(() => useNotifications());
    expect(mockRouterPush).toHaveBeenCalledWith("/(maintainer)/req-3");
  });

  it("does not navigate when requestId is missing", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "u1", role: "tenant" } });
    mockResponseListener.mockImplementation((handler: (response: unknown) => void) => {
      handler({
        notification: { request: { content: { data: {} } } },
      });
      return { remove: jest.fn() };
    });

    renderHook(() => useNotifications());
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("cleans up listeners on unmount", () => {
    const mockRemoveReceived = jest.fn();
    const mockRemoveResponse = jest.fn();
    mockUseAuth.mockReturnValue({ user: { uid: "u1", role: "tenant" } });
    mockReceivedListener.mockReturnValue({ remove: mockRemoveReceived });
    mockResponseListener.mockReturnValue({ remove: mockRemoveResponse });

    const { unmount } = renderHook(() => useNotifications());
    unmount();

    expect(mockRemoveReceived).toHaveBeenCalled();
    expect(mockRemoveResponse).toHaveBeenCalled();
  });
});
