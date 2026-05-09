import { RequestStatus, UserRole } from "@/types";

const STATUS_ORDER: RequestStatus[] = [
  "submitted",
  "assigned",
  "scheduled",
  "in_progress",
  "completed",
  "verified",
];

const CANCELLABLE_STATUSES: RequestStatus[] = ["submitted", "assigned", "scheduled"];

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: "#0A0A0A", // ink — neutral
  assigned: "#1E3AFF", // cobalt
  scheduled: "#3B82F6", // sky — appointment booked
  in_progress: "#F4B400", // mustard
  completed: "#5BD27D", // lime
  verified: "#10B981", // emerald — tenant confirmed
  cancelled: "#FF4D2E", // tomato
  on_hold: "#7C3AED", // plum
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  assigned: "Assigned",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  verified: "Verified",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

/**
 * Role-based transition rules — keep in lock-step with firestore.rules.
 * New transitions:
 *   • manager / maintainer: assigned → scheduled (when ETA agreed)
 *   • maintainer: scheduled → in_progress (when on-site)
 *   • tenant: completed → verified (final confirmation)
 *   • manager: completed → verified (manager-confirmed close)
 */
const ROLE_TRANSITIONS: Record<UserRole, [RequestStatus, RequestStatus][]> = {
  tenant: [
    ["submitted", "cancelled"],
    ["assigned", "cancelled"],
    ["scheduled", "cancelled"],
    ["completed", "verified"],
  ],
  manager: [
    ["submitted", "assigned"],
    ["assigned", "scheduled"],
    ["assigned", "on_hold"],
    ["scheduled", "in_progress"],
    ["scheduled", "on_hold"],
    ["in_progress", "on_hold"],
    ["on_hold", "assigned"],
    ["on_hold", "scheduled"],
    ["on_hold", "in_progress"],
    ["completed", "verified"],
  ],
  maintainer: [
    ["assigned", "scheduled"],
    ["assigned", "in_progress"],
    ["scheduled", "in_progress"],
    ["in_progress", "completed"],
    ["assigned", "on_hold"],
    ["scheduled", "on_hold"],
    ["in_progress", "on_hold"],
    ["on_hold", "assigned"],
    ["on_hold", "scheduled"],
    ["on_hold", "in_progress"],
  ],
};

export function canTransitionWithRole(
  current: RequestStatus,
  next: RequestStatus,
  role: UserRole,
): boolean {
  return ROLE_TRANSITIONS[role].some(([from, to]) => from === current && to === next);
}

export function getNextStatusesForRole(current: RequestStatus, role: UserRole): RequestStatus[] {
  return ROLE_TRANSITIONS[role]
    .filter(([from]) => from === current)
    .map(([, to]) => to);
}

export function canTransition(current: RequestStatus, next: RequestStatus): boolean {
  if (next === "cancelled") {
    return CANCELLABLE_STATUSES.includes(current);
  }
  if (current === "on_hold") {
    return next === "assigned" || next === "scheduled" || next === "in_progress";
  }
  if (next === "on_hold") {
    return current === "assigned" || current === "scheduled" || current === "in_progress";
  }
  const currentIndex = STATUS_ORDER.indexOf(current);
  const nextIndex = STATUS_ORDER.indexOf(next);
  return nextIndex === currentIndex + 1;
}

export function canCancel(status: RequestStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export function getNextStatuses(current: RequestStatus): RequestStatus[] {
  if (current === "on_hold") return ["assigned", "scheduled", "in_progress"];
  const results: RequestStatus[] = [];
  const currentIndex = STATUS_ORDER.indexOf(current);
  if (currentIndex >= 0 && currentIndex < STATUS_ORDER.length - 1) {
    results.push(STATUS_ORDER[currentIndex + 1]);
  }
  if (current === "assigned" || current === "scheduled" || current === "in_progress") {
    results.push("on_hold");
  }
  return results;
}

export function getStatusColor(status: RequestStatus): string {
  return STATUS_COLORS[status] ?? "#9ca3af";
}

export function getStatusLabel(status: RequestStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getStatusIndex(status: RequestStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export { STATUS_ORDER };
