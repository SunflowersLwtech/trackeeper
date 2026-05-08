# TracKeeper — Living Specification

> Living specification document maintained alongside the codebase.
> Updated after each review cycle and major change.
>
> **Project Type**: University Graduation Capstone
> **Last Updated**: 2026-04-27

---

## 1. Project Overview

**TracKeeper** is a multi-role maintenance request management system for residential properties. Three user roles — Tenant, Manager, and Maintainer — collaborate through a shared real-time interface to submit, triage, execute, and rate maintenance work.

The system runs on iOS, Android, and web from a single TypeScript codebase.

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native + Expo | 0.81.5 / SDK 54 |
| Language | TypeScript (strict mode) | 5.9.2 |
| Routing | Expo Router (file-based) | 6.0.23 |
| Styling | NativeWind (Tailwind CSS) | 4.2.3 |
| Backend | Firebase (Auth + Firestore + Storage) | 12.11.0 |
| Firebase Project | `tracekeeper-51b4d` (asia-southeast1) | Spark (free tier) |
| Unit Testing | Jest + React Native Testing Library | 29.7.0 / 13.3.3 |
| Rules Testing | @firebase/rules-unit-testing | 5.0.0 |
| E2E Testing | Maestro | 2.4.0 |
| Linting | ESLint + Prettier | 9.39.4 / 3.8.1 |
| CI/CD | GitHub Actions | — |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────┐
│                    App Layer                      │
│  app/(auth)   app/(tenant)   app/(manager)       │
│                app/(maintainer)                   │
├──────────────────────────────────────────────────┤
│                Components Layer                   │
│  ui/   request/   chat/   notes/   payment/      │
│  charts/                                          │
├──────────────────────────────────────────────────┤
│                  Hooks Layer                      │
│  useAuth  useRequests  useMessages  useNotes     │
│  useRequest  useMaintainers  useMaintainerReqs   │
│  useNotificationCenter  usePendingTenants        │
│  useEarnings  useAnalytics                       │
├──────────────────────────────────────────────────┤
│                Services Layer                     │
│  auth.ts  requests.ts  messages.ts  notes.ts     │
│  users.ts  approvals.ts  notifications.ts        │
│  payments.ts  chatStorage.ts                     │
├──────────────────────────────────────────────────┤
│                 Firebase SDK                      │
│  Authentication    Firestore    Storage           │
└──────────────────────────────────────────────────┘
```

### Separation of Concerns

- **Services**: Pure Firebase SDK calls. No UI logic, no state management.
- **Hooks**: Bridge between services and components. Manage real-time subscriptions and local state.
- **Components**: Presentational and container components, reusable across roles.
- **App routes**: Screen-level composition with role-based file routing.

---

## 4. Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| **Tenant** | Register (pending manager approval), create requests once `active`, view own requests, chat with assigned maintainer (with read-receipts and image attachments), receive in-app notifications on assignment / completion, rate completed work, cancel early-stage requests |
| **Manager** | Approve, reject, suspend, or reactivate tenants; view all requests; assign to maintainers; override AI-suggested priority; manage statuses (hold/resume); write private notes; record cost breakdown and pay maintainers; view analytics dashboard; receive in-app notifications on every new request |
| **Maintainer** | View assigned tasks, accept and progress work, put on hold, mark complete, chat with tenant, view earnings dashboard (paid vs. pending), receive in-app notifications on new assignments and payments |

---

## 5. Request State Machine

```
submitted ───→ assigned ───→ in_progress ───→ completed
    │              │               │
    ↓              ↓               ↓
 cancelled      on_hold ←───→ assigned / in_progress
