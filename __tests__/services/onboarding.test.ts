const mockSetDoc = jest.fn().mockResolvedValue(undefined);
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => "mock-doc-ref"),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: jest.fn(() => "mock-ts"),
  Timestamp: { now: () => ({ seconds: 1700000000, nanoseconds: 0 }) },
}));

const Timestamp = { now: () => ({ seconds: 1700000000, nanoseconds: 0 }) as any };
jest.mock("@/config/firebase", () => ({ db: "mock-db" }));

import {
  getOnboardingSlides,
  shouldShowOnboarding,
  markOnboardingComplete,
  markOnboardingSkipped,
  resetOnboarding,
} from "@/services/onboarding";
import { ONBOARDING_VERSION } from "@/types";

beforeEach(() => mockSetDoc.mockClear());

describe("getOnboardingSlides", () => {
  it("returns 3 slides for tenant", () => {
    const slides = getOnboardingSlides("tenant");
    expect(slides).toHaveLength(3);
    expect(slides.map((s) => s.key)).toEqual([
      "tenant-1-photo-report",
      "tenant-2-track-status",
      "tenant-3-rate-history",
    ]);
  });

  it("returns 3 slides for manager focused on assignment + payments", () => {
    const slides = getOnboardingSlides("manager");
    expect(slides).toHaveLength(3);
    expect(slides[0].title).toMatch(/SLA/i);
    expect(slides.some((s) => /Cost|payment/i.test(s.title))).toBe(true);
  });

  it("returns 3 slides for maintainer focused on tasks + earnings", () => {
    const slides = getOnboardingSlides("maintainer");
    expect(slides).toHaveLength(3);
    expect(slides[0].title.toLowerCase()).toContain("task");
    expect(slides.some((s) => /earnings/i.test(s.title))).toBe(true);
  });

  it("falls back to tenant slides for unknown roles", () => {
    const slides = getOnboardingSlides("unknown" as never);
    expect(slides[0].key).toContain("tenant");
  });
});

describe("shouldShowOnboarding", () => {
  it("returns false for null user", () => {
    expect(shouldShowOnboarding(null)).toBe(false);
  });

  it("returns true for a brand-new user", () => {
    expect(shouldShowOnboarding({})).toBe(true);
  });

  it("returns false when user has completed the current version", () => {
    expect(
      shouldShowOnboarding({
        onboardingCompletedAt: Timestamp.now(),
        onboardingVersion: ONBOARDING_VERSION,
      }),
    ).toBe(false);
  });

  it("returns true when version was bumped (re-show)", () => {
    expect(
      shouldShowOnboarding({
        onboardingCompletedAt: Timestamp.now(),
        onboardingVersion: ONBOARDING_VERSION - 1,
      }),
    ).toBe(true);
  });

  it("returns false when user skipped current version", () => {
    expect(
      shouldShowOnboarding({
        onboardingSkippedAt: Timestamp.now(),
        onboardingVersion: ONBOARDING_VERSION,
      }),
    ).toBe(false);
  });
});

describe("markOnboardingComplete", () => {
  it("writes onboardingCompletedAt + onboardingVersion", async () => {
    await markOnboardingComplete("uid1");
    expect(mockSetDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      {
        onboardingCompletedAt: "mock-ts",
        onboardingVersion: ONBOARDING_VERSION,
      },
      { merge: true },
    );
  });
});

describe("markOnboardingSkipped", () => {
  it("writes onboardingSkippedAt + onboardingVersion", async () => {
    await markOnboardingSkipped("uid1");
    expect(mockSetDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      {
        onboardingSkippedAt: "mock-ts",
        onboardingVersion: ONBOARDING_VERSION,
      },
      { merge: true },
    );
  });
});

describe("resetOnboarding", () => {
  it("nulls everything to force re-show", async () => {
    await resetOnboarding("uid1");
    expect(mockSetDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      {
        onboardingCompletedAt: null,
        onboardingSkippedAt: null,
        onboardingVersion: 0,
      },
      { merge: true },
    );
  });
});
