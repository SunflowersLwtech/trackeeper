/**
 * SLA targets + countdown logic.
 *
 * Industry-standard targets for property maintenance (Jobber / ServiceFusion /
 * AppFolio reference): emergency P1 = 1h response / 4h resolution; high P2 =
 * 4h / 24h; medium P3 = 8h / 72h; low P4 = 24h / 7d.
 *
 * Time spent in `on_hold` is paused — see pauseSla / resumeSla. Manager UI can
 * derive remaining time with `slaRemainingMs(sla, now)` and the SLA badge
 * thresholds with `slaSeverity(remainingMs, totalMs)`.
 */

import { Timestamp } from "firebase/firestore";
import type { RequestSLA, RequestPriority, SlaPriority } from "@/types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export interface SlaTargetSpec {
  responseMs: number;
  resolutionMs: number;
}

export const SLA_TARGETS: Record<SlaPriority, SlaTargetSpec> = {
  emergency: { responseMs: 1 * HOUR, resolutionMs: 4 * HOUR },
  high:      { responseMs: 4 * HOUR, resolutionMs: 24 * HOUR },
  medium:    { responseMs: 8 * HOUR, resolutionMs: 72 * HOUR },
  low:       { responseMs: 24 * HOUR, resolutionMs: 7 * DAY },
};

/** Map a request priority (low/medium/high) onto an SLA priority bucket. */
export function priorityToSlaPriority(p: RequestPriority): SlaPriority {
  return p === "high" ? "high" : p === "medium" ? "medium" : "low";
}

/** Build a fresh SLA record from a creation time + priority. */
export function computeSlaTargets(
  priority: SlaPriority,
  createdAt: Date,
): RequestSLA {
  const spec = SLA_TARGETS[priority];
  return {
    priority,
    responseTargetAt: Timestamp.fromDate(new Date(createdAt.getTime() + spec.responseMs)),
    resolutionTargetAt: Timestamp.fromDate(new Date(createdAt.getTime() + spec.resolutionMs)),
    pausedAt: null,
    totalPausedMs: 0,
    breachedResponse: false,
    breachedResolution: false,
  };
}

/** Mark the SLA paused as the request enters on_hold. */
export function pauseSla(sla: RequestSLA, now: Date = new Date()): RequestSLA {
  if (sla.pausedAt) return sla; // already paused
  return { ...sla, pausedAt: Timestamp.fromDate(now) };
}

/** Resume the SLA — accumulates paused duration into totalPausedMs. */
export function resumeSla(sla: RequestSLA, now: Date = new Date()): RequestSLA {
  if (!sla.pausedAt) return sla;
  const pausedMs = now.getTime() - sla.pausedAt.toMillis();
  return {
    ...sla,
    pausedAt: null,
    totalPausedMs: sla.totalPausedMs + Math.max(0, pausedMs),
  };
}

/**
 * Effective resolution-target millisecond timestamp, accounting for paused
 * time (paused minutes are added to the deadline).
 */
export function effectiveResolutionAt(sla: RequestSLA, now: Date = new Date()): number {
  const target = sla.resolutionTargetAt.toMillis();
  const paused =
    sla.totalPausedMs +
    (sla.pausedAt ? Math.max(0, now.getTime() - sla.pausedAt.toMillis()) : 0);
  return target + paused;
}

/** Remaining ms until breach (negative if already breached). */
export function slaRemainingMs(sla: RequestSLA, now: Date = new Date()): number {
  return effectiveResolutionAt(sla, now) - now.getTime();
}

export type SlaSeverity = "ok" | "warning" | "danger" | "breached";

/**
 * Map remaining ms onto severity buckets used for badge color in the UI.
 * Thresholds taken from Jira SM / Freshdesk: 50% / 20% / 0%.
 */
export function slaSeverity(sla: RequestSLA, now: Date = new Date()): SlaSeverity {
  const remaining = slaRemainingMs(sla, now);
  if (remaining <= 0) return "breached";
  const totalMs = sla.resolutionTargetAt.toMillis() - sla.responseTargetAt.toMillis()
    + (sla.responseTargetAt.toMillis() - (sla.responseTargetAt.toMillis() - sla.totalPausedMs));
  // Simpler: total = resolutionTarget - createdAt window; we approximate via spec.
  const spec = SLA_TARGETS[sla.priority];
  const fullWindowMs = spec.resolutionMs;
  const ratio = remaining / fullWindowMs;
  if (ratio < 0.2) return "danger";
  if (ratio < 0.5) return "warning";
  return "ok";
}

/** Format a remaining duration as a short human string ("2h 14m" / "OVERDUE 35m"). */
export function formatSlaRemaining(remainingMs: number): string {
  const overdue = remainingMs < 0;
  const ms = Math.abs(remainingMs);
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const mins = Math.floor((ms % HOUR) / (60 * 1000));
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && mins > 0) parts.push(`${mins}m`);
  if (parts.length === 0) parts.push("0m");
  return `${overdue ? "OVERDUE " : ""}${parts.join(" ")}`;
}
