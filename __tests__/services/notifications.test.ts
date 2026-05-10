/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

jest.mock("expo-device", () => ({ isDevice: true }));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("firebase/firestore", () => ({
  addDoc: jest.fn(() => Promise.resolve({ id: "notif-1" })),
  collection: jest.fn((...args) => ["collection", ...args]),
  doc: jest.fn(() => "mock-doc-ref"),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => "mock-ts"),
  deleteField: jest.fn(() => "FIELD_DELETE_SENTINEL"),
}));

jest.mock("@/config/firebase", () => ({ db: "mock-db" }));

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

// Get mock references from the mocked module
const mockNotifications = require("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  getExpoPushTokenAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  setNotificationHandler: jest.Mock;
  setNotificationChannelAsync: jest.Mock;
  addNotificationReceivedListener: jest.Mock;
  addNotificationResponseReceivedListener: jest.Mock;
};

import { addDoc, setDoc } from "firebase/firestore";
import {
  unregisterPushToken,
  sendLocalNotification,
  createNotification,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from "@/services/notifications";

const mockSetDoc = setDoc as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("registerForPushNotifications", () => {
  it("returns null on non-physical device", async () => {
    jest.resetModules();
    jest.doMock("expo-device", () => ({ isDevice: false }));
    jest.doMock("react-native", () => ({ Platform: { OS: "ios" } }));
    jest.doMock("firebase/firestore", () => ({
      doc: jest.fn(() => "mock-doc-ref"),
      setDoc: jest.fn(() => Promise.resolve()),
      deleteField: jest.fn(),
    }));
    jest.doMock("@/config/firebase", () => ({ db: "mock-db" }));
    jest.doMock("expo-notifications", () => ({
      setNotificationHandler: jest.fn(),
    }));

    const mod = require("@/services/notifications");
    const result = await mod.registerForPushNotifications("user-1");
    expect(result).toBeNull();
  });

  it("returns null on web platform", async () => {
    jest.resetModules();
    jest.doMock("expo-device", () => ({ isDevice: true }));
    jest.doMock("react-native", () => ({ Platform: { OS: "web" } }));
    jest.doMock("firebase/firestore", () => ({
      doc: jest.fn(() => "mock-doc-ref"),
      setDoc: jest.fn(() => Promise.resolve()),
      deleteField: jest.fn(),
    }));
    jest.doMock("@/config/firebase", () => ({ db: "mock-db" }));
    jest.doMock("expo-notifications", () => ({
      setNotificationHandler: jest.fn(),
    }));

    const mod = require("@/services/notifications");
    const result = await mod.registerForPushNotifications("user-1");
    expect(result).toBeNull();
  });

  it("returns null when permission denied", async () => {
    jest.resetModules();
    jest.doMock("expo-device", () => ({ isDevice: true }));
    jest.doMock("react-native", () => ({ Platform: { OS: "ios" } }));
    jest.doMock("firebase/firestore", () => ({
      doc: jest.fn(() => "mock-doc-ref"),
      setDoc: jest.fn(() => Promise.resolve()),
      deleteField: jest.fn(),
    }));
    jest.doMock("@/config/firebase", () => ({ db: "mock-db" }));
    jest.doMock("expo-notifications", () => ({
      setNotificationHandler: jest.fn(),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "denied" }),
    }));

    const mod = require("@/services/notifications");
    const result = await mod.registerForPushNotifications("user-1");
    expect(result).toBeNull();
  });

  it("registers and saves token when permission granted", async () => {
    jest.resetModules();
    const mockSD = jest.fn(() => Promise.resolve());
    jest.doMock("expo-device", () => ({ isDevice: true }));
    jest.doMock("react-native", () => ({ Platform: { OS: "ios" } }));
    jest.doMock("firebase/firestore", () => ({
      doc: jest.fn(() => "mock-doc-ref"),
      setDoc: mockSD,
      deleteField: jest.fn(),
    }));
    jest.doMock("@/config/firebase", () => ({ db: "mock-db" }));
    jest.doMock("expo-notifications", () => ({
      setNotificationHandler: jest.fn(),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
      getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "ExponentPushToken[xxx]" }),
    }));

    const mod = require("@/services/notifications");
    const result = await mod.registerForPushNotifications("user-1");

    expect(result).toBe("ExponentPushToken[xxx]");
    expect(mockSD).toHaveBeenCalledWith(
      "mock-doc-ref",
      { pushToken: "ExponentPushToken[xxx]" },
      { merge: true },
    );
  });

  it("requests permission when not already granted", async () => {
    jest.resetModules();
    const mockReqPerms = jest.fn().mockResolvedValue({ status: "granted" });
    jest.doMock("expo-device", () => ({ isDevice: true }));
    jest.doMock("react-native", () => ({ Platform: { OS: "ios" } }));
    jest.doMock("firebase/firestore", () => ({
      doc: jest.fn(() => "mock-doc-ref"),
      setDoc: jest.fn(() => Promise.resolve()),
      deleteField: jest.fn(),
    }));
    jest.doMock("@/config/firebase", () => ({ db: "mock-db" }));
    jest.doMock("expo-notifications", () => ({
      setNotificationHandler: jest.fn(),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: "undetermined" }),
      requestPermissionsAsync: mockReqPerms,
      getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "ExponentPushToken[yyy]" }),
    }));

    const mod = require("@/services/notifications");
    const result = await mod.registerForPushNotifications("user-1");

    expect(mockReqPerms).toHaveBeenCalled();
    expect(result).toBe("ExponentPushToken[yyy]");
  });
});

