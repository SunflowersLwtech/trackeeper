# TracKeeper

**A Cross-Platform Mobile Application for Property Maintenance Request Management**

TracKeeper is a multi-role maintenance request management system for residential properties, built with React Native (Expo) and Firebase. It enables tenants, property managers, and maintenance staff to collaborate on maintenance workflows through a shared real-time interface across iOS, Android, and web — from a single TypeScript codebase.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Database Schema](#5-database-schema)
6. [Request State Machine](#6-request-state-machine)
7. [Security Model](#7-security-model)
8. [Testing and Quality Assurance](#8-testing-and-quality-assurance)
9. [Getting Started](#9-getting-started)
10. [Running the App](#10-running-the-app)
11. [Project Structure](#11-project-structure)
12. [Design Rationale](#12-design-rationale)
13. [Known Limitations and Future Work](#13-known-limitations-and-future-work)
14. [Academic Context](#14-academic-context)
15. [Licence](#15-licence)

---

## 1. Introduction

### 1.1 Background

Property maintenance management in residential communities traditionally relies on manual processes — phone calls, paper forms, and verbal follow-ups. These methods lead to lost requests, unclear accountability, communication gaps between tenants and maintenance staff, and a lack of transparency in request progress. As residential developments grow in scale, the need for a systematic, digital solution becomes critical.

### 1.2 Problem Statement

Existing property maintenance workflows suffer from three core deficiencies:

1. **Lack of real-time visibility** — tenants submit requests but receive no timely feedback on status changes, leading to repeated inquiries and tenant dissatisfaction.
2. **Fragmented communication** — conversations between tenants, managers, and maintenance staff occur across disconnected channels (phone, messaging apps, email), making it difficult to maintain a coherent audit trail.
3. **No systematic tracking** — without a structured lifecycle, requests are easily lost, duplicated, or left unresolved, with no mechanism for accountability or performance measurement.

### 1.3 System Objectives

TracKeeper addresses these challenges through five core objectives:

| ID | Objective | Implementation |
|----|-----------|----------------|
| O1 | **Authentication and Role-Based Access Control** | Email/password authentication with three distinct roles (Tenant, Manager, Maintainer), each with dedicated screens and permission boundaries enforced at both client and server levels |
| O2 | **Maintenance Request Lifecycle Management** | A deterministic six-state state machine governing request progression, with per-role transition rules validated on both client and server |
| O3 | **Real-Time Data Synchronisation** | Firestore `onSnapshot` subscriptions delivering sub-500 ms latency across all connected clients on all platforms |
| O4 | **Integrated Communication** | In-request real-time chat between all participants and manager-only private notes, scoped to individual requests |
| O5 | **Dashboard, Filtering, and Performance Rating** | Role-specific dashboards with status/category/priority filters, live statistics, and a post-completion 1–5 star rating system |

### 1.4 Scope

The system is designed as a focused MVP for small-to-medium residential communities. It covers the full maintenance request lifecycle from submission through resolution, including assignment, status tracking, communication, and quality rating. The scope explicitly excludes financial settlement, contract management, and multi-property portfolio management.

---

## 2. Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | Three-role system | Tenant, Manager, and Maintainer with dedicated screens and permission boundaries |
| 2 | Real-time synchronisation | Firestore `onSnapshot` subscriptions with sub-500 ms latency across all platforms |
| 3 | Request lifecycle state machine | Deterministic six-state transitions enforced on both client and server |
| 4 | In-request chat | Real-time messaging between all participants on a request via floating action button |
| 5 | Manager private notes | Internal notes visible only to the manager role for operational coordination |
| 6 | Image uploads | Photo attachment via `expo-image-picker` with Firebase Storage (10 MB, image/* only) |
| 7 | Rating system | Tenants rate completed work (1–5 stars) with an optional text comment |
| 8 | Dashboard filtering | Bottom-sheet filter panel with status, category, and priority chips; search bar; active filter pills |
| 9 | Push notifications | Device-native push notifications via `expo-notifications` with lazy loading for SSR safety |
| 10 | Cursor-based pagination | Infinite scroll with `startAfter` cursors; real-time first page merged with paginated history |
| 11 | Auth persistence | Sessions survive app restarts via AsyncStorage (native) / localStorage (web) |
| 12 | Form validation | Client-side validation with inline field-level error messages |
| 13 | Error boundaries | Global `AppErrorBoundary` catches render errors with a retry button |
| 14 | Offline persistence | Firestore `persistentLocalCache` with `persistentMultipleTabManager` for offline data access |
| 15 | Staff provisioning | Managers can create Manager and Maintainer accounts via in-app form (REST API) |
| 16 | Skeleton loading | Animated placeholder cards during data loading for improved perceived performance |

### 2.1 Role Capabilities

| Role | Capabilities |
|------|-------------|
| **Tenant** | Create requests (title, description, category, priority, photo); view own requests; edit submitted requests; cancel submitted/assigned requests; chat with assignee; rate completed work |
| **Manager** | View all requests; assign requests to maintainers (with phone and ETA); hold/resume requests; write private notes; provision staff accounts; view per-status statistics and average ratings |
| **Maintainer** | View assigned tasks; accept assignments; mark work complete; hold/resume tasks; chat with tenant; view work statistics and average rating |

---

## 3. Architecture

### 3.1 System Architecture

TracKeeper follows a **frontend-heavy serverless BaaS** architecture. All business logic resides in the client application, while Firebase provides authentication, real-time database, and file storage as fully managed services. Server-side enforcement is achieved through declarative Firestore and Storage security rules.

```
┌──────────────────────────────────────────────────────────────┐
│                        App Layer                             │
│  (auth)/login    (tenant)/index    (manager)/index           │
│  (auth)/register (tenant)/[id]     (manager)/[id]            │
│                  (tenant)/create   (manager)/users           │
│                  (tenant)/edit     (maintainer)/index         │
│                  (tenant)/profile  (maintainer)/[id]          │
│                                   (maintainer)/profile       │
├──────────────────────────────────────────────────────────────┤
│                     Components Layer                         │
│  chat/    ChatBubble · ChatInput · ChatView · ChatFAB        │
│  notes/   NoteInput · NotesList                              │
│  request/ RequestCard · FilterToolbar · FilterSheet ·        │
│           StatusTimeline · StatusHistory · RatingStars        │
│  ui/      BottomSheet · ConfirmModal · SkeletonCard ·        │
│           StatusBadge · PriorityBadge · EmptyState · Toast   │
├──────────────────────────────────────────────────────────────┤
│                       Hooks Layer                            │
│  useAuth · useRequests · useRequest · useMessages · useNotes │
│  useMaintainers · useMaintainerRequests · useColors ·        │
│  useConfirm · useNotifications                               │
├──────────────────────────────────────────────────────────────┤
│                     Services Layer                           │
│  auth.ts · requests.ts · messages.ts · notes.ts · users.ts  │
│  notifications.ts                                            │
├──────────────────────────────────────────────────────────────┤
│                      Firebase SDK                            │
│  Authentication       Firestore       Storage                │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Separation of Concerns

| Layer | Responsibility | Key Principle |
|-------|---------------|---------------|
| **Services** | Pure Firebase SDK calls — CRUD, subscriptions, file uploads | No UI logic, no state management; every function is JSDoc-documented |
| **Hooks** | Bridge between services and components; manage real-time subscriptions and local state | Encapsulate subscription lifecycle (subscribe on mount, unsubscribe on unmount) |
| **Components** | Presentational and container components, reusable across roles | `React.memo` for performance; `testID` on all interactive elements |
| **App routes** | Screen-level composition with role-based file routing | Each role group occupies its own directory: `(tenant)/`, `(manager)/`, `(maintainer)/` |

### 3.3 Data Flow

```
User Action → Screen (App Layer) → Hook (subscribe/call) → Service (Firebase SDK)
                                                                    ↓
                                                              Firebase Cloud
                                                                    ↓
                                                           onSnapshot callback
                                                                    ↓
                                                          Hook updates state
                                                                    ↓
                                                         Component re-renders
```

All list views use a **hybrid pagination model**: the first page subscribes in real-time via `onSnapshot`, while additional pages are fetched on-demand via `getDocs` with `startAfter` cursors. A `mergeRequests` utility deduplicates overlapping records between the real-time page and paginated history.

---

## 4. Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | React Native + Expo | 0.81.5 / SDK 54 | Single codebase for iOS, Android, and web; managed workflow eliminates native build configuration |
| Language | TypeScript (strict mode) | 5.9.2 | Static type safety with zero `any` types and zero `@ts-ignore` directives |
| Routing | Expo Router (file-based) | 6.0.23 | Filesystem-based routing maps directly to the three-role architecture |
| Styling | NativeWind (Tailwind CSS) | 4.2.3 | Utility-first styling with consistent design tokens across platforms |
| Backend | Firebase (Auth + Firestore + Storage) | 12.11.0 | Fully managed BaaS with real-time subscriptions and declarative security rules |
| State Sync | Firestore `onSnapshot` listeners | — | Sub-500 ms real-time synchronisation without custom WebSocket infrastructure |
| Navigation | React Navigation | 7.1.8 | Underlying navigation engine for Expo Router |
| Unit Testing | Jest + React Native Testing Library | 29.7.0 / 13.3.3 | Standard React Native testing stack with component and hook testing |
| Rules Testing | @firebase/rules-unit-testing | 5.0.0 | Emulator-based security rules verification |
| E2E Testing | Maestro | 2.4.0 | Mobile-native E2E testing with YAML-based flow definitions |
| Linting | ESLint + Prettier | 9.39.4 / 3.8.1 | Static analysis with `no-explicit-any` and `no-unused-vars` set to error |
| CI/CD | GitHub Actions | — | Automated type checking, linting, and testing on every push to `main` |

---

## 5. Database Schema

### 5.1 Firestore Collections

**`users`** — User profiles linked to Firebase Authentication UIDs.

| Field | Type | Constraints |
|-------|------|------------|
| `uid` | string | Immutable; must match `auth.uid` |
| `email` | string | Immutable; must match `auth.token.email` |
| `name` | string | Required; minimum 2 characters |
| `role` | string | Immutable after creation; one of `"tenant"`, `"manager"`, `"maintainer"` |
| `phone` | string? | Optional; used for maintainer contact |
| `unitNumber` | string? | Optional; tenant residential unit identifier |

**`requests`** — Maintenance request documents with full lifecycle state.

| Field | Type | Constraints |
|-------|------|------------|
| `title` | string | Required; minimum 5 characters |
| `description` | string | Required; minimum 10 characters |
| `category` | string | One of `"Plumbing"`, `"Electrical"`, `"General"` |
| `priority` | string | One of `"low"`, `"medium"`, `"high"`; defaults to `"medium"` |
| `status` | string | One of 6 states; transitions validated per role |
| `imageUrl` | string? | Firebase Storage URL; upload may fail gracefully |
| `tenantId` | string | Immutable; must match creating user's `auth.uid` |
| `tenantName` | string | Immutable; populated from user profile |
| `assignedTo` | string? | Maintainer UID; set by manager during assignment |
| `maintainerName` | string? | Populated from maintainer profile during assignment |
| `statusHistory` | array | Append-only log of `{from, to, changedBy, changedByName, changedAt, note?}` |
| `rating` | number? | 1–5; set by tenant after completion |
| `ratingComment` | string? | Optional text accompanying the rating |
| `createdAt` | Timestamp | Server timestamp at creation |
| `updatedAt` | Timestamp | Server timestamp on every update |
| `resolvedAt` | Timestamp? | Set when status transitions to `completed` |

**`requests/{requestId}/messages`** — In-request chat messages (subcollection).

| Field | Type | Constraints |
|-------|------|------------|
| `senderId` | string | Must match `auth.uid` |
| `senderName` | string | Required |
| `text` | string | Required; maximum 2000 characters; whitespace-trimmed |
| `createdAt` | Timestamp | Server timestamp |

**`requests/{requestId}/notes`** — Manager-only private notes (subcollection).

| Field | Type | Constraints |
|-------|------|------------|
| `managerId` | string | Must match `auth.uid`; user must have `role == "manager"` |
| `managerName` | string | Required |
| `text` | string | Required; whitespace-trimmed |
| `createdAt` | Timestamp | Server timestamp |

---

## 6. Request State Machine

### 6.1 State Diagram

```
                        ┌─────────────┐
                        │  submitted  │
                        └──────┬──────┘
                               │
                 ┌─────────────┼─────────────┐
                 │ (Tenant)    │ (Manager)    │
                 ▼             ▼              │
           ┌───────────┐ ┌──────────┐        │
           │ cancelled │ │ assigned │◄───┐    │
           └───────────┘ └────┬─────┘    │    │
                 ▲            │          │    │
                 │ (Tenant)   │(Maint.)  │    │
                 │            ▼          │    │
                 │     ┌─────────────┐   │    │
                 │     │ in_progress │   │    │
                 │     └──────┬──────┘   │    │
                 │            │          │    │
                 │  ┌─────────┼──────┐   │    │
                 │  │(Maint.) │      │   │    │
                 │  ▼         │      ▼   │    │
                 │ ┌─────────┐│ ┌─────────┐   │
                 │ │completed││ │ on_hold │───┘
                 │ └─────────┘│ └─────────┘
                 │            │
                 └────────────┘
```

### 6.2 Transition Rules by Role

| Role | Allowed Transitions |
|------|-------------------|
| **Tenant** | `submitted → cancelled`, `assigned → cancelled` |
| **Manager** | `submitted → assigned`, `assigned → on_hold`, `in_progress → on_hold`, `on_hold → assigned`, `on_hold → in_progress` |
| **Maintainer** | `assigned → in_progress`, `in_progress → completed`, `assigned → on_hold`, `in_progress → on_hold`, `on_hold → assigned`, `on_hold → in_progress` |

### 6.3 Enforcement

Transitions are validated at **two independent layers**:

1. **Client-side** — `canTransitionWithRole()` in `utils/status.ts` prevents UI from offering invalid actions.
2. **Server-side** — Firestore security rules validate the `status` field against a per-role whitelist, rejecting any non-conforming write.

Every transition is recorded in the `statusHistory` array with timestamp, actor identity, previous state, and an optional note.

---

## 7. Security Model

### 7.1 Firestore Security Rules

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| `users` | Any authenticated user | Own profile only; `role` must be `"tenant"` (public registration) or provisioned by a manager | Own profile only; `role`, `uid`, `email` are immutable | Never |
| `requests` | Tenant: own; Manager: all; Maintainer: assigned | Tenant only; ownership fields (`tenantId`, `tenantName`) enforced | Role-specific field constraints and state machine validation | Never |
| `messages` | Participants only (tenant + assignee + any manager) | Participants only; `senderId` must match `auth.uid` | Never | Never |
| `notes` | Manager only | Manager only; `managerId` must match `auth.uid` | Never | Never |

### 7.2 Update Constraints by Role

- **Manager**: May change status (following state machine), assignment fields, and hold state. Cannot modify tenant ownership fields (`tenantId`, `tenantName`).
- **Tenant**: May edit content fields (`title`, `description`) only when status is `submitted`. May cancel from `submitted` or `assigned`. May rate when status is `completed` (rating 1–5).
- **Maintainer**: May only change status (following state machine) on requests assigned to them. All other fields are immutable.

### 7.3 Key Security Properties

| Property | Enforcement |
|----------|------------|
| **No delete operations** | All collections deny delete; data retention by design |
| **Identity verification** | `senderId`, `managerId`, `tenantId` must match `request.auth.uid` at write time |
| **Field-level immutability** | Ownership and assignment fields cannot be changed by unauthorised roles |
| **Role immutability** | Users cannot change their own `role` field after registration |
| **Storage scoping** | Uploads restricted to `image/*` content type, 10 MB maximum, scoped to `requests/{requestId}/{fileName}` |
| **Participant-only messaging** | Only the tenant, assigned maintainer, and managers can read/write messages on a request |

---

## 8. Testing and Quality Assurance

### 8.1 Test Pyramid

```
          ┌─────────┐
          │  E2E    │  10 Maestro flows (iOS Simulator)
          │ (10)    │  3 cross-platform data chains (Web + iOS + Android)
         ─┼─────────┼─
         │  Integration  │  65 Firestore security rule tests (emulator)
         │    (65)       │  50 manual smoke scenarios + 3 use cases
        ─┼───────────────┼─
        │    Unit Tests       │  234 unit + integration tests (Jest)
        │      (225)          │  30 boundary/edge-case tests
        └─────────────────────┘
```

### 8.2 Quality Metrics

| Metric | Value | Target |
|--------|-------|--------|
| Unit + integration tests | 225 passed | All pass |
| Firestore security rule tests | 65 passed | All pass |
| E2E flows (Maestro) | 10 passed | All pass |
| Statement coverage | 94.62% | > 90% |
| Branch coverage | 95.91% | > 90% |
| TypeScript strict mode | Enabled (zero errors) | Enabled |
| ESLint errors | 0 | 0 |
| `any` type usage | 0 | 0 |
| Cross-platform data chains | 3 use cases x 3 platforms | All pass |
| Boundary / edge-case tests | 30 passed | All pass |
| Manual smoke scenarios | 50 documented (docs/TEST_PLAN.md) | All pass |
| **Total verified test points** | **373** | — |

### 8.3 Test Commands

| Command | Scope | Expected Result |
|---------|-------|-----------------|
| `npm test` | 234 unit and integration tests | All pass |
| `npm run test:coverage` | Coverage report | Statements > 94%, Branches > 95% |
| `npm run test:rules` | 65 Firestore security rule tests (requires emulator) | All pass |
| `npm run typecheck` | TypeScript strict type checking | Zero errors |
| `npm run lint` | ESLint static analysis | Zero errors |
| `npm run pipeline:unit` | TypeScript + ESLint + unit tests | All pass |
| `npm run pipeline` | Full pipeline including E2E | All pass |

### 8.4 E2E Testing (Maestro)

```bash
# 1. Start Expo for iOS:
npx expo start --ios --port 8083

# 2. Start the clipboard bridge server (required for iOS 26+ compatibility):
node scripts/maestro-input-server.js &

# 3. Run all ten E2E flows:
~/.maestro/bin/maestro test .maestro/

# 4. Run a single flow:
~/.maestro/bin/maestro test .maestro/01_auth_login.yaml
```

The ten Maestro flows cover the complete user journey:

| Flow | Scenario |
|------|----------|
| 01 | Tenant login with valid credentials |
| 02 | Tenant self-registration |
| 03 | Tenant creates a maintenance request |
| 04 | Manager assigns request to maintainer |
| 05 | Manager sends chat message |
| 06 | Maintainer accepts and completes task |
| 07 | Maintainer puts task on hold and resumes |
| 08 | Form validation error handling |
| 09 | Tenant cancels a submitted request |
| 10 | Manager staff creation form |

> **Note:** On iOS 26.2, Maestro's `inputText` command does not trigger React Native's `onChangeText`. The flows use a clipboard-and-paste workaround via `scripts/maestro-input-server.js`.

### 8.5 CI/CD Pipeline

GitHub Actions runs on every push to `main`:

1. **TypeScript** — `tsc --noEmit` (strict mode, zero errors)
2. **ESLint** — static analysis with `no-explicit-any` and `no-unused-vars` as errors
3. **Jest** — 225 tests with 80% coverage threshold on all metrics
4. **Coverage artifact** — uploaded for review (7-day retention)

### 8.6 Manual Smoke Test Plan

A comprehensive manual test plan (`docs/TEST_PLAN.md`) documents 50 scenarios covering authentication (S01–S12), request lifecycle (S13–S29), rating (S30–S32), chat (S33–S38), manager notes (S39–S41), security edge cases (S42–S47), and operational edge cases (S48–S50), plus 3 cross-platform data chain use cases verified on Web, iOS, and Android.

---

## 9. Getting Started

### 9.1 Prerequisites

| Requirement | Purpose |
|-------------|---------|
| Node.js 18+ | JavaScript runtime |
| Expo CLI (`npx expo`) | Build and serve the React Native app |
| Firebase CLI (`npm install -g firebase-tools`) | Deploy security rules and manage the Firebase project |
| Xcode (macOS only) | iOS Simulator |
| Android SDK + Emulator | Android Emulator |
| Maestro CLI | End-to-end testing |

### 9.2 Installation

```bash
git clone https://github.com/SunflowersLwtech/trackeeper.git
cd trackeeper/project
npm install
```

### 9.3 Firebase Configuration

The project is pre-configured for Firebase project `tracekeeper-51b4d` (region: `asia-southeast1`). To use a different project:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Email/Password** authentication.
3. Create a **Cloud Firestore** database in production mode.
4. Enable **Firebase Storage**.
5. Copy the Firebase config object to `.env` (see `.env.example`).
6. Deploy security rules and indexes:
   ```bash
   firebase login
   firebase use --add            # select your project
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

### 9.4 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Tenant | testtenant@trackeeper.test | Test123456 |
| Manager | testmanager@trackeeper.test | Test123456 |
| Maintainer | testmaintainer@trackeeper.test | Test123456 |

Manager and maintainer accounts are provisioned via the in-app staff management screen (Manager role required).

---

## 10. Running the App

### 10.1 One-command LAN launch

Use these scripts for local demos and physical-device testing. They clear stale
listeners on ports `8080-8099`, start Expo on port `8080`, and print both the
Web URL and Expo Go URL.

macOS / Linux:

```bash
npm run dev:mac
```

Windows:

```bat
npm run dev:windows
```

Default output format:

```text
Web:      http://<LAN-IP>:8080
Expo Go:  exp://<LAN-IP>:8080
```

Optional overrides:

```bash
EXPO_PORT=8081 PORT_START=8080 PORT_END=8099 npm run dev:mac
```

```powershell
$env:EXPO_PORT=8081; npm run dev:windows
```

### 10.2 All Three Platforms

```bash
npx expo start
# Press:  w → Web    i → iOS Simulator    a → Android Emulator
```

### 10.3 Web

```bash
npm run dev:lan
# Serves at http://localhost:8080
```

### 10.4 iOS Simulator

```bash
npx expo start --ios
```

Requires macOS with Xcode installed. Expo Go is automatically installed on the simulator.

### 10.5 iOS Physical Device

1. Install **Expo Go** from the App Store.
2. Run `npm run dev:mac` or `npm run dev:windows` in the terminal.
3. Scan the QR code with the iPhone camera.

### 10.6 Android Emulator

```bash
# Install (macOS with Homebrew):
brew install --cask android-commandlinetools
yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-35" \
  "system-images;android-35;google_apis;arm64-v8a"

# Create a virtual device:
echo "no" | avdmanager create avd -n TracKeeper_Test \
  -k "system-images;android-35;google_apis;arm64-v8a" -d "pixel_7"

# Start the emulator:
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
$ANDROID_HOME/emulator/emulator -avd TracKeeper_Test &

# Launch the app:
npx expo start --android
```

### 10.7 Android Physical Device

1. Install **Expo Go** from Google Play Store.
2. Enable Developer Options and USB Debugging.
3. Run `npm run dev:mac` or `npm run dev:windows`, then scan the QR code in Expo Go.

---

## 11. Project Structure

```
project/
├── app/                         Screen-level route composition
│   ├── (auth)/                  Login and register screens
│   ├── (tenant)/                Request list, create, detail, edit, profile
│   ├── (manager)/               Dashboard, request detail, staff management, profile
│   ├── (maintainer)/            Task list, task detail, profile
│   ├── _layout.tsx              Root layout with auth routing and role-based redirection
│   └── +not-found.tsx           404 fallback screen
├── components/
│   ├── chat/                    ChatBubble, ChatInput, ChatView, ChatFAB
│   ├── notes/                   NoteInput, NotesList
│   ├── request/                 RequestCard, FilterToolbar, FilterSheet, StatusTimeline,
│   │                            StatusHistory, RatingStars
│   └── ui/                      BottomSheet, ConfirmModal, SkeletonCard, StatusBadge,
│                                PriorityBadge, EmptyState, LoadingScreen, Toast
├── config/
│   └── firebase.ts              Firebase initialisation with platform-aware auth persistence
├── constants/
│   └── Colors.ts                Semantic colour palette with light/dark theme tokens
├── contexts/
│   └── AuthContext.tsx           Authentication state provider with Firestore profile sync
├── hooks/                       Real-time data subscription hooks (useRequests, useMessages, etc.)
├── services/                    Firebase SDK service functions (auth, requests, messages,
│                                notes, users, notifications)
├── types/
│   └── index.ts                 TypeScript type definitions for all Firestore document shapes
├── utils/                       State machine logic, validation, colour utilities,
│                                time formatting, priority helpers, toast wrappers
├── __tests__/                   Unit and integration tests (mirrors source structure)
│   ├── components/              Component rendering tests
│   ├── hooks/                   Hook subscription and lifecycle tests
│   ├── rules/                   Firestore security rule tests (emulator-based)
│   ├── services/                Service function tests with Firebase mocks
│   └── utils/                   Pure function tests
├── .maestro/                    10 Maestro E2E test flows (YAML)
├── .github/workflows/           GitHub Actions CI pipeline
├── scripts/                     CI pipeline scripts and E2E helpers
├── firestore.rules              Firestore security rules (role-based CRUD + state machine)
├── storage.rules                Firebase Storage security rules (type, size, path)
├── docs/
│   ├── LIVESPEC.md              Living specification document with review history
│   ├── TEST_PLAN.md             Manual smoke test plan (50 scenarios + 3 cross-platform chains)
│   └── ACADEMIC_DELIVERABLES.md Academic deliverables and achievement summary
└── ...
```

---

## 12. Design Rationale

### 12.1 React Native with Expo

Cross-platform development from a single TypeScript codebase targeting iOS, Android, and web. Expo SDK 54 provides a managed workflow that eliminates native build configuration while producing production-grade output on all three platforms. This choice maximises code reuse (estimated at >95%) and minimises platform-specific maintenance overhead.

### 12.2 Firebase as Serverless Backend

Firebase provides authentication, a real-time NoSQL database, and file storage as fully managed services requiring zero server infrastructure. This architecture eliminates the need for a custom backend server, REST API design, and deployment pipeline — allowing the development effort to focus entirely on the client application and business logic. Firestore's `onSnapshot` mechanism enables sub-500 ms real-time synchronisation, which is a core requirement for the multi-role collaboration model.

### 12.3 Declarative Security Rules

Instead of implementing access control in a backend server, TracKeeper uses Firestore's declarative security rules to enforce RBAC at the database level. This approach ensures that:

- Security is enforced regardless of the client implementation.
- Rules are version-controlled alongside the application code.
- Security logic is testable via the `@firebase/rules-unit-testing` framework (65 tests).

### 12.4 Role-Based File Routing

Expo Router's file-based routing maps directly to the three-role architecture. Each role group (`(tenant)/`, `(manager)/`, `(maintainer)/`) occupies its own directory, enforcing separation at the filesystem level. This makes the access model immediately visible in the project structure and prevents accidental cross-role screen access.

### 12.5 State Machine for Request Lifecycle

Encoding the request lifecycle as a deterministic state machine with per-role transition rules ensures:

- **Correctness** — invalid transitions are rejected at both client and server layers.
- **Auditability** — every transition is recorded in `statusHistory` with timestamp, actor identity, and previous state.
- **Testability** — the transition logic in `utils/status.ts` is a pure function with 50+ unit tests covering all valid and invalid transition combinations.

### 12.6 Hybrid Pagination Model

List views use a hybrid approach: the first page subscribes in real-time via `onSnapshot` for instant updates, while additional pages are fetched on-demand via `getDocs` with `startAfter` cursors. A `mergeRequests` utility deduplicates overlapping records, ensuring consistency between the real-time and paginated data sources.

---

## 13. Known Limitations and Future Work

### 13.1 Current Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Manager/maintainer accounts require privileged provisioning | Non-tenant roles cannot self-register | In-app staff provisioning for managers; production would use Cloud Functions |
| Maestro `inputText` incompatible with iOS 26.2 | E2E tests require clipboard workaround | Bridge server (`maestro-input-server.js`) automates the workaround |
| Expo Go limitations | Cannot test native modules requiring a custom dev client | Sufficient for project scope; production builds would use EAS Build |
| Firebase Spark (free) tier | Rate limits on concurrent connections and storage | Adequate for demonstration and testing purposes |

### 13.2 Future Work

| Enhancement | Description |
|-------------|-------------|
| Analytics dashboard | Aggregate statistics for managers: response times, resolution rates, category distribution trends |
| Multi-language support | Internationalisation (i18n) with language switching for multilingual residential communities |
| Advanced notification preferences | Per-category and per-status notification filters; quiet hours |
| Photo gallery | Multiple image attachments per request with carousel view |
| Offline-first writes | Queued mutations when offline, synced on reconnection |
| Production deployment | EAS Build for native binaries; Firebase Blaze plan for production scale |

---

## 14. Academic Context

### 14.1 Course Information

| Field | Value |
|-------|-------|
| Course | CAT404 / CAT405 — Software Engineering / Computing Intelligent Major Project |
| Institution | University (Final-Year Capstone) |
| Student | LI JIACHENG |
| Supervisor | Dr. Justtina Anantha Jothi |
| Demo Date | 10 April 2026 |

### 14.2 Academic Contribution

This project demonstrates the feasibility of building a production-grade, multi-role property maintenance management system using a cross-platform mobile framework and a serverless backend. Key academic contributions include:

1. **Cross-platform BaaS architecture** — validation that a frontend-heavy architecture with declarative server-side security rules can replace a traditional three-tier backend for RBAC-governed CRUD applications.
2. **Deterministic state machine with dual enforcement** — demonstration that encoding business process logic as a formal state machine, enforced independently at both client and server layers, provides correctness guarantees that are both testable (via unit tests) and auditable (via immutable `statusHistory` logs).
3. **Real-time multi-role collaboration** — empirical evidence that Firestore's `onSnapshot` subscriptions can deliver sub-500 ms latency for multi-user real-time workflows across three distinct platforms from a single codebase.
4. **Comprehensive automated testing** — a multi-level testing strategy (unit, integration, security rules, E2E) achieving 94.62% statement coverage and 95.91% branch coverage, demonstrating that high test coverage is achievable within the time constraints of a capstone project.

### 14.3 Alignment with UN Sustainable Development Goals

TracKeeper contributes to **SDG 11: Sustainable Cities and Communities** by providing a digital tool that improves the efficiency and transparency of residential property maintenance, promoting better living conditions and responsive community management.

---

## 15. Licence

This project was developed for academic purposes as a university graduation capstone. All rights reserved.
