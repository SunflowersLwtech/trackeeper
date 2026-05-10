import { Timestamp } from "firebase/firestore";

export type UserRole = "tenant" | "manager" | "maintainer";

export type UserStatus = "pending_approval" | "active" | "suspended" | "rejected";

export type RequestStatus =
  | "submitted" | "assigned" | "scheduled"
  | "in_progress" | "completed" | "verified"
  | "cancelled" | "on_hold";

/** SLA priority maps to response/resolution targets — see utils/sla.ts. */
export type SlaPriority = "emergency" | "high" | "medium" | "low";

export type OnHoldReason =
  | "awaiting_parts" | "tenant_unavailable" | "rescheduled" | "other";

export const ONBOARDING_VERSION = 1;

export type RequestCategory = "Plumbing" | "Electrical" | "General";

export type RequestPriority = "low" | "medium" | "high";

export type TriageFactor =
  | "safety_hazard"
  | "active_damage"
  | "essential_service_down"
  | "access_security"
  | "worsening";

export type PriorityConfidence = "high" | "medium" | "low";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";

export type PaymentMethod = "bank_transfer" | "cash" | "card";

export interface NotificationPreferences {
  channels: {
    messages: boolean;
    status_changes: boolean;
    urgent: boolean;
    digest: boolean;
  };
  /** Local hour 0-23. quietHours suppresses non-urgent push during the window. */
  quietHours?: { startHour: number; endHour: number };
}

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
  // Onboarding — bumped onboardingVersion re-shows the tour after major changes.
  onboardingCompletedAt?: Timestamp;
  onboardingSkippedAt?: Timestamp;
  onboardingVersion?: number;
  notificationPreferences?: NotificationPreferences;
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
  source: "system_triage" | "auto" | "manager" | "tenant";
  factors?: TriageFactor[];
  confidence?: PriorityConfidence;
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
  refundReason?: string | null;
}

export interface RequestSLA {
  priority: SlaPriority;
  responseTargetAt: Timestamp;
  resolutionTargetAt: Timestamp;
  /** Set when status enters on_hold; cleared when leaving. Time spent here is added to totalPausedMs. */
  pausedAt?: Timestamp | null;
  totalPausedMs: number;
  breachedResponse: boolean;
  breachedResolution: boolean;
}

export interface RequestETA {
  /** Single point estimate — preferred for "in 30 min". */
  estimatedArrivalAt?: Timestamp;
  /** Window estimate — preferred for "today 14:00-16:00". */
  estimatedArrivalWindow?: { start: Timestamp; end: Timestamp };
  setBy: string;
  setByName: string;
  setAt: Timestamp;
  /** Bumped each time the maintainer revises ETA — flips push threshold logic. */
  revisionCount: number;
  actualArrivalAt?: Timestamp;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  /** Lowercased prefix tokens — supports Firestore array-contains search. */
  titleTokens?: string[];
  category: RequestCategory;
  priority: RequestPriority;
  prioritySuggestion?: PrioritySuggestion;
  priorityFactors?: TriageFactor[];
  priorityConfidence?: PriorityConfidence;
  /** Canonical multi-image array. Use `getRequestImages(req)` to read. */
  imageUrls?: string[];
  /** @deprecated legacy single-image field — kept for back-compat with old docs. */
  imageUrl?: string;
  status: RequestStatus;
  tenantId: string;
  tenantName: string;
  tenantUnit?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToPhone?: string;
  /** @deprecated free-text — replaced by structured `eta`. */
  estimatedArrival?: string;
  /** Structured ETA — see RequestETA. */
  eta?: RequestETA;
  /** When status==scheduled, the agreed appointment time. */
  scheduledFor?: Timestamp;
  /** When tenant confirms completion (status==verified). */
  verifiedByTenantAt?: Timestamp;
  /** SLA tracking — populated at create time from priority. */
  sla?: RequestSLA;
  /** When status==on_hold, the reason chosen by manager/maintainer. */
  onHoldReason?: OnHoldReason;
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

export interface MessageReplyTo {
  /** Pointer to the original message — must live in the same thread. */
  messageId: string;
  senderId: string;
  /** Cached preview so original deletions don't break the reply UI. */
  textPreview: string;
  type: "text" | "image";
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  /** Canonical multi-image array. Use `getMessageImages(msg)` to read. */
  imageUrls?: string[];
  /** @deprecated legacy single-image field — kept for back-compat with old docs. */
  imageUrl?: string;
  readBy?: string[];
  createdAt: Timestamp;
  // Reply quoting
  replyTo?: MessageReplyTo;
  // Edit / delete (soft) lifecycle
  editedAt?: Timestamp;
  deletedAt?: Timestamp;
  deletedBy?: string;
  /** Map of emoji → uid[] who reacted. Limited to 6 emoji per app convention. */
  reactions?: Record<string, string[]>;
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
  | "request_scheduled"
  | "request_status_changed"
  | "request_completed"
  | "request_verified"
  | "request_eta_changed"
  | "request_sla_breach"
  | "chat_message"
  | "chat_mention"
  | "payment_received"
  | "tenant_approved"
  | "tenant_rejected";

/** Deep-link target — used by the push handler to route to the right screen. */
export interface NotificationDeepLink {
  ticketId?: string;
  messageId?: string;
  /** Maps onto the iOS thread-id / Android groupKey for OS-level grouping. */
  threadId?: string;
  /** APNs notification category for action buttons. */
  category?: "message" | "assign" | "status" | "payment" | "approval";
}

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
  /** Used by the OS push payload + in-app deep linking. */
  deepLink?: NotificationDeepLink;
}
