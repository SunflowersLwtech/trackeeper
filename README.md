# TracKeeper

## Overview

TracKeeper is a multi-role maintenance request management system for residential properties, built with React Native (Expo) and Firebase. Tenants submit maintenance requests, managers triage and assign them to maintainers, and maintainers execute the work -- all with real-time synchronisation and in-app communication.

This project was developed as a university graduation capstone.

## Features

- **3-role system** -- Tenant, Manager, and Maintainer, each with dedicated screens and permissions.
- **Real-time sync** -- Firestore `onSnapshot` subscriptions with a target latency under 500 ms.
- **Request lifecycle state machine** -- Deterministic status transitions enforced on both client and server.
- **In-request chat** -- Real-time messaging between all participants on a request.
- **Manager private notes** -- Internal notes visible only to the manager role.
- **Image uploads** -- Photo attachment via `expo-image-picker` and Firebase Storage.
- **Rating system** -- Tenants rate completed work on a 1-5 star scale with an optional comment.
- **Dashboard with filtering** -- Status and priority filter chips plus a live stats bar.
- **Auth persistence** -- Sessions survive app restarts via AsyncStorage.
- **Form validation** -- Client-side validation with clear inline error messages.

## Architecture

```
+-----------------------------------------------+
|                  App Layer                     |
|  (auth)/   (tenant)/   (manager)/             |
|                  (maintainer)/                 |
+-----------------------------------------------+
|              Components Layer                  |
|  ui/   request/   chat/   notes/              |
+-----------------------------------------------+
|                Hooks Layer                     |
|  useAuth  useRequests  useMessages  useNotes  |
|  useRequest  useMaintainers                   |
|  useMaintainerRequests                        |
+-----------------------------------------------+
|              Services Layer                    |
|  auth.ts  requests.ts  messages.ts  notes.ts  |
|  users.ts                                     |
+-----------------------------------------------+
|              Firebase SDK                      |
|  Auth     Firestore     Storage               |
+-----------------------------------------------+
```

### Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| **Services** | Pure Firebase SDK calls. No UI logic, no state. |
| **Hooks** | Bridge between services and components. Manage subscriptions and local state. |
| **Components** | Presentational and container components. Reusable across roles. |
| **App routes** | Screen-level composition with role-based file routing (`(tenant)/`, `(manager)/`, `(maintainer)/`). |

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native + Expo | 0.81.5 / SDK 54 |
| Language | TypeScript (strict) | 5.9.2 |
| Routing | Expo Router (file-based) | 6.0.23 |
| Styling | NativeWind (Tailwind CSS) | 4.2.3 |
| Backend | Firebase (Auth + Firestore + Storage) | 12.11.0 |
| Navigation | React Navigation | 7.1.8 |
| Testing | Jest + React Native Testing Library | 29.7.0 / 13.3.3 |
| E2E Testing | Maestro | -- |
| Linting | ESLint + Prettier | 9.39.4 / 3.8.1 |

## Request State Machine

### State Diagram

```
submitted ----> assigned ----> in_progress ----> completed
    |               |               |
    v               v               v
 cancelled       on_hold <----> assigned / in_progress
```

### Transition Rules by Role

| Role | Allowed Transitions |
|------|-------------------|
| **Tenant** | `submitted -> cancelled`, `assigned -> cancelled` |
| **Manager** | `submitted -> assigned`, `assigned -> on_hold`, `in_progress -> on_hold`, `on_hold -> assigned`, `on_hold -> in_progress` |
| **Maintainer** | `assigned -> in_progress`, `in_progress -> completed`, `assigned -> on_hold`, `in_progress -> on_hold`, `on_hold -> assigned`, `on_hold -> in_progress` |

Transitions are validated on both the client (`utils/status.ts`) and the server (Firestore security rules).

## Security

### Firestore Rules

The security model is defined in `firestore.rules` and enforces role-based access at every level:

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| `users` | Any authenticated user | Own profile only; required fields enforced | Own profile only; role and UID immutable | Never |
| `requests` | Tenant: own; Manager: all; Maintainer: assigned | Tenant only; must set ownership fields and `submitted` status | Manager: any field; Tenant: limited fields on own; Maintainer: limited fields on assigned | Never |
| `requests/{id}/messages` | Participants only (tenant + manager + assigned maintainer) | Participants only; sender identity verified | Never | Never |
| `requests/{id}/notes` | Manager only | Manager only; author identity verified | Never | Never |

