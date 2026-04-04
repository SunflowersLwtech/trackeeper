jest.mock("@/contexts/AuthContext", () => ({
  useAuth: jest.fn(() => ({ user: { uid: "test-uid", role: "tenant" }, loading: false })),
}));

import { useAuth } from "@/hooks/useAuth";
import { useAuth as useAuthFromContext } from "@/contexts/AuthContext";

describe("useAuth (re-export)", () => {
  it("re-exports useAuth from AuthContext", () => {
    expect(useAuth).toBe(useAuthFromContext);
  });

  it("returns the expected shape", () => {
    const result = useAuth();
    expect(result).toEqual({ user: { uid: "test-uid", role: "tenant" }, loading: false });
  });
});
