import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { setDoc, getDoc } from "firebase/firestore";

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  deleteUser: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => "mock-doc-ref"),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "mock-ts"),
}));

const mockAuth: { currentUser: { emailVerified: boolean } | null } = {
  currentUser: null,
};
jest.mock("@/config/firebase", () => ({
  get auth() { return mockAuth; },
  db: "mock-db",
}));

import {
  signIn,
  signUp,
  signOut,
  getUserProfile,
  updateUserProfile,
  onAuthChange,
  requestPasswordReset,
  sendCurrentUserEmailVerification,
} from "@/services/auth";

const mockSendReset = sendPasswordResetEmail as jest.Mock;
const mockSendVerify = sendEmailVerification as jest.Mock;

const mockSignIn = signInWithEmailAndPassword as jest.Mock;
const mockCreateUser = createUserWithEmailAndPassword as jest.Mock;
const mockFirebaseSignOut = firebaseSignOut as jest.Mock;
const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("signIn", () => {
  it("calls signInWithEmailAndPassword and returns user", async () => {
    const mockUser = { uid: "u1", email: "a@b.com" };
    mockSignIn.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: "u1", email: "a@b.com", role: "tenant", status: "active" }),
    });

    const user = await signIn("a@b.com", "pass123");
    expect(user).toEqual(mockUser);
    expect(mockSignIn).toHaveBeenCalledWith(mockAuth, "a@b.com", "pass123");
  });

  it("propagates auth errors", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
    await expect(signIn("bad@email.com", "wrong")).rejects.toThrow("Invalid credentials");
  });

  it("rejects pending_approval users with TenantAccountInactiveError", async () => {
    const mockUser = { uid: "u2", email: "pending@b.com" };
    mockSignIn.mockResolvedValue({ user: mockUser });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: "u2", email: "pending@b.com", role: "tenant", status: "pending_approval" }),
    });
    await expect(signIn("pending@b.com", "pass123")).rejects.toThrow(/pending manager approval/i);
    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });
});

describe("signUp", () => {
  it("creates user and writes pending_approval profile to Firestore", async () => {
    mockCreateUser.mockResolvedValue({ user: { uid: "new-uid" } });

    const result = await signUp("test@test.com", "pass123", "Test User", "tenant", "A-12");

    expect(mockCreateUser).toHaveBeenCalledWith(mockAuth, "test@test.com", "pass123");
    expect(mockSetDoc).toHaveBeenCalledWith("mock-doc-ref", {
      uid: "new-uid",
      email: "test@test.com",
      name: "Test User",
      role: "tenant",
      status: "pending_approval",
      unitNumber: "A-12",
      createdAt: "mock-ts",
    });
    expect(result).toEqual({
      uid: "new-uid",
      email: "test@test.com",
      name: "Test User",
      role: "tenant",
      status: "pending_approval",
      unitNumber: "A-12",
    });
  });

  it("deletes Auth account if Firestore profile write fails", async () => {
    const mockUser = { uid: "orphan-uid" };
    mockCreateUser.mockResolvedValue({ user: mockUser });
    mockSetDoc.mockRejectedValueOnce(new Error("PERMISSION_DENIED"));
    const mockDeleteUser = deleteUser as jest.Mock;

    await expect(signUp("t@test.com", "pass123", "Test", "tenant")).rejects.toThrow("PERMISSION_DENIED");
    expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
  });

  it("omits optional fields when empty so Firestore never sees undefined", async () => {
    mockCreateUser.mockResolvedValue({ user: { uid: "new-uid" } });

    const result = await signUp("t@test.com", "pass123", "Tenant", "tenant", "");

    expect(result.unitNumber).toBeUndefined();
    expect(mockSetDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.not.objectContaining({ unitNumber: undefined, phone: undefined }),
    );
  });
});

describe("signOut", () => {
  it("calls firebase signOut", async () => {
    await signOut();
    expect(mockFirebaseSignOut).toHaveBeenCalledWith(mockAuth);
  });
});

describe("getUserProfile", () => {
  it("returns user data when document exists", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: "u1", name: "John", email: "j@test.com", role: "tenant" }),
    });

    const profile = await getUserProfile("u1");
    expect(profile).toEqual({ uid: "u1", name: "John", email: "j@test.com", role: "tenant" });
  });

  it("returns null when document does not exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const profile = await getUserProfile("nonexistent");
    expect(profile).toBeNull();
  });
});

describe("updateUserProfile", () => {
  it("merges fields into user document", async () => {
    await updateUserProfile("u1", { name: "Updated Name" });
    expect(mockSetDoc).toHaveBeenCalledWith("mock-doc-ref", { name: "Updated Name" }, { merge: true });
  });

  it("strips undefined fields before merging user profile", async () => {
    await updateUserProfile("u1", { name: "Updated Name", phone: undefined });
    expect(mockSetDoc).toHaveBeenCalledWith("mock-doc-ref", { name: "Updated Name" }, { merge: true });
  });
});

describe("onAuthChange", () => {
  it("subscribes to auth state changes", () => {
    const mockUnsub = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(mockUnsub);

    const callback = jest.fn();
    const unsub = onAuthChange(callback);

    expect(mockOnAuthStateChanged).toHaveBeenCalledWith(mockAuth, callback);
    expect(unsub).toBe(mockUnsub);
  });
});

describe("requestPasswordReset", () => {
  it("calls Firebase sendPasswordResetEmail with trimmed email", async () => {
    await requestPasswordReset("  alice@demo.trackeeper.app  ");
    expect(mockSendReset).toHaveBeenCalledWith(mockAuth, "alice@demo.trackeeper.app");
  });

  it("swallows auth/user-not-found to prevent account enumeration", async () => {
    const err = Object.assign(new Error("not found"), { code: "auth/user-not-found" });
    mockSendReset.mockRejectedValueOnce(err);
    await expect(requestPasswordReset("ghost@x.com")).resolves.toBeUndefined();
  });

  it("swallows auth/invalid-email so the surface looks identical", async () => {
    const err = Object.assign(new Error("bad format"), { code: "auth/invalid-email" });
    mockSendReset.mockRejectedValueOnce(err);
    await expect(requestPasswordReset("???")).resolves.toBeUndefined();
  });

  it("re-throws unexpected errors (network etc.) so the UI can surface them", async () => {
    const err = Object.assign(new Error("offline"), { code: "auth/network-request-failed" });
    mockSendReset.mockRejectedValueOnce(err);
    await expect(requestPasswordReset("alice@x.com")).rejects.toThrow("offline");
  });
});

describe("sendCurrentUserEmailVerification", () => {
  beforeEach(() => {
    mockAuth.currentUser = null;
  });

  it("throws when no user is signed in", async () => {
    await expect(sendCurrentUserEmailVerification()).rejects.toThrow(/not signed in/i);
  });

  it("returns false (no-op) when already verified", async () => {
    mockAuth.currentUser = { emailVerified: true };
    await expect(sendCurrentUserEmailVerification()).resolves.toBe(false);
    expect(mockSendVerify).not.toHaveBeenCalled();
  });

  it("sends a verification email and returns true when not yet verified", async () => {
    mockAuth.currentUser = { emailVerified: false };
    await expect(sendCurrentUserEmailVerification()).resolves.toBe(true);
    expect(mockSendVerify).toHaveBeenCalledWith(mockAuth.currentUser);
  });
});