### Key Security Properties

- **No deletes** -- data retention by design.
- **Identity verification** -- `senderId`, `managerId`, `tenantId` must match `request.auth.uid`.
- **Field-level immutability** -- tenants and maintainers cannot change ownership or assignment fields.
- **Role immutability** -- users cannot change their own role after registration.

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: Node.js 24 LTS)
- Expo CLI: `npx expo` (no global install needed)
- Firebase CLI: `npm install -g firebase-tools`
- Maestro (for E2E): `curl -Ls https://get.maestro.mobile.dev | bash`

### Installation

```bash
git clone <repository-url>
cd trackeeper/project
npm install
```

### Firebase Setup

The project is pre-configured for Firebase project `tracekeeper-51b4d` (region: asia-southeast1). To use your own:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Firestore** database (production mode, choose your region)
4. Enable **Firebase Storage**
5. Update `config/firebase.ts` with your project config
6. Deploy security rules:
   ```bash
   firebase login
   firebase use --add  # select your project
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

### Seeding Test Accounts

Only `tenant` accounts can self-register. Manager and maintainer accounts must be provisioned:

```bash
# 1. Temporarily allow all roles in firestore.rules (line 43):
#    change: && request.resource.data.role == "tenant"
#    to:     && request.resource.data.role in ["tenant", "manager", "maintainer"]
# 2. Deploy: firebase deploy --only firestore:rules
# 3. Register via the app UI or a script
# 4. Revert the rule and redeploy
```

---

## Running the App — Three Platforms

### Web

```bash
npx expo start --web
# Opens at http://localhost:8081
```

### iOS Simulator

```bash
# Requires: macOS + Xcode (with iOS Simulator)
npx expo start --ios
# Expo Go will auto-install on the simulator and load the app
```

### iOS Physical Device

1. Install **Expo Go** from the App Store on your iPhone
2. Run `npx expo start` in the terminal
3. Scan the QR code shown in the terminal with your iPhone camera
4. The app opens in Expo Go

### Android Emulator

```bash
# Requires: Android SDK with emulator + system image
# Install via Homebrew (macOS):
brew install --cask android-commandlinetools
yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-35" \
  "system-images;android-35;google_apis;arm64-v8a"

# Create AVD:
echo "no" | avdmanager create avd -n TracKeeper_Test \
  -k "system-images;android-35;google_apis;arm64-v8a" -d "pixel_7"

# Start emulator:
$ANDROID_HOME/emulator/emulator -avd TracKeeper_Test &

# Run Expo:
npx expo start --android
# Expo Go will auto-install on the emulator and load the app
```

> **Note**: Set `ANDROID_HOME` to your SDK path. Homebrew installs to
> `/opt/homebrew/share/android-commandlinetools`.

### Android Physical Device

1. Install **Expo Go** from Google Play Store
2. Enable USB debugging in Developer Options (Settings → About → tap Build Number 7 times → Developer Options → USB Debugging)
3. **Same Wi-Fi approach** (recommended):
   - Run `npx expo start` on your computer
   - Open Expo Go on the phone and scan the QR code
4. **USB approach**:
   - Connect phone via USB
   - Run `npx expo start --android`

### Running All Three Simultaneously

```bash
# Start the unified Metro bundler:
npx expo start

# Then press:
#   w  → open Web in browser
#   i  → open iOS simulator
#   a  → open Android emulator
#   ⇧+d → open developer tools
```

---

## Testing

### Automated Tests

| Command | Description |
|---------|------------|
| `npm test` | Run 225 unit and integration tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run test:rules` | Run 65 Firestore security rule tests (requires emulator) |
| `npm run pipeline:unit` | Full static checks + unit tests |
| `npm run pipeline` | Full CI pipeline (lint + typecheck + unit tests + E2E) |

### E2E Tests (Maestro — iOS Simulator)

```bash
# 1. Start the Expo dev server:
npx expo start --ios --port 8083

# 2. Start the input bridge server (workaround for iOS 26.2):
node scripts/maestro-input-server.js &

# 3. Run all flows:
~/.maestro/bin/maestro test .maestro/

# 4. Run a single flow:
~/.maestro/bin/maestro test .maestro/01_auth_login.yaml
```

