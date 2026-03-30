import { Timestamp } from "firebase/firestore";

export type UserRole = "tenant" | "manager";

export type RequestStatus = "submitted" | "assigned" | "in_progress" | "completed";

export type RequestCategory = "Plumbing" | "Electrical" | "General";

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  unitNumber?: string;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  imageUrl?: string;
  status: RequestStatus;
  tenantId: string;
  tenantName: string;
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
