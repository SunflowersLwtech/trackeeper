# TracKeeper — Smoke Test Plan

## Setup
- **Device A**: Tenant account (tenant@test.com)
- **Device B**: Manager account (manager@test.com)
- **Network**: WiFi connected

---

## Auth Flow

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| S01 | Wrong password | Login with wrong password | Error alert "Login Failed" |
| S02 | Duplicate email | Register with existing email | Error alert "Registration Failed" |
| S03 | Tenant login | Login as tenant | See Tenant tabs (My Requests, New Request, Profile) |
| S04 | Manager login | Login as manager | See Manager tabs (Dashboard, Profile) |
| S05 | Sign out | Tap "Sign Out" on Profile | Return to Login screen |
| S06 | Auth persistence | Close app, reopen | Still logged in (no login screen) |

## Ticket Lifecycle

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| S07 | Create request | Tenant: fill form + photo → Submit | Success alert, navigate back |
| S08 | Real-time creation | After S07, check Manager Dashboard | New ticket appears < 500ms, no refresh |
| S09 | Status → Assigned | Manager: tap ticket → "Mark as Assigned" | Tenant: status badge turns blue |
| S10 | Status → In Progress | Manager: "Mark as In Progress" | Tenant: badge turns amber |
| S11 | Status → Completed | Manager: "Mark as Completed" | Tenant: badge turns green, shows "✓ Completed" |
| S12 | No backward transition | Check completed ticket detail | No status change buttons visible |
| S13 | Empty form submit | Tenant: submit empty form | Validation error alert |
| S14 | Filter tickets | Manager: tap filter chips | List updates to show only matching status |

## Chat

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| S15 | Tenant sends message | Enter ticket detail → type → send | Message appears as blue bubble (right) |
| S16 | Manager receives | Check manager's ticket detail | Message appears as gray bubble (left) |
| S17 | Manager replies | Manager types → send | Both see messages in correct order |
| S18 | Rapid messages | Send 10 messages quickly | All appear, correct order, no duplicates |
| S19 | Keyboard handling | Open keyboard in chat | Input stays visible, not covered |

## Edge Cases

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| S20 | Offline submission | Disable WiFi → try to create request | Error alert, no crash |
| S21 | Simultaneous sync | Both devices open, create ticket | Both see updates |
| S22 | Fast navigation | Rapidly switch between tabs | No crashes, no blank screens |
| S23 | Large image | Upload 5MB photo | Uploads successfully (may take longer) |

---

## Latency Measurement

To verify < 500ms real-time sync:
1. Open Metro console on Manager device
2. Create ticket on Tenant device
3. Look for log: `[SYNC] Latency: XXXms`
4. Verify XXX < 500

## Pass Criteria
- [ ] All S01-S23 pass
- [ ] Zero Red Screen crashes
- [ ] Zero console errors
- [ ] Latency < 500ms for real-time sync
- [ ] `npm test` — all tests pass
- [ ] `npx tsc --noEmit` — zero errors
