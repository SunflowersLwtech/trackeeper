import { RequestPriority } from "@/types";

export const PRIORITY_ORDER: RequestPriority[] = ["high", "medium", "low"];

export const PRIORITY_COLORS: Record<RequestPriority, string> = {
  low: "#22c55e", // green-500
  medium: "#f59e0b", // amber-500
  high: "#ef4444", // red-500
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function getPriorityColor(priority: RequestPriority): string {
  return PRIORITY_COLORS[priority] ?? "#9ca3af";
}

export function getPriorityLabel(priority: RequestPriority): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function getPriorityWeight(priority: RequestPriority): number {
  return PRIORITY_ORDER.indexOf(priority);
}
