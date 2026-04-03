# TracKeeper LiveSpec — Graduation Project

> Living specification document. Updated each review cycle.
> **Current Grade Target**: A+
> **Review Engine**: Codex
> **Last Updated**: 2026-04-03

---

## 1. Project Overview

**TracKeeper** is a multi-role maintenance request management system for residential properties. Tenants submit maintenance requests, managers triage and assign them, and maintainers execute the work — all with real-time sync and in-app communication.

**Target**: University graduation project (capstone/final year)

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native + Expo | 0.81.5 / 54.0 |
| Language | TypeScript (strict) | 5.9.2 |
| Routing | Expo Router (file-based) | 6.0.23 |
| Styling | NativeWind (Tailwind CSS) | 4.2.3 |
| Backend | Firebase (Auth + Firestore + Storage) | 12.11.0 |
| Firebase Project | tracekeeper-51b4d (asia-southeast1) | Blaze/Spark |
| Testing | Jest + Testing Library + Maestro (E2E) | 29.7.0 |
| Linting | ESLint + Prettier | 9.39.4 / 3.8.1 |

---

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│                   App Layer                  │
│  app/(auth)  app/(tenant)  app/(manager)    │
│              app/(maintainer)                │
├─────────────────────────────────────────────┤
│              Components Layer                │
│  ui/  request/  chat/  notes/               │
├─────────────────────────────────────────────┤
│               Hooks Layer                    │
│  useAuth  useRequests  useMessages  useNotes│
├─────────────────────────────────────────────┤
│             Services Layer                   │
│  auth.ts  requests.ts  messages.ts  notes.ts│
├─────────────────────────────────────────────┤
│             Firebase SDK                     │
│  Auth  Firestore  Storage                   │
└─────────────────────────────────────────────┘
```

### Separation of Concerns
- **Services**: Pure Firebase SDK calls, no UI logic
- **Hooks**: Bridge between services and components, manage subscriptions
- **Components**: Presentational + container components
- **App routes**: Screen-level composition with role-based routing

---

## 4. Role-Based Access Control (3 Roles)

| Role | Capabilities |
|------|-------------|
| **Tenant** | Create requests, view own requests, chat, rate completed work, cancel early-stage |
| **Manager** | View all requests, assign to maintainers, manage statuses, private notes, filter/stats |
| **Maintainer** | View assigned requests, mark in-progress/complete, chat with tenant |

---

## 5. Request State Machine

```
submitted ──→ assigned ──→ in_progress ──→ completed
    │            │              │              ✓
    ↓            ↓              ↓
 cancelled    on_hold ←──→ assigned/in_progress
