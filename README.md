# TracKeeper

A multi-role maintenance request management system for residential properties, built with React Native (Expo) and Firebase.

## 1. Introduction

### 1.1 Project Scope

TracKeeper enables three distinct user roles to collaborate on property maintenance workflows:

- **Tenants** submit maintenance requests with descriptions, categories, priorities, and optional photos.
- **Managers** triage incoming requests, assign them to maintainers, and monitor progress across all properties.
- **Maintainers** receive assigned tasks, update work status, and communicate with tenants via in-app chat.

All interactions are synchronised in real time through Firestore subscriptions, with a target latency of under 500 ms.

### 1.2 Academic Context

This project was developed as a university graduation capstone (final-year project). The codebase demonstrates proficiency in cross-platform mobile development, backend-as-a-service architecture, role-based access control, real-time data synchronisation, and automated testing at multiple levels (unit, integration, security rules, end-to-end).

## 2. Features

| Feature | Description |
|---------|-------------|
| Three-role system | Tenant, Manager, and Maintainer with dedicated screens and permissions |
| Real-time synchronisation | Firestore `onSnapshot` subscriptions with sub-500 ms latency |
| Request lifecycle state machine | Deterministic status transitions enforced on both client and server |
| In-request chat | Real-time messaging between all participants on a request |
| Manager private notes | Internal notes visible only to the manager role |
| Image uploads | Photo attachment via `expo-image-picker` and Firebase Storage |
| Rating system | Tenants rate completed work (1--5 stars) with an optional comment |
| Dashboard filtering | Status, category, and priority filter chips with a live statistics bar |
| Auth persistence | Sessions survive app restarts via AsyncStorage (native) / localStorage (web) |
| Form validation | Client-side validation with inline field-level error messages |

## 3. Architecture

### 3.1 Layer Diagram

```
┌─────────────────────────────────────────────────┐
│                    App Layer                     │
│  (auth)/    (tenant)/    (manager)/              │
│                    (maintainer)/                 │
├─────────────────────────────────────────────────┤
│                Components Layer                  │
│  ui/    request/    chat/    notes/              │
├─────────────────────────────────────────────────┤
│                  Hooks Layer                     │
│  useAuth  useRequests  useMessages  useNotes    │
│  useRequest  useMaintainers  useMaintainerReqs  │
├─────────────────────────────────────────────────┤
│                Services Layer                    │
│  auth.ts  requests.ts  messages.ts  notes.ts    │
│  users.ts                                        │
├─────────────────────────────────────────────────┤
│                 Firebase SDK                     │
│  Authentication    Firestore    Storage          │
└─────────────────────────────────────────────────┘
```

### 3.2 Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| **Services** | Pure Firebase SDK calls. No UI logic, no state management. |
| **Hooks** | Bridge between services and components. Manage real-time subscriptions and local state. |
| **Components** | Presentational and container components. Reusable across roles. |
| **App routes** | Screen-level composition with role-based file routing (`(tenant)/`, `(manager)/`, `(maintainer)/`). |

## 4. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native + Expo | 0.81.5 / SDK 54 |
| Language | TypeScript (strict mode) | 5.9.2 |
| Routing | Expo Router (file-based) | 6.0.23 |
| Styling | NativeWind (Tailwind CSS) | 4.2.3 |
| Backend | Firebase (Auth + Firestore + Storage) | 12.11.0 |
| State Sync | Firestore `onSnapshot` real-time listeners | — |
| Navigation | React Navigation | 7.1.8 |
| Unit Testing | Jest + React Native Testing Library | 29.7.0 / 13.3.3 |
| Rules Testing | @firebase/rules-unit-testing | 5.0.0 |
| E2E Testing | Maestro | 2.4.0 |
| Linting | ESLint + Prettier | 9.39.4 / 3.8.1 |
| CI/CD | GitHub Actions | — |

## 5. Request State Machine

### 5.1 State Diagram

```
submitted ───→ assigned ───→ in_progress ───→ completed
    │              │               │
    ↓              ↓               ↓
 cancelled      on_hold ←───→ assigned / in_progress
```

### 5.2 Transition Rules by Role

| Role | Allowed Transitions |
|------|-------------------|
| **Tenant** | `submitted → cancelled`, `assigned → cancelled` |
| **Manager** | `submitted → assigned`, `assigned → on_hold`, `in_progress → on_hold`, `on_hold → assigned`, `on_hold → in_progress` |
| **Maintainer** | `assigned → in_progress`, `in_progress → completed`, `assigned → on_hold`, `in_progress → on_hold`, `on_hold → assigned`, `on_hold → in_progress` |

Transitions are validated on both the client (`utils/status.ts`) and the server (Firestore security rules). Every transition is recorded in `statusHistory` with a timestamp and the actor's identity.

## 6. Security Model

### 6.1 Firestore Rules

