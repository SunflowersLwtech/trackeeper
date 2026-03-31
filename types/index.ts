import { Timestamp } from "firebase/firestore";

export type UserRole = "tenant" | "manager" | "maintainer";

export type RequestStatus =
  | "submitted" | "assigned" | "in_progress"
  | "completed" | "cancelled" | "on_hold";

export type RequestCategory = "Plumbing" | "Electrical" | "General";

export type RequestPriority = "low" | "medium" | "high";

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  unitNumber?: string;
}

export interface StatusChange {
  from: RequestStatus;
  to: RequestStatus;
  changedBy: string;
  changedByName: string;
  changedAt: Timestamp;
  note?: string;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  imageUrl?: string;
  status: RequestStatus;
  tenantId: string;
  tenantName: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToPhone?: string;
  estimatedArrival?: string;
  statusHistory: StatusChange[];
  resolvedAt?: Timestamp;
  rating?: number; // 1-5 stars
  ratingComment?: string;
  createdAt: Timestamp;
  clientTimestamp?: number; // For latency measurement
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Timestamp;
}

export interface Note {
  id: string;
  managerId: string;
  managerName: string;
  text: string;
  createdAt: Timestamp;
}
