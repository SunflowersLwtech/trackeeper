# TracKeeper — Test Plan

## 1. Test Environment

### 1.1 Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Tenant | testtenant@trackeeper.test | Test123456 | Pre-seeded, Unit A-12-03 |
| Manager | testmanager@trackeeper.test | Test123456 | Pre-seeded via admin provisioning |
| Maintainer | testmaintainer@trackeeper.test | Test123456 | Pre-seeded via admin provisioning |

### 1.2 Firebase Project

- Project ID: `tracekeeper-51b4d`
- Region: `asia-southeast1` (Singapore)
- Auth: Email/Password enabled

### 1.3 Platforms

| Platform | Device | Setup Command |
|----------|--------|---------------|
| Web | Any browser | `npx expo start --web` |
| iOS Simulator | iPhone 17 Pro (iOS 26.2) | `npx expo start --ios` |
| iOS Device | iPhone with Expo Go | Scan QR from `npx expo start` |
| Android Emulator | Pixel 7 (Android 15) | `npx expo start --android` |
| Android Device | Phone with Expo Go | Scan QR from `npx expo start` |

---

## 2. Authentication Flow

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| S01 | Wrong password | Login with valid email, wrong password | Toast: "Login Failed" |
| S02 | Invalid email format | Login with "notanemail" | Toast: "Invalid email format" |
| S03 | Empty form submission | Click Sign In with empty fields | Toast: "Email is required" |
| S04 | Duplicate registration | Register with existing email | Toast: "Registration Failed" |
| S05 | Short password | Register with 3-character password | Toast: "Password must be at least 6 characters" |
| S06 | Short name | Register with 1-character name | Toast: "Name must be at least 2 characters" |
| S07 | Tenant login | Login as tenant | See tabs: My Requests, New Request, Profile |
| S08 | Manager login | Login as manager | See tabs: Dashboard, Profile |
| S09 | Maintainer login | Login as maintainer | See tabs: My Tasks, Profile |
| S10 | Sign out | Tap Sign Out on any Profile | Return to Login screen |
| S11 | Auth persistence | Close and reopen app | Still logged in |
| S12 | Role badge | Check Profile for each role | Shows TENANT / MANAGER / MAINTAINER respectively |

---

## 3. Request Lifecycle

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| S13 | Create request | Tenant: fill all fields + submit | Toast: "Your request has been submitted!", request in list |
| S14 | Empty form submit | Tenant: submit empty create form | Inline errors for title, category, description |
| S15 | Title too short | Enter 2-character title, submit | Error: "Title must be at least 5 characters" |
| S16 | Description too short | Enter 5-character description, submit | Error: "Description must be at least 10 characters" |
| S17 | Missing category | Fill title + description, no category | Error: "Please select a valid category" |
| S18 | Real-time sync | After S13, check Manager Dashboard | New request appears without refresh |
| S19 | Assign request | Manager: tap request → Assign → select maintainer → Confirm | Toast: "Request assigned to [name]" |
| S20 | Accept task | Maintainer: tap assigned task → Accept | Status changes to In Progress |
| S21 | Complete task | Maintainer: tap in-progress task → Mark Complete | Status changes to Completed |
| S22 | Put on hold | Maintainer: tap task → Put On Hold | Status changes to On Hold |
| S23 | Resume task | Maintainer: tap on-hold task → Resume | Status returns to In Progress |
| S24 | Cancel (submitted) | Tenant: cancel a submitted request | Status changes to Cancelled |
| S25 | Cancel (assigned) | Tenant: cancel an assigned request | Status changes to Cancelled |
| S26 | No backward transition | Check completed request detail | No status change buttons visible |
| S27 | Filter by status | Manager: tap status filter chips | List filters to matching status only |
| S28 | Filter by category | Manager: tap category filter chips | List filters to matching category |
| S29 | Search | Tenant/Manager: type in search bar | List filters to matching title/description |

---

## 4. Rating

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| S30 | Rate completed request | Tenant: open completed request → tap 5 stars → add comment → Submit | Toast: "Thank you for your feedback!", rating persisted |
| S31 | Rating visible to manager | Manager: open rated request | Rating and comment displayed |
| S32 | Rating visible to maintainer | Maintainer: open completed task | Rating and comment displayed |

---

## 5. Chat

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| S33 | Tenant sends message | Open request detail → type message → send | Message appears as right-aligned bubble |
| S34 | Manager receives message | Manager opens same request → Messages tab | Tenant's message appears as left-aligned bubble |
| S35 | Manager replies | Manager types and sends | Both users see messages in correct order |
| S36 | Maintainer chats | Maintainer opens assigned task → Messages tab → sends | Message visible to all participants |
| S37 | Rapid messages | Send 10 messages quickly | All appear in correct order, no duplicates |
| S38 | Keyboard handling | Open keyboard in chat view | Input stays visible, not covered by keyboard |

---

## 6. Manager Notes

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| S39 | Add note | Manager: open request → Notes tab → type → send | Note appears with author name and timestamp |
| S40 | Notes not visible to tenant | Tenant: open same request | No Notes tab or section visible |
| S41 | Notes not visible to maintainer | Maintainer: open same task | No Notes tab or section visible |

---

## 7. Security Edge Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| S42 | Tenant accesses manager route | Navigate directly to /(manager) while logged as tenant | Redirected to tenant view |
| S43 | Maintainer accesses create page | Navigate directly to /create while logged as maintainer | Redirected to maintainer view |
| S44 | Tenant sees only own requests | Login as tenant | Only requests with matching tenantId shown |
| S45 | Maintainer sees only assigned | Login as maintainer | Only requests assigned to this maintainer shown |
| S46 | Register enforces tenant role | Check register page | Shows "Registering as: Tenant", no role selector |
| S47 | Sign out blocks protected routes | Sign out, navigate to protected route | Redirected to /login |

---

## 8. Edge Cases

| ID | Scenario | Steps | Expected Result |
|----|----------|-------|-----------------|
| S48 | Offline submission | Disable network → try to create request | Error message, no crash |
| S49 | Fast navigation | Rapidly switch between tabs | No crashes, no blank screens |
| S50 | Large image upload | Upload a 5 MB photo | Uploads successfully |

---

## 9. Cross-Platform Data Chain Verification

Each of the following three user cases must be verified on all three platforms (Web, iOS, Android):

### UC1: Full Happy Path
1. Tenant creates request (Plumbing, High priority)
2. Manager assigns to maintainer
3. Maintainer accepts → completes
4. Tenant rates 5 stars with comment
5. Manager verifies completed status and rating

### UC2: Tenant Cancellation
1. Tenant creates request (Electrical, Medium)
2. Tenant cancels the request
3. Both tenant and manager see Cancelled status

### UC3: Complex Lifecycle (Chat + Hold + Resume)
1. Tenant creates request (General, Low)
2. Manager assigns and sends chat message
3. Maintainer accepts → puts on hold → resumes → completes
4. Tenant rates 3 stars with comment
5. Manager verifies all status transitions, rating, and chat message

---

## 10. Pass Criteria

- [ ] All scenarios S01--S50 pass on at least one platform
- [ ] UC1, UC2, UC3 pass on all three platforms (Web, iOS, Android)
- [ ] Zero Red Screen / crash errors
- [ ] Zero console errors during normal operation
- [ ] Real-time sync latency < 500 ms
- [ ] `npm test` — all 234 unit tests pass
- [ ] `npm run test:rules` — all 65 security rule tests pass
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npm run lint` — zero ESLint errors