The security model is defined in `firestore.rules` and enforces role-based access control at every collection level:

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| `users` | Any authenticated user | Own profile only; role must be `tenant` | Own profile only; `role`, `uid`, `email` immutable | Never |
| `requests` | Tenant: own; Manager: all; Maintainer: assigned | Tenant only; ownership fields enforced | Role-specific field constraints (see below) | Never |
| `requests/{id}/messages` | Participants only | Participants only; sender identity verified | Never | Never |
| `requests/{id}/notes` | Manager only | Manager only; author identity verified | Never | Never |

### 6.2 Update Constraints by Role

- **Manager updates**: May change status (following state machine), assignment, and hold state. Cannot modify tenant ownership fields.
- **Tenant updates**: May edit content fields (title, description) only when status is `submitted`. May cancel from `submitted` or `assigned`. May rate when status is `completed` (rating 1--5).
- **Maintainer updates**: May only change status (following state machine) on requests assigned to them. All other fields are immutable.

### 6.3 Key Security Properties

- **No delete operations** — data retention by design.
- **Identity verification** — `senderId`, `managerId`, `tenantId` must match `request.auth.uid`.
- **Field-level immutability** — ownership and assignment fields cannot be changed by unauthorised roles.
- **Role immutability** — users cannot change their own role after registration.
- **Storage scoping** — uploads restricted to `image/*` content type, 10 MB maximum, scoped to request paths.

## 7. Getting Started

### 7.1 Prerequisites

| Requirement | Purpose |
|-------------|---------|
| Node.js 18+ | JavaScript runtime |
| Expo CLI (`npx expo`) | Build and serve the React Native app |
| Firebase CLI (`npm install -g firebase-tools`) | Deploy security rules and manage the Firebase project |
| Xcode (macOS only) | iOS Simulator |
| Android SDK + Emulator | Android Emulator |
| Maestro CLI | End-to-end testing |

### 7.2 Installation

```bash
git clone <repository-url>
cd trackeeper/project
npm install
```

### 7.3 Firebase Configuration

The project is pre-configured for Firebase project `tracekeeper-51b4d` (region: `asia-southeast1`). To use a different project:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Email/Password** authentication.
3. Create a **Cloud Firestore** database in production mode.
4. Enable **Firebase Storage**.
5. Update the config object in `config/firebase.ts`.
6. Deploy security rules and indexes:
   ```bash
   firebase login
   firebase use --add            # select your project
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

### 7.4 Seeding Test Accounts

Public registration creates `tenant` accounts only. Manager and maintainer accounts require privileged provisioning:

1. Temporarily relax the Firestore rules (`firestore.rules`, line 43): change `role == "tenant"` to `role in ["tenant", "manager", "maintainer"]`.
2. Deploy: `firebase deploy --only firestore:rules`.
3. Register accounts through the app or a script.
4. **Revert the rule immediately** and redeploy.

## 8. Running the App

### 8.1 Web

```bash
npx expo start --web
# Serves at http://localhost:8081
```

### 8.2 iOS — Simulator

Requires macOS with Xcode installed.

```bash
npx expo start --ios
```

Expo Go is automatically installed on the simulator. The app loads via the Metro bundler.

### 8.3 iOS — Physical Device

1. Install **Expo Go** from the App Store.
2. Run `npx expo start` in the terminal.
3. Scan the QR code displayed in the terminal using the iPhone camera.

### 8.4 Android — Emulator

Requires the Android SDK with an emulator and a system image.

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

Expo Go is automatically installed on the emulator.

### 8.5 Android — Physical Device

1. Install **Expo Go** from Google Play Store.
2. Enable Developer Options: Settings → About Phone → tap Build Number seven times.
3. Enable USB Debugging in Developer Options.
4. **Wi-Fi (recommended):** Run `npx expo start`, then scan the QR code in the Expo Go app.
5. **USB:** Connect the device via USB, then run `npx expo start --android`.

### 8.6 All Three Platforms Simultaneously

```bash
npx expo start
# Press:  w → Web    i → iOS Simulator    a → Android Emulator
```

## 9. Testing

### 9.1 Test Commands

| Command | Scope | Expected Result |
|---------|-------|-----------------|
| `npm test` | 225 unit and integration tests | All pass |
| `npm run test:coverage` | Coverage report | Statements > 94%, Branches > 95% |
| `npm run test:rules` | 65 Firestore security rule tests (requires emulator) | All pass |
| `npm run typecheck` | TypeScript strict type checking | Zero errors |
| `npm run lint` | ESLint static analysis | Zero errors |
| `npm run pipeline:unit` | TypeScript + ESLint + unit tests | All pass |
| `npm run pipeline` | Full pipeline including E2E | All pass |

### 9.2 E2E Testing — Maestro (iOS Simulator)

```bash
# 1. Start Expo for iOS:
npx expo start --ios --port 8083

# 2. Start the clipboard bridge server (required for iOS 26+ compatibility):
node scripts/maestro-input-server.js &

# 3. Run all five E2E flows:
~/.maestro/bin/maestro test .maestro/