```

- Tenants can cancel: submitted, assigned
- Manager can hold/resume: assigned, in_progress
- Maintainer can progress: assigned → in_progress → completed
- Role-based transition validation in both client and Firestore rules

---

## 6. Key Features

1. **Authentication**: Email/password registration (tenant-only public signup; manager/maintainer provisioned by admin)
2. **Real-time sync**: Firestore onSnapshot, < 500ms latency target
3. **Image uploads**: expo-image-picker + Firebase Storage (resumable)
4. **In-request chat**: Real-time messaging between participants
5. **Manager notes**: Private notes visible only to managers
6. **Status timeline**: Visual history of all status changes
7. **Rating system**: 1-5 stars with optional comment after completion
8. **Dashboard filtering**: Status/priority filters with stats bar
9. **Form validation**: Client-side with clear error messages
10. **Auth persistence**: AsyncStorage (native) / localStorage (web)

---

## 7. Security

- Firestore rules enforce role-based read/write with field-level validation
- User profile creation validates uid, email, role fields; role immutable on update
- Request creation enforces tenant ownership and required fields
- Subcollection rules validate sender/author identity (messages: senderId == auth.uid, notes: managerId == auth.uid)
- Storage rules restrict to image/* content type, 10MB max, scoped paths
- Client-side transition validation mirrors server rules
- No delete operations exposed (data retention)

---

## 8. Testing

| Type | Framework | Coverage |
|------|-----------|----------|
| Unit/Integration | Jest + Testing Library | 97.72% statements |
| Security Rules | @firebase/rules-unit-testing | Comprehensive (users, requests, messages, notes) |
| E2E | Maestro | 5 flows (auth, create, status, chat, register) |
| Manual | TEST_PLAN.md | 23 smoke scenarios (S01-S23) |

---

## 9. Quality Metrics

| Metric | Current | Target (A+) |
|--------|---------|-------------|
| Test coverage (statements) | 97.72% | > 95% |
| Test coverage (branches) | 95.71% | > 90% |
| TypeScript strict | Yes | Yes |
| ESLint errors | 0 | 0 |
| Type errors | 0 | 0 |
| Firestore security rules | Field-level validated | Field-level validated |
| Storage rules | Content-type + size restricted | Content-type + size restricted |
| Documentation | README + TEST_PLAN + LIVESPEC | Comprehensive |
| E2E test flows | 5 | 5+ |
| Firestore rule tests | Comprehensive | Comprehensive |
| Error handling | Comprehensive (all catch paths) | Comprehensive |
| Accessibility | Labels + roles + testIDs | WCAG basics |
| Inline validation | Field-level with error display | Field-level |

---

## 10. Review History

| Round | Date | Grade | Key Issues | Actions Taken |
|-------|------|-------|------------|---------------|
| 0 | 2026-04-03 | B- (81) | Security F, Error handling B-, Docs B-, A11y B- | — |
| 1 | 2026-04-03 | B (84) | Security D+, tautological manager guard, weak field controls, open storage writes | Firestore rules rewritten, ESLint fixed, error handling comprehensive, a11y added, README created, rule tests added |
| 2 | 2026-04-03 | B (84) | Security D+, self-reg, broad manager updates, open storage reads | hasOnly, transitions, owner-auth storage, AuthContext error state |
| 3 | 2026-04-03 | B+ (87) | Orphaned auth accts, no pagination, useMessages error hidden, test deps in prod | Tenant-only signup, manager whitelist, full field immutability, participant storage reads |
| 4 | 2026-04-03 | A- (89) | Stale msg error, list errors hidden, privileged role UX, no FlatList tuning | Auth cleanup, pagination, error surfacing, devDeps fix |
| 5 | 2026-04-03 | A (92) | Sticky list errors, doc drift, signUp API mismatch | useMessages fix, list errors, tenant-only UI, FlatList perf, auth cleanup test |
| 6 | 2026-04-03 | A (92) | Non-atomic request creation, dead invite-code, maintainer loading ignored | List hooks clear error, doc alignment, signUp tenant-only typed |
| 7 | 2026-04-03 | A- (88) | useMaintainers sticky error, no CI/CD, no image failure test | Graceful image upload, invite-code removal, maintainer loading/error UI |
| 8 | 2026-04-03 | B+/A- (88-92) | Component tests needed, testing depth | useMaintainers error clear, image upload failure test, CI pipeline |
| 9 | 2026-04-03 | A- (90) | Performance 8.5, CI 9, Testing 9 | Component tests (4 files, 24 cases) |
| 10 | 2026-04-03 | A-(91)→A(93) | Test failures, perf gaps | React.memo, FlatList+getItemLayout, ErrorBoundary, offline persistence, coverage threshold, env config, lifecycle test |
| 11-13 | 2026-04-03 | A(94) | Missing JSDoc, no retry on errors | Test fix, perf opts, CI confirmation |
| **14** | **2026-04-03** | **A+ (95)** | **ACHIEVED** | **100% JSDoc on all services, retry buttons on all error screens** |
| **15** | **2026-04-03** | **A+ (95)** | Firebase migration, E2E audit | Migrated to tracekeeper-51b4d (asia-southeast1), fixed tenant cancel rules, auth layout maintainer redirect, hook loading states, testID coverage, Maestro flows updated |

---

## 11. Improvement Backlog

### Round 1 Completed
- [x] Rewrite Firestore security rules with field-level validation
- [x] Fix storage rules (content-type, path scoping)
- [x] Fix ESLint 9 config (ESLINT_USE_FLAT_CONFIG=false, lint errors blocking)
- [x] Remove all @ts-ignore, `any`, unused vars
- [x] Add error handling to all catch paths (chat, notes, auth bootstrap)
- [x] Add accessibility props (accessibilityLabel, accessibilityRole, testID)
- [x] Add inline form validation with field-level error display
- [x] Use completeRequest service in maintainer screen (sets resolvedAt)
- [x] Create comprehensive README.md
- [x] Fix TEST_PLAN.md role inaccuracies
- [x] Add Firestore security rules tests
- [x] Add composite index for maintainer query
- [x] Make lint blocking in CI scripts

### Remaining (if any from Round 2)
- [ ] _TBD from Codex Round 2_
