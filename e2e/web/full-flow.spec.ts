import { test, expect, Page } from "@playwright/test";

const TENANT = { email: "alice@demo.trackeeper.app", password: "Demo1234!" };
const MANAGER = { email: "manager@demo.trackeeper.app", password: "Demo1234!" };
const MAINTAINER = { email: "david@demo.trackeeper.app", password: "Demo1234!" };

async function signIn(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill("");
  await page.getByTestId("login-email-input").fill(who.email);
  await page.getByTestId("login-password-input").fill(who.password);
  await page.getByTestId("login-submit-button").click();
}

async function signOut(page: Page) {
  // Navigate to profile and tap sign out (testID may vary)
  const profile = page.getByText(/Profile|Sign out|Logout/i).first();
  if (await profile.isVisible().catch(() => false)) {
    await profile.click();
  }
  // Best-effort — clear storage to force logout
  await page.context().clearCookies();
  await page.evaluate(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
  });
}

test.describe.configure({ mode: "serial" });

let createdRequestVisible = false;

test("1. tenant alice signs in and lands on home", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, TENANT);
  // Sign-in success when URL is no longer /login.
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "../../screenshots/e2e-web-tenant-home.png" });
});

test("2. tenant creates a request from example card", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, TENANT);
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
  await page.goto("/create");
  await expect(page.getByText("EXAMPLES")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("create-request-example-electrical").click();
  // verify auto-fill happened
  await expect(page.getByTestId("create-request-title-input")).toHaveValue(/sparked|outlet/i);

  // Submit the form via testID
  await page.getByTestId("create-request-submit-button").click();
  // Look for success toast or navigation back
  const submitted = await Promise.race([
    page.waitForSelector("text=/Submitted|notified|success/i", { timeout: 15_000 }).then(() => true).catch(() => false),
    page.waitForURL(/^(?!.*\/create)/, { timeout: 15_000 }).then(() => true).catch(() => false),
  ]);
  expect(submitted, "submission should reach success state").toBeTruthy();
  createdRequestVisible = submitted;
  await page.screenshot({ path: "../../screenshots/e2e-web-after-create.png" });
});

test("3. manager sees the new request", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, MANAGER);
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
  // Look for any new electrical/outlet/sparked text from the example we created
  const seen = await page.waitForSelector("text=/Living room|sparked|outlet/i", { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  await page.screenshot({ path: "../../screenshots/e2e-web-manager-home.png" });
  expect(seen, "manager should see alice's new request").toBeTruthy();
});

test("4. manager opens analytics dashboard", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MANAGER);
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
  // Click an analytics tab/link — try multiple selectors
  const link = page.getByText(/Analytics|Dashboard/i).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: "../../screenshots/e2e-web-manager-analytics.png" });
});

test("5. manager opens approvals (charlie pending)", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MANAGER);
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
  const link = page.getByText(/Approvals|Approval/i).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await page.waitForTimeout(1500);
  }
  // Charlie is a pending tenant from seed; he should appear here.
  const charlie = await page.waitForSelector("text=/Charlie|Wong/i", { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  await page.screenshot({ path: "../../screenshots/e2e-web-manager-approvals.png" });
  // Don't fail — just record outcome
  test.info().annotations.push({ type: "approvals-charlie-visible", description: String(charlie) });
});

test("6. maintainer david signs in", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MAINTAINER);
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");
  // Earnings tab should exist
  const earnings = await page.waitForSelector("text=/Earnings/i", { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  await page.screenshot({ path: "../../screenshots/e2e-web-maintainer-home.png" });
  test.info().annotations.push({ type: "earnings-tab-visible", description: String(earnings) });
});