# 4. Run a single flow:
~/.maestro/bin/maestro test .maestro/01_auth_login.yaml
```

The five Maestro flows cover: tenant login, tenant registration, request creation, manager assignment, and in-request chat.

> **Note:** On iOS 26.2, Maestro's `inputText` command does not trigger React Native's `onChangeText`. The flows use a clipboard-and-paste workaround via `scripts/maestro-input-server.js`, which must be running during E2E execution.

### 9.3 E2E Testing — Web (Playwright)

```bash
npx expo start --web --port 8081
# Use Playwright, Cypress, or manual browser testing at http://localhost:8081
```

### 9.4 Quality Metrics

| Metric | Value |
|--------|-------|
| Unit + integration tests | 225 passed |
| Firestore security rule tests | 65 passed |
| E2E flows (Maestro) | 5 |
| Statement coverage | 94.62% |
| Branch coverage | 95.91% |
| TypeScript strict mode | Enabled |
| ESLint errors | 0 |
| Cross-platform E2E data chains (Web + iOS + Android) | 3 × 3 platforms |
| Boundary / edge-case tests | 30 passed |
| **Total verified test points** | **373** |

### 9.5 Manual Smoke Test Plan

A manual smoke test plan covering 23 scenarios (authentication, request lifecycle, chat, and edge cases) is maintained in `TEST_PLAN.md`.

## 10. Project Structure

```
project/
├── app/
│   ├── (auth)/              Login and register screens
│   ├── (tenant)/            Tenant: request list, create, detail, edit, profile
│   ├── (manager)/           Manager: dashboard, request detail, profile
│   ├── (maintainer)/        Maintainer: task list, task detail, profile
│   └── _layout.tsx          Root layout with role-based auth routing
├── components/
│   ├── chat/                ChatBubble, ChatInput, ChatView
│   ├── notes/               NoteInput, NotesList
│   ├── request/             RequestCard, FilterBar, StatsBar, StatusTimeline, RatingStars
│   └── ui/                  StatusBadge, PriorityBadge, LoadingScreen, EmptyState, Toast
├── config/
│   └── firebase.ts          Firebase initialisation and platform-aware auth
├── contexts/
│   └── AuthContext.tsx       Authentication context provider
├── hooks/                   Real-time data subscription hooks
├── services/                Firebase SDK service functions (auth, requests, messages, notes, users)
├── types/
│   └── index.ts             TypeScript type definitions for all Firestore document shapes
├── utils/                   State machine logic, validation, priority helpers, toast utilities
├── __tests__/               Unit and integration tests (mirrors source structure)
├── .maestro/                Maestro E2E test flows
├── .github/workflows/       GitHub Actions CI pipeline
├── scripts/                 CI pipeline scripts and E2E helpers
├── firestore.rules          Firestore security rules
├── storage.rules            Firebase Storage security rules
├── TEST_PLAN.md             Manual smoke test plan (23 scenarios)
└── LIVESPEC.md              Living specification document
```

## 11. Design Decisions

### 11.1 React Native with Expo

Cross-platform development from a single TypeScript codebase targeting iOS, Android, and web. Expo SDK 54 provides a managed workflow that eliminates native build configuration, appropriate for the time constraints of a graduation project while still producing production-grade output on all three platforms.

### 11.2 Firebase as Backend

Firebase provides authentication, a real-time NoSQL database, and file storage as fully managed services requiring no server infrastructure. Firestore's `onSnapshot` mechanism enables sub-500 ms real-time synchronisation — a core requirement for the multi-role collaboration model. Security rules provide server-side enforcement of access control without custom backend code.

### 11.3 Role-Based File Routing

Expo Router's file-based routing maps directly to the three-role architecture. Each role group (`(tenant)/`, `(manager)/`, `(maintainer)/`) occupies its own directory, enforcing separation at the filesystem level and making the access model immediately visible in the project structure.

### 11.4 State Machine for Request Lifecycle

Maintenance requests follow a well-defined lifecycle (`submitted → assigned → in_progress → completed`) with conditional branches (`cancelled`, `on_hold`). Encoding this as a state machine with per-role transition rules ensures:

- **Correctness** — invalid transitions are rejected at both client and server layers.
- **Auditability** — every transition is recorded in `statusHistory` with timestamp, actor identity, and previous state.
- **Testability** — the transition logic in `utils/status.ts` is a pure function with comprehensive unit test coverage.

## 12. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Manager/maintainer accounts require privileged provisioning | Cannot self-register | Documented seeding procedure; production would use Cloud Functions |
| Maestro `inputText` incompatible with iOS 26.2 | E2E tests require clipboard workaround | Bridge server (`maestro-input-server.js`) automates the workaround |
| No push notifications | Users must open the app to see updates | Real-time sync provides immediate updates once the app is open |
| No pagination on initial load | Large datasets may load slowly | `FlatList` windowing with `getItemLayout` mitigates rendering cost |

## 13. Licence

This project was developed for academic purposes as a university graduation capstone.