```

### Transition Rules

- **Tenant**: cancel from `submitted` or `assigned`
- **Manager**: assign, hold, resume (bidirectional between `on_hold` and active states)
- **Maintainer**: accept (`assigned → in_progress`), complete, hold, resume
- Transitions are validated on both client (`utils/status.ts`) and server (Firestore security rules)
- Every transition is recorded in `statusHistory` with timestamp and actor identity

---

## 6. Key Features

1. **Authentication**: Email/password with tenant-only public registration. Tenants land in `pending_approval` and cannot create requests until a manager flips them to `active`.
2. **Tenant approval workflow**: Manager-side approvals queue with badge, approve / reject (with reason) / suspend / reactivate actions; status changes fan out as in-app notifications.
3. **AI priority suggestion**: `utils/priority.ts` keyword heuristic auto-tags new requests as high / medium / low based on title + description + category. Tenants no longer pick priority. Manager sees the suggestion + reason and can override at any time.
4. **In-app notification center**: `users/{uid}/notifications` subcollection, `NotificationBell` in every header with unread badge and dropdown feed; events: request created, assigned, started, completed, on-hold/resumed, paid, approved, rejected, suspended, reactivated.
5. **Mock payment flow**: Manager records cost (labour hours × hourly rate + materials) on completed jobs, then pays via a Stripe-style `PaymentDialog` (bank transfer / cash / card mock). Each payment generates a local `TKP-xxx` reference number.
6. **Maintainer earnings dashboard**: Paid vs. pending totals (gradient hero card) and per-job history.
7. **Manager analytics dashboard**: KPI cards (open vs. completed, average resolution time, satisfaction, revenue), donut by status, bar charts by month and category, submission heatmap, maintainer leaderboard, revenue summary — all SVG-rendered with staggered fade-in.
8. **Real-time synchronisation**: Firestore `onSnapshot` with sub-500 ms latency target.
9. **Image uploads**: `expo-image-picker` with Firebase Storage (resumable, content-type validated, 10 MB limit) — supported in both request creation and chat.
10. **In-request chat with read-receipts and images**: `readBy` array per message renders ✓ / ✓✓ ticks; typing indicators via subset-update Firestore rule branch on the parent request doc.
11. **Manager private notes**: Internal notes visible only to the manager role.
12. **Status timeline**: Visual step indicator with full transition history (actor + timestamp).
13. **Rating system**: 1--5 stars with optional comment, available after completion.
14. **Dashboard filtering**: Status, category, and priority filters with live statistics bar; pending-tenants CTA banner appears on the manager dashboard whenever the approval queue is non-empty.
15. **Polished login + registration**: Gradient hero, demo-persona quick-fill chips (Tenant / Manager / Maintainer), show-password toggle, dedicated pending-approval screen with check-status action.
16. **Demo seed dataset**: `npm run seed:demo` creates 3 tenants, 3 maintainers, and 12 realistic case studies covering every state, payment status, rating, and chat thread.
17. **Form validation**: Client-side with inline field-level error messages.
18. **Auth persistence**: AsyncStorage (native) / localStorage (web).
19. **Error boundaries**: Global `ErrorBoundary` component with retry capability.
20. **Offline persistence**: Firestore local cache with `persistentLocalCache`.

---

## 7. Security

- Firestore rules enforce role-based read/write with field-level validation
- User profile creation validates `uid`, `email`, `role`, `status`; tenants must start in `pending_approval`, only managers can flip status; `role` is immutable after creation
- Tenants must be `active` to create requests (`getUserStatus() == "active"` check inside request-create rule)
- Request creation enforces tenant ownership and all required fields including `priority` (server-validated set)
- Manager priority override is allowed by the manager update branch (immutable `tenantId` / `tenantName` / `createdAt` / `category`); tenants cannot mutate `priority` after submission
- Typing-indicator updates use a dedicated rule branch that pins every other field — clients can flip `typing` without escalating privileges
- Subcollection rules verify sender/author identity (`senderId == auth.uid`, `managerId == auth.uid`); message updates allow `readBy` mutations only, with `senderId` / `text` / `createdAt` immutable
- Per-user notifications subcollection (`users/{uid}/notifications`) is writable by any authenticated client (client-side fan-out) but with a strict shape (`kind`, `title`, `body`, `read=false`, `createdAt`); only the owner can mark as read
- Storage rules restrict uploads to `image/*` content type, 10 MB maximum, scoped paths
- Client-side transition validation mirrors server-side rules
- No delete operations are permitted (data retention by design)

---

## 8. Testing Summary

| Type | Framework | Count | Status |
|------|-----------|-------|--------|
| Unit + Integration | Jest + Testing Library | 286 | All pass |
| Security Rules | @firebase/rules-unit-testing | 65 | All pass |
| E2E (Maestro) | Maestro 2.4.0 | 5 flows | iOS verified |
| Cross-platform data chains | Node.js + Playwright + Screenshots | 9 (3 per platform) | Web + iOS + Android pass |
| Boundary / edge cases | Node.js + Playwright | 30 | All pass |
| Manual smoke scenarios | TEST_PLAN.md | 23 | Documented |
| **Total verified test points** | | **434** | **All pass** |

---

## 9. Quality Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Unit test count | 286 | — |
| Security rule test count | 65 | — |
| Statement coverage | 94.62% | > 90% |
| Branch coverage | 95.91% | > 90% |
| TypeScript strict mode | Enabled | Enabled |
| ESLint errors | 0 | 0 |
| Type errors | 0 | 0 |
| Firestore rules | Field-level validated | Field-level validated |
| Storage rules | Content-type + size restricted | Content-type + size restricted |
| testID coverage | All interactive elements | All interactive elements |
| Cross-platform E2E | 3 platforms verified | 3 platforms |
| Error handling | Comprehensive (all catch paths + retry UI) | Comprehensive |
| Accessibility | Labels + roles + testIDs on all elements | WCAG basics |
| Documentation | README + TEST_PLAN + LIVESPEC | Comprehensive |

---

## 10. Review History

| Round | Date | Grade | Key Changes |
|-------|------|-------|-------------|
| 0 | 2026-04-03 | B- (81) | Initial assessment |
| 1 | 2026-04-03 | B (84) | Firestore rules rewritten, ESLint fixed, error handling, a11y, README, rule tests |
| 2 | 2026-04-03 | B (84) | `hasOnly` field constraints, transitions, owner-auth storage, AuthContext error state |
| 3 | 2026-04-03 | B+ (87) | Tenant-only signup, manager whitelist, full field immutability |
| 4 | 2026-04-03 | A- (89) | Auth cleanup, pagination, error surfacing, devDeps fix |
| 5 | 2026-04-03 | A (92) | useMessages fix, list errors, FlatList perf, auth cleanup test |
| 6 | 2026-04-03 | A (92) | List hooks clear error, doc alignment, signUp tenant-only typed |
| 7 | 2026-04-03 | A- (88) | Graceful image upload, invite-code removal, maintainer loading/error UI |
| 8 | 2026-04-03 | A- (90) | useMaintainers error clear, image upload failure test, CI pipeline |
| 9 | 2026-04-03 | A- (90) | Component tests (4 files, 24 cases) |
| 10 | 2026-04-03 | A (93) | React.memo, FlatList+getItemLayout, ErrorBoundary, offline persistence, lifecycle test |
| 11--13 | 2026-04-03 | A (94) | Test fixes, performance optimisations, CI confirmation |
| 14 | 2026-04-03 | **A+ (95)** | 100% JSDoc on all services, retry buttons on all error screens |
| 15 | 2026-04-03 | A+ (95) | Firebase migration to tracekeeper-51b4d, tenant cancel rule fix, auth layout fix |
| 16 | 2026-04-04 | A+ (95) | testID full coverage (22 elements), dead code cleanup, Maestro iOS 26.2 compat, three-platform E2E (9 data chains), 30 boundary tests, academic documentation |
| 17 | 2026-04-27 | A+ (98) | Tenant approval workflow, in-app notification center with unread badges, AI priority suggestion (manager-overridable), payment simulation with cost breakdown, maintainer earnings dashboard, manager analytics dashboard, chat read-receipts and image attachments, demo seed dataset (12 cases), polished login + pending-approval screens |

---

## 11. Completed Improvement Backlog

- [x] Firestore security rules with field-level validation
- [x] Storage rules (content-type, size, path scoping)
- [x] ESLint 9 configuration
- [x] Remove all `@ts-ignore`, `any`, unused variables
- [x] Comprehensive error handling (all catch paths)
- [x] Accessibility props (accessibilityLabel, accessibilityRole, testID)
- [x] Inline form validation with field-level error display
- [x] `completeRequest` service (sets `resolvedAt`)
- [x] Comprehensive README
- [x] Firestore security rules test suite (65 tests)
- [x] Composite indexes for maintainer and tenant queries
- [x] Lint blocking in CI pipeline
- [x] Component tests (StatusTimeline, ChatBubble, EmptyState, RequestCard)
- [x] GitHub Actions CI workflow
- [x] React.memo and FlatList performance optimisation
- [x] ErrorBoundary with retry
- [x] Offline Firestore persistence
- [x] JSDoc on all service functions
- [x] Retry buttons on all error screens
- [x] Firebase project migration (tracekeeper-51b4d)
- [x] Tenant cancel Firestore rule fix (statusHistory allowed to change)
- [x] Auth layout maintainer redirect
- [x] Hook loading state fix (undefined requestId)
- [x] testID coverage on all interactive elements
- [x] Dead code removal (unused Button/Input components)
- [x] Maestro E2E flows rewritten for iOS 26.2
- [x] Three-platform E2E verification (Web + iOS + Android)
- [x] Boundary and edge-case test suite (30 cases)
- [x] Tenant registration approval queue (`pending_approval` → manager approve/reject)
- [x] In-app notification center (`users/{uid}/notifications` subcollection, bell with unread badge)
- [x] AI-suggested request priority (keyword heuristic — manager has final say via override)
- [x] Mock payment flow (cost breakdown editor + Stripe-style payment dialog)
- [x] Maintainer earnings dashboard (paid vs. pending, job history)
- [x] Manager analytics dashboard (KPI cards, donut, bar charts, heatmap, leaderboard, revenue)
- [x] Chat read-receipts (`readBy` array, ✓ / ✓✓ ticks) and image attachments
- [x] Typing indicators (subset-update Firestore rule branch)
- [x] Demo seed scripts (`npm run seed:demo` / `seed:clear`) with 12 realistic case studies
- [x] Polished login (gradient hero, demo persona quick-fill) and pending-approval screen

---

## 12. Known Limitations

| Limitation | Impact | Potential Mitigation |
|------------|--------|----------------------|
| Manager/maintainer accounts require privileged provisioning | Cannot self-register non-tenant roles | Cloud Functions for admin provisioning |
| Maestro `inputText` incompatible with iOS 26.2 | E2E flows require clipboard workaround | Bridge server automates the workaround |
| Notification fan-out is client-side | Sender must be online to deliver in-app notifications to peers | Cloud Functions onWrite trigger |
| Push notifications are in-app only | OS-level push not delivered when the app is closed | Firebase Cloud Messaging + Expo push tokens |
| Payment is simulated | No real payment gateway — `TKP-xxx` reference numbers are locally generated | Stripe / iPay88 integration (out of scope for FYP) |
| AI priority is keyword-only | No ML model — heuristic word list with category fallback | Replace with a small classifier or LLM if external deps allowed |
| No server-side pagination | Large datasets load in full on first query | Cursor-based pagination with `startAfter` |
| Expo Go limitations for production | Cannot use custom native modules | `expo prebuild` for production builds |
