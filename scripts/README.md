# `scripts/` — TracKeeper Demo Seeder

Two Node-side scripts that seed and clear a rich, demo-ready dataset against
the live Firestore project. They drive the same Firebase Web SDK the React
Native app uses, but talk to it through a separate Firebase app instance
(`scripts/firebase-node.ts`) so they don't collide with the RN runtime.

## Files

| File | Purpose |
|------|---------|
| `firebase-node.ts` | Initialises a parallel Firebase app for Node. Reads config from `process.env`. |
| `seed-demo.ts` | Wipes any prior demo data, then provisions 3 tenants + 3 maintainers + 12 maintenance requests with realistic chats, status histories, ratings, costs, payments, and manager notes. |
| `clear-demo.ts` | Wipes only the demo data (does **not** create anything new). |

## Prerequisites

1. **An existing manager account** in Firestore (`/users/{uid}`).
   The seeder signs in as this account to create everything else, because
   the Firestore security rules only let a manager provision staff users
   and only let a manager run cross-tenant operations.

2. **`.env` file** at the project root. Copy `.env.example` and fill in:

   ```env
   FIREBASE_API_KEY=...
   FIREBASE_AUTH_DOMAIN=...
   FIREBASE_PROJECT_ID=...
   FIREBASE_STORAGE_BUCKET=...
   FIREBASE_MESSAGING_SENDER_ID=...
   FIREBASE_APP_ID=...

   # Manager credentials used to drive the seeder
   SEED_MANAGER_EMAIL=manager@example.com
   SEED_MANAGER_PASSWORD=your-real-password
   ```

   The seeder will fail loudly if `SEED_MANAGER_EMAIL` /
   `SEED_MANAGER_PASSWORD` are missing.

3. **Dev dependencies** (`ts-node`, `dotenv`) — already in `package.json`.
   If you ever clone fresh, `npm install` is enough.

## Run it

```bash
# Seed (wipes any prior demo data and re-creates)
npm run seed:demo

# Just wipe — leaves the project empty of demo data
npm run seed:clear
```

Both scripts use `ts-node --transpile-only` (no type-check) and override
`module`/`moduleResolution` to `commonjs`/`node` via
`TS_NODE_COMPILER_OPTIONS`, so they compile cleanly even though the
project's `tsconfig.json` is tuned for the Expo/Metro bundler.

## What gets created

### Demo users

All demo accounts share the password **`DemoPass!2026`** so you can sign
in as anyone during the demo.

| Role | Name | Email | Notes |
|------|------|-------|-------|
| Tenant | Alice Tan | `alice.tenant@demo.trackeeper.local` | active · Block A · Unit 7-12 |
| Tenant | Bob Lim | `bob.tenant@demo.trackeeper.local` | active · Block B · Unit 14-03 |
| Tenant | Charlie Wong | `charlie.tenant@demo.trackeeper.local` | **pending_approval** · Block A · Unit 5-08 |
| Maintainer | David Tan | `david.plumber@demo.trackeeper.local` | RM 80/h · Plumbing |
| Maintainer | Emily Lim | `emily.electric@demo.trackeeper.local` | RM 95/h · Electrical |
| Maintainer | Farah Aziz | `farah.handy@demo.trackeeper.local` | RM 70/h · General |

### Demo requests (12)

| # | Title | Tenant | Status | Priority | Notes |
|---|-------|--------|--------|----------|-------|
| a | Severe water leak in master bathroom | Alice | completed | high (auto) | rated 5★, paid RM 380 (David) |
| b | No power in entire unit | Bob | in_progress | high (auto) | assigned to Emily |
| c | Air conditioner not cooling | Alice | assigned | medium | assigned to Farah |
| d | Slow drain in kitchen sink | Bob | submitted | low | unassigned |
| e | Door lock jammed | Alice | completed | high (auto) | rated 4★, paid RM 175 (Farah, cash) |
| f | Flickering lights in living room | Bob | on_hold | medium | "Awaiting electrical parts" |
| g | Toilet flushing weakly | Alice | completed | medium | NOT yet rated, NOT yet paid (cost RM 220) |
| h | Cabinet door fell off | Bob | cancelled | low | tenant cancelled |
| i | Burnt outlet smell | Alice | completed | high (auto) | rated 5★ "prevented fire risk!", paid RM 250 |
| j | Garbage disposal noise | Bob | completed | low | rated 3★, paid RM 150 |
| k | Hot water inconsistent | Alice | in_progress | medium | assigned to David |
| l | Window won't close fully | Bob | assigned | medium | assigned to Farah |

Every request has:
- a chronological `statusHistory` spanning the last 30 days
- 3-5 chat messages between tenant, maintainer, and manager — with realistic
  back-and-forth, some marked read by the other party (`readBy` populated)
- some have private manager notes (e.g., (a) follow-up reminder, (f) supplier reminder)

The first request (water leak) also has a real public sample image URL
to demonstrate the photo workflow.

## Idempotency

Re-running `npm run seed:demo` first deletes:
- every `/requests/{id}` whose `title` starts with `[DEMO] ` (and its
  `messages` and `notes` subcollections)
- every `/users/{uid}/notifications/*` belonging to a demo user
- demo `/users/{uid}` docs are *flipped to `suspended`* (Firestore rules
  forbid `delete` on user docs) — they are then re-activated by the next
  seed run via merge writes

If a demo Firebase Auth account already exists, the seeder signs in to
recover its uid rather than creating a duplicate.

## Caveats

- **Firebase Auth accounts are not deletable** from the Web SDK as a
  regular user. The clear script can only suspend the Firestore docs.
  To fully purge, an admin should delete the `@demo.trackeeper.local`
  accounts manually from the Firebase console (Authentication → Users).
- The seeder uses each request's intended creation date as `createdAt`
  (a real `Timestamp`), so the manager dashboard ordering matches the
  story timeline. This is by design — the Firestore rules don't enforce
  `createdAt == request.time` for manager-driven creates.
- `serverTimestamp()` is only used for the user docs' `createdAt` field.
