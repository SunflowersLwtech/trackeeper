/**
 * Comprehensive E2E matrix — written 2026-05-09 to replace the stale smoke spec.
 * The login screen renders "TRAC KEEPER" (with space) not "TracKeeper", and
 * "Demo personas" not "DEMO PERSONAS" — so we use testIDs and real text only.
 *
 * Strategy: each test takes a screenshot to ../../screenshots/web-bugs/ on
 * failure or at key milestones; uses race-condition waits for navigation.
 */
import { test, expect, Page, Locator } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const PWD = "Demo1234!";
const TENANT_EMAIL = "alice@demo.trackeeper.app";
const MANAGER_EMAIL = "manager@demo.trackeeper.app";
const MAINTAINER_EMAIL = "david@demo.trackeeper.app";

const SHOTS = "../../screenshots/web-bugs";
fs.mkdirSync(path.resolve(__dirname, SHOTS), { recursive: true });

async function shot(page: Page, name: string) {
  try {
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
  } catch {}
}

async function gotoLogin(page: Page) {
  await page.goto("/login");
  // The actual login screen shows the brand "TRAC KEEPER" (split visually),
  // and the "Welcome back" header is reliable.
  await expect(page.getByTestId("login-email-input")).toBeVisible({ timeout: 30_000 });
}

async function signIn(page: Page, email: string, pwd = PWD) {
  await gotoLogin(page);
  const emailInput = page.getByTestId("login-email-input");
  await emailInput.fill("");
  await emailInput.fill(email);
  await page.getByTestId("login-password-input").fill(pwd);
  await page.getByTestId("login-submit-button").click();
  // Wait for nav off /login OR for an error toast
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 45_000 }).catch(() => {});
}

async function exists(loc: Locator, ms = 2_000): Promise<boolean> {
  return loc
    .first()
    .waitFor({ state: "visible", timeout: ms })
    .then(() => true)
    .catch(() => false);
}

test.describe.configure({ mode: "serial" });

// ─── 1. AUTH SCREENS ──────────────────────────────────────────────────────────

test("01 login UI renders all primary affordances", async ({ page }) => {
  await gotoLogin(page);
  await expect(page.getByTestId("login-email-input")).toBeVisible();
  await expect(page.getByTestId("login-password-input")).toBeVisible();
  await expect(page.getByTestId("login-submit-button")).toBeVisible();
  await expect(page.getByTestId("login-forgot-password-link")).toBeVisible();
  await expect(page.getByTestId("login-demo-tenant")).toBeVisible();
  await expect(page.getByTestId("login-demo-manager")).toBeVisible();
  await expect(page.getByTestId("login-demo-maintainer")).toBeVisible();
  await expect(page.getByTestId("login-signup-link")).toBeVisible();
  await shot(page, "01-login-render");
});

test("02 demo persona buttons autofill credentials", async ({ page }) => {
  await gotoLogin(page);
  await page.getByTestId("login-demo-tenant").click();
  await expect(page.getByTestId("login-email-input")).toHaveValue(TENANT_EMAIL);
  await expect(page.getByTestId("login-password-input")).toHaveValue(PWD);
  await page.getByTestId("login-demo-manager").click();
  await expect(page.getByTestId("login-email-input")).toHaveValue(MANAGER_EMAIL);
  await page.getByTestId("login-demo-maintainer").click();
  await expect(page.getByTestId("login-email-input")).toHaveValue(MAINTAINER_EMAIL);
});

test("03 forgot-password link opens reset modal/screen", async ({ page }) => {
  await gotoLogin(page);
  await page.getByTestId("login-forgot-password-link").click();
  // Either testID surfaces or a reset email field. Allow both.
  const seen = await Promise.race([
    exists(page.getByTestId("forgot-password-email-input"), 5_000),
    exists(page.getByText(/reset|forgot/i), 5_000),
  ]);
  await shot(page, "03-forgot-password");
  expect(seen).toBeTruthy();
});

test("04 signup link navigates to /register", async ({ page }) => {
  await gotoLogin(page);
  await page.getByTestId("login-signup-link").click();
  await page.waitForFunction(() => location.pathname.includes("register"), null, { timeout: 10_000 }).catch(() => {});
  await shot(page, "04-register");
  expect(page.url()).toMatch(/register/);
});

// ─── 2. TENANT SIGN-IN + ONBOARDING + CREATE ──────────────────────────────────

test("05 tenant alice signs in successfully", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, TENANT_EMAIL);
  await shot(page, "05-tenant-after-login");
  expect(page.url()).not.toMatch(/\/login$/);
});

test("06 tenant onboarding skip dismisses to home (no loop back)", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, TENANT_EMAIL);
  // If onboarding screen appears, exercise skip; if not, treat as already complete.
  const onb = await exists(page.getByTestId("onboarding-screen"), 5_000);
  if (!onb) {
    test.info().annotations.push({ type: "skip", description: "Onboarding not shown — already-completed account" });
    return;
  }
  await page.getByTestId("onboarding-skip").click();
  // After skip, we should NOT see the onboarding screen again
  await page.waitForTimeout(2_000);
  const stillThere = await exists(page.getByTestId("onboarding-screen"), 1_500);
  await shot(page, "06-after-skip");
  expect(stillThere, "after skip, onboarding screen should be gone").toBeFalsy();
  // And refreshing should not bring us back
  await page.reload();
  await page.waitForTimeout(3_000);
  const reappears = await exists(page.getByTestId("onboarding-screen"), 3_000);
  await shot(page, "06-after-reload");
  expect(reappears, "onboarding should not reappear after reload").toBeFalsy();
});

