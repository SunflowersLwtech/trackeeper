import { Timestamp } from "firebase/firestore";

export type UserRole = "tenant" | "manager" | "maintainer";

export type UserStatus = "pending_approval" | "active" | "suspended" | "rejected";

export type RequestStatus =
  | "submitted" | "assigned" | "in_progress"
  | "completed" | "cancelled" | "on_hold";

export type RequestCategory = "Plumbing" | "Electrical" | "General";

export type RequestPriority = "low" | "medium" | "high";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";

export type PaymentMethod = "bank_transfer" | "cash" | "card";

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  phone?: string;
  unitNumber?: string;
  propertyId?: string;
  pushToken?: string;
  createdAt?: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  approvedByName?: string;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  // Maintainer-only — used to compute job earnings
  hourlyRate?: number;
  specialties?: RequestCategory[];
}

export interface StatusChange {
  from: RequestStatus;
  to: RequestStatus;
  changedBy: string;
  changedByName: string;
  changedAt: Timestamp;
  note?: string;
}

export interface PrioritySuggestion {
  priority: RequestPriority;
  reason: string;
  source: "auto" | "manager" | "tenant";
}

export interface RequestCost {
  laborHours: number;
  hourlyRate: number;
  materialCost: number;
  total: number;
  setBy?: string;
  setByName?: string;
  setAt?: Timestamp;
}

export interface RequestPayment {
  status: PaymentStatus;
  method?: PaymentMethod;
  amount: number;
  paidAt?: Timestamp;
  paidBy?: string;
  paidByName?: string;
  paidTo?: string;
  paidToName?: string;
  reference?: string;
  refundedAt?: Timestamp;
  refundedBy?: string;
  refundedByName?: string;
  refundReason?: string;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  priority: RequestPriority;
  prioritySuggestion?: PrioritySuggestion;
  imageUrl?: string;
  status: RequestStatus;
  tenantId: string;
  tenantName: string;
  tenantUnit?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToPhone?: string;
  estimatedArrival?: string;
  statusHistory: StatusChange[];
  resolvedAt?: Timestamp;
  rating?: number;
  ratingComment?: string;
  cost?: RequestCost;
  payment?: RequestPayment;
  createdAt: Timestamp;
  clientTimestamp?: number;
}

export type MessageStatus = "sent" | "delivered" | "read";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  readBy?: string[];
  createdAt: Timestamp;
}

export interface Note {
  id: string;
  managerId: string;
  managerName: string;
  text: string;
  createdAt: Timestamp;
}

export type NotificationKind =
  | "request_created"
  | "request_assigned"
  | "request_status_changed"
  | "request_completed"
  | "chat_message"
  | "payment_received"
  | "tenant_approved"
  | "tenant_rejected";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  requestId?: string;
  read: boolean;
  createdAt: Timestamp;
  actorId?: string;
  actorName?: string;
}
