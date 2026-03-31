import { RequestStatus, UserRole } from "@/types";

const STATUS_ORDER: RequestStatus[] = ["submitted", "assigned", "in_progress", "completed"];

const CANCELLABLE_STATUSES: RequestStatus[] = ["submitted", "assigned"];

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: "#9ca3af", // gray-400
  assigned: "#3b82f6", // blue-500
  in_progress: "#f59e0b", // amber-500
  completed: "#22c55e", // green-500
  cancelled: "#ef4444", // red-500
  on_hold: "#8b5cf6", // violet-500
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

/** Role-based transition rules */
const ROLE_TRANSITIONS: Record<UserRole, Array<[RequestStatus, RequestStatus]>> = {
  tenant: [
    ["submitted", "cancelled"],
    ["assigned", "cancelled"],
  ],
  manager: [
    ["submitted", "assigned"],
    ["assigned", "on_hold"],
    ["in_progress", "on_hold"],
    ["on_hold", "assigned"],
    ["on_hold", "in_progress"],
  ],
  maintainer: [
    ["assigned", "in_progress"],
    ["in_progress", "completed"],
    ["assigned", "on_hold"],
    ["in_progress", "on_hold"],
    ["on_hold", "assigned"],
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
    return next === "assigned" || next === "in_progress";
  }
  if (next === "on_hold") {
    return current === "assigned" || current === "in_progress";
  }
  const currentIndex = STATUS_ORDER.indexOf(current);
  const nextIndex = STATUS_ORDER.indexOf(next);
  return nextIndex === currentIndex + 1;
}

export function canCancel(status: RequestStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export function getNextStatuses(current: RequestStatus): RequestStatus[] {
  if (current === "on_hold") return ["assigned", "in_progress"];
  const results: RequestStatus[] = [];
  const currentIndex = STATUS_ORDER.indexOf(current);
  if (currentIndex >= 0 && currentIndex < STATUS_ORDER.length - 1) {
    results.push(STATUS_ORDER[currentIndex + 1]);
  }
  if (current === "assigned" || current === "in_progress") {
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