describe("unregisterPushToken", () => {
  it("removes pushToken field from user document", async () => {
    await unregisterPushToken("user-1");

    expect(mockSetDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      { pushToken: "FIELD_DELETE_SENTINEL" },
      { merge: true },
    );
  });
});

describe("createNotification", () => {
  it("omits undefined deep-link fields for approval notifications", async () => {
    await createNotification("tenant-1", {
      kind: "tenant_approved",
      title: "Account approved",
      body: "Welcome",
      actorId: "manager-1",
    });

    const payload = mockAddDoc.mock.calls[0][1];
    expect(payload.deepLink).toEqual({ category: "approval" });
    expect(JSON.stringify(payload)).not.toContain("undefined");
  });

  it("includes request deep-link fields when a request id is present", async () => {
    await createNotification("tenant-1", {
      kind: "request_assigned",
      title: "Assigned",
      body: "On the way",
      requestId: "req-1",
    });

    expect(mockAddDoc.mock.calls[0][1]).toEqual(expect.objectContaining({
      requestId: "req-1",
      deepLink: {
        ticketId: "req-1",
        threadId: "req-1",
        category: "assign",
      },
    }));
  });
});

describe("sendLocalNotification", () => {
  it("schedules an immediate notification", async () => {
    mockNotifications.scheduleNotificationAsync.mockResolvedValue("notif-id");
    await sendLocalNotification("Test Title", "Test Body");

    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: "Test Title",
        body: "Test Body",
        sound: true,
        // Empty deep-link data is included so the OS push payload is
        // shaped consistently — extracted by the in-app handler when set.
        data: {},
      },
      trigger: null,
    });
  });
});

describe("addNotificationReceivedListener", () => {
  it("delegates to expo-notifications", () => {
    const handler = jest.fn();
    const mockSub = { remove: jest.fn() };
    mockNotifications.addNotificationReceivedListener.mockReturnValue(mockSub);

    const result = addNotificationReceivedListener(handler);

    expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalledWith(handler);
    expect(result).toBe(mockSub);
  });
});

describe("addNotificationResponseListener", () => {
  it("delegates to expo-notifications", () => {
    const handler = jest.fn();
    const mockSub = { remove: jest.fn() };
    mockNotifications.addNotificationResponseReceivedListener.mockReturnValue(mockSub);

    const result = addNotificationResponseListener(handler);

    expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(handler);
    expect(result).toBe(mockSub);
  });
});