> **iOS 26.2 Note**: Maestro's `inputText` does not trigger React Native's
> `onChangeText` on iOS 26.2. The flows use a clipboard+paste workaround
> via `scripts/maestro-input-server.js`. This server must be running during
> E2E tests.

### E2E Tests (Playwright — Web)

The web app can be tested via Playwright MCP or any browser automation tool:

```bash
npx expo start --web --port 8081
# Then use Playwright, Cypress, or manual browser testing at http://localhost:8081
```

### Quality Metrics

| Metric | Current |
|--------|---------|
| Unit tests | 225 passed |
| Firestore rule tests | 65 passed |
| Statement coverage | 94.62% |
| Branch coverage | 95.91% |
| TypeScript strict mode | Enabled |
| ESLint errors | 0 |
| E2E flows (Maestro) | 5 |
| Manual smoke scenarios | 23 (see `TEST_PLAN.md`) |

## Project Structure

```
project/
+-- app/
|   +-- (auth)/          # Login and register screens
|   +-- (tenant)/        # Tenant screens: list, create, detail, edit, profile
|   +-- (manager)/       # Manager screens: dashboard, detail, profile
|   +-- (maintainer)/    # Maintainer screens: assigned list, detail, profile
|   +-- _layout.tsx      # Root layout with auth routing
+-- components/
|   +-- chat/            # ChatBubble, ChatInput, ChatView
|   +-- notes/           # NoteInput, NotesList
|   +-- request/         # RequestCard, FilterBar, StatsBar, StatusTimeline, RatingStars
|   +-- ui/              # StatusBadge, PriorityBadge, LoadingScreen, EmptyState, Toast
+-- config/
|   +-- firebase.ts      # Firebase initialisation
+-- contexts/
|   +-- AuthContext.tsx   # Authentication context provider
+-- hooks/
|   +-- useAuth.ts       # Auth state hook
|   +-- useRequests.ts   # Real-time request list subscription
|   +-- useRequest.ts    # Single request subscription
|   +-- useMessages.ts   # Chat messages subscription
|   +-- useNotes.ts      # Manager notes subscription
|   +-- useMaintainers.ts        # Maintainer user list
|   +-- useMaintainerRequests.ts # Requests assigned to maintainer
+-- services/
|   +-- auth.ts          # Firebase Auth operations
|   +-- requests.ts      # Request CRUD + status transitions
|   +-- messages.ts      # Chat message operations
|   +-- notes.ts         # Manager note operations
|   +-- users.ts         # User profile operations
+-- types/
|   +-- index.ts         # TypeScript type definitions
+-- utils/
|   +-- status.ts        # State machine logic and transition validation
|   +-- validation.ts    # Form validation utilities
|   +-- priority.ts      # Priority helpers
|   +-- toast.ts         # Toast notification utilities
+-- __tests__/           # Unit and integration tests (mirrors src structure)
+-- .maestro/            # Maestro E2E test flows
+-- scripts/             # CI pipeline scripts
+-- firestore.rules      # Firestore security rules
+-- storage.rules        # Storage security rules
+-- TEST_PLAN.md         # Manual smoke test plan (23 scenarios)
+-- LIVESPEC.md          # Living specification document
```

## Design Decisions

### Why React Native with Expo

Cross-platform development from a single TypeScript codebase targeting iOS, Android, and web. Expo SDK 54 provides managed workflow tooling that eliminates native build configuration, accelerating development for a time-constrained graduation project.

### Why Firebase

Firebase provides authentication, real-time database, and file storage as managed services with no server to maintain. Firestore's `onSnapshot` enables sub-500 ms real-time sync between devices -- a core requirement for the multi-role collaboration model.

### Why Role-Based File Routing

Expo Router's file-based routing maps naturally to the three-role architecture. Each role group (`(tenant)/`, `(manager)/`, `(maintainer)/`) lives in its own directory, enforcing separation at the filesystem level and making the access model immediately visible in the project structure.

### Why a State Machine for Request Lifecycle

Maintenance requests move through a well-defined lifecycle (`submitted -> assigned -> in_progress -> completed`) with conditional branches (`cancelled`, `on_hold`). Encoding this as a state machine with per-role transition rules provides:

- **Correctness** -- invalid transitions are rejected at both the client and server layers.
- **Auditability** -- every transition is recorded in `statusHistory` with timestamp, actor, and optional note.
- **Testability** -- the transition logic in `utils/status.ts` is a pure function, fully unit-tested.

## Licence

This project was developed for academic purposes.