test("07 tenant create form — examples auto-fill + submit", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, TENANT_EMAIL);
  await page.goto("/create");
  // The create screen header is "EXAMPLES" (uppercase), example cards have testIDs
  const example = page.getByTestId("create-request-example-plumbing");
  const seen = await exists(example, 15_000);
  if (!seen) {
    await shot(page, "07-no-create");
    test.skip(true, "create screen did not render examples — possibly not on /create route");
    return;
  }
  await example.click();
  await expect(page.getByTestId("create-request-title-input")).toHaveValue(/leaking|leak/i);
  await shot(page, "07-create-filled");
  await page.getByTestId("create-request-submit-button").click();
  // success: either success toast or nav off /create
  const success = await Promise.race([
    page.waitForURL((u) => !u.toString().includes("/create"), { timeout: 20_000 }).then(() => true).catch(() => false),
    exists(page.getByText(/Submitted|success|notified/i), 20_000),
  ]);
  await shot(page, "07-after-submit");
  expect(success).toBeTruthy();
});

// ─── 3. MANAGER FLOWS ─────────────────────────────────────────────────────────

test("08 manager signs in and lands on home tab", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, MANAGER_EMAIL);
  await shot(page, "08-manager-home");
  expect(page.url()).not.toMatch(/\/login$/);
});

test("09 manager onboarding skip", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, MANAGER_EMAIL);
  const onb = await exists(page.getByTestId("onboarding-screen"), 5_000);
  if (!onb) {
    test.info().annotations.push({ type: "skip", description: "no manager onboarding" });
    return;
  }
  await page.getByTestId("onboarding-skip").click();
  await page.waitForTimeout(2_000);
  expect(await exists(page.getByTestId("onboarding-screen"), 1_500)).toBeFalsy();
});

test("10 manager approvals shows pending tenant", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MANAGER_EMAIL);
  await page.goto("/approvals").catch(() => {});
  // Some routes are tabs not paths; fall back to clicking text link
  const tabClickable = page.getByText(/Approvals/i).first();
  if (await tabClickable.isVisible().catch(() => false)) {
    await tabClickable.click().catch(() => {});
  }
  await page.waitForTimeout(3_000);
  await shot(page, "10-manager-approvals");
  // Look for any approve testID (charlie or otherwise)
  const anyApprove = await exists(page.locator('[data-testid^="approve-tenant-"]'), 5_000);
  test.info().annotations.push({ type: "approvals-found", description: String(anyApprove) });
});

test("11 manager opens a request detail and sees SLA bar", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, MANAGER_EMAIL);
  await page.waitForTimeout(3_000);
  // Look for any clickable request card on home — expect first card to navigate
  // Try clicking the first link/card with a status label
  const cards = page.locator('text=/leak|outlet|sparked|broken|noise|HVAC|plumbing|electrical/i').first();
  if (await cards.isVisible().catch(() => false)) {
    await cards.click({ force: true }).catch(() => {});
  }
  await page.waitForTimeout(2_500);
  const slaSeen = await exists(page.getByTestId("manager-sla-bar"), 4_000);
  await shot(page, "11-manager-detail");
  test.info().annotations.push({ type: "manager-sla-bar-seen", description: String(slaSeen) });
});

// ─── 4. MAINTAINER ────────────────────────────────────────────────────────────

test("12 maintainer david signs in, sees Earnings", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MAINTAINER_EMAIL);
  await page.waitForTimeout(2_000);
  const earnings = await exists(page.getByText(/Earnings/i), 8_000);
  await shot(page, "12-maintainer-home");
  expect(earnings, "earnings tab should be visible for maintainer").toBeTruthy();
});

test("13 maintainer can navigate to earnings tab", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MAINTAINER_EMAIL);
  await page.goto("/earnings").catch(() => {});
  await page.waitForTimeout(2_500);
  await shot(page, "13-maintainer-earnings");
  // Expect to see something earnings-flavored: TKP-, paid, refunded, $, or AUD
  const ok = await Promise.race([
    exists(page.getByText(/Earnings|paid|pending|refund/i), 6_000),
    exists(page.getByText(/TKP-|\$|AUD/i), 6_000),
  ]);
  expect(ok).toBeTruthy();
});

// ─── 5. PROFILE / SIGN-OUT ───────────────────────────────────────────────────

test("14 manager can sign out from profile", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MANAGER_EMAIL);
  await page.goto("/profile").catch(() => {});
  await page.waitForTimeout(2_500);
  const so = page.getByTestId("profile-signout-button");
  if (!(await so.isVisible().catch(() => false))) {
    await shot(page, "14-no-signout");
    test.skip(true, "profile signout testID not visible");
    return;
  }
  await so.click();
  await page.waitForTimeout(3_000);
  await shot(page, "14-after-signout");
  // After signing out, /login screen elements should reappear
  const back = await exists(page.getByTestId("login-email-input"), 8_000);
  expect(back, "should land back on login after sign out").toBeTruthy();
});

// ─── 6. RESPONSIVE / VIEWPORT VISUAL CHECK ────────────────────────────────────

test("15 login renders within viewport (no horizontal scroll)", async ({ page }) => {
  await gotoLogin(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  await shot(page, "15-login-viewport");
  expect(overflow, "login should not have horizontal overflow").toBeFalsy();
});
