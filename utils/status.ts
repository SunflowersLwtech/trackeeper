import { RequestStatus } from "@/types";

const STATUS_ORDER: RequestStatus[] = ["submitted", "assigned", "in_progress", "completed"];

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: "#9ca3af", // gray-400
  assigned: "#3b82f6", // blue-500
  in_progress: "#f59e0b", // amber-500
  completed: "#22c55e", // green-500
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
};

export function canTransition(current: RequestStatus, next: RequestStatus): boolean {
  const currentIndex = STATUS_ORDER.indexOf(current);
  const nextIndex = STATUS_ORDER.indexOf(next);
  return nextIndex === currentIndex + 1;
}

export function getNextStatuses(current: RequestStatus): RequestStatus[] {
  const currentIndex = STATUS_ORDER.indexOf(current);
  if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) return [];
  return [STATUS_ORDER[currentIndex + 1]];
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
