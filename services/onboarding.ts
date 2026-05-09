/**
 * Onboarding service — tracks which users have seen the first-run tour and
 * provides the role-specific slide content for the UI to render.
 *
 * Persists `onboardingCompletedAt` and `onboardingVersion` on the user
 * document. Bumping ONBOARDING_VERSION (in @/types) re-shows the tour after
 * major UX changes — same pattern as Linear / Notion.
 */
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  ONBOARDING_VERSION,
  User,
  UserRole,
} from "@/types";

export interface OnboardingSlide {
  /** Stable id used for analytics & test ids. */
  key: string;
  title: string;
  body: string;
  /** Lottie/asset name — left to the UI to map. */
  illustration: string;
  /** Primary CTA on the final slide. */
  cta?: string;
}

const TENANT_SLIDES: OnboardingSlide[] = [
  {
    key: "tenant-1-photo-report",
    title: "Snap and report",
    body: "Take photos of any issue — leaks, broken locks, electrical faults — and we route it to the right person.",
    illustration: "onboarding/camera",
  },
  {
    key: "tenant-2-track-status",
    title: "Track in real time",
    body: "Watch your request move from Submitted to Scheduled to Completed — with live ETA when the maintainer is on the way.",
    illustration: "onboarding/timeline",
  },
  {
    key: "tenant-3-rate-history",
    title: "Rate and review",
    body: "Once a job is finished, leave a rating to help your manager keep quality high.",
    illustration: "onboarding/star",
    cta: "Submit your first request",
  },
];

const MANAGER_SLIDES: OnboardingSlide[] = [
  {
    key: "manager-1-assign-sla",
    title: "Assign and meet SLAs",
    body: "Triage incoming tickets, assign maintainers, and never let an emergency breach its SLA window.",
    illustration: "onboarding/dashboard",
  },
  {
    key: "manager-2-schedule",
    title: "Schedule with confidence",
    body: "Set appointment times and let the system notify tenants automatically when ETAs change.",
    illustration: "onboarding/calendar",
  },
  {
    key: "manager-3-payments",
    title: "Cost & payments",
    body: "Record labour and material costs, then settle with maintainers — all reflected on your dashboard.",
    illustration: "onboarding/wallet",
    cta: "Open the dashboard",
  },
];

const MAINTAINER_SLIDES: OnboardingSlide[] = [
  {
    key: "maintainer-1-task-queue",
    title: "Your task queue",
    body: "See all jobs assigned to you, sorted by priority and SLA window.",
    illustration: "onboarding/list",
  },
  {
    key: "maintainer-2-on-site",
    title: "On the way, on site",
    body: "Tap arrival, complete the work, upload proof photos — everything is logged automatically.",
    illustration: "onboarding/wrench",
  },
  {
    key: "maintainer-3-earnings",
    title: "Track your earnings",
    body: "See paid and pending earnings per period, and get notified the moment a payment lands.",
    illustration: "onboarding/coin",
    cta: "View today's tasks",
  },
];

/** Return the role-specific 3-slide carousel content. */
export function getOnboardingSlides(role: UserRole): OnboardingSlide[] {
  switch (role) {
    case "tenant":     return TENANT_SLIDES;
    case "manager":    return MANAGER_SLIDES;
    case "maintainer": return MAINTAINER_SLIDES;
    default:           return TENANT_SLIDES;
  }
}

/**
 * Should the user see onboarding right now? True when they have neither
 * completed nor skipped the current ONBOARDING_VERSION.
 */
export function shouldShowOnboarding(user: Pick<User, "onboardingCompletedAt" | "onboardingSkippedAt" | "onboardingVersion"> | null | undefined): boolean {
  if (!user) return false;
  const seenVersion = user.onboardingVersion ?? 0;
  if (seenVersion >= ONBOARDING_VERSION) return false;
  if (user.onboardingCompletedAt || user.onboardingSkippedAt) {
    // They saw an older version — re-show because we bumped.
    return seenVersion < ONBOARDING_VERSION;
  }
  return true;
}

/** Mark onboarding fully completed for the current ONBOARDING_VERSION. */
export async function markOnboardingComplete(uid: string): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      onboardingCompletedAt: serverTimestamp(),
      onboardingVersion: ONBOARDING_VERSION,
    },
    { merge: true },
  );
}

/** Mark onboarding skipped — re-show only if version bumps later. */
export async function markOnboardingSkipped(uid: string): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      onboardingSkippedAt: serverTimestamp(),
      onboardingVersion: ONBOARDING_VERSION,
    },
    { merge: true },
  );
}

/** Manually re-trigger onboarding from Settings → Help → Show tutorial. */
export async function resetOnboarding(uid: string): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      onboardingCompletedAt: null,
      onboardingSkippedAt: null,
      onboardingVersion: 0,
    },
    { merge: true },
  );
}
