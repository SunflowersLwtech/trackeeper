import { test, expect, Page } from "@playwright/test";

const MANAGER_EMAIL = "manager@demo.trackeeper.app";
const PASSWORD = "Demo1234!";

async function clearBrowserState(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const dbs = await indexedDB.databases?.();
    await Promise.all(
      (dbs ?? [])
        .map((db) => db.name)
        .filter((name): name is string => Boolean(name))
        .map((name) => new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        })),
    );
  }).catch(() => {});
}

async function registerPendingTenant(page: Page, email: string) {
  await page.goto("/register");
  await expect(page.getByTestId("register-name-input")).toBeVisible({ timeout: 30_000 });

  await page.getByTestId("register-name-input").fill("Codex Tenant");
  await page.getByTestId("register-email-input").fill(email);
  await page.getByTestId("register-password-input").fill("Test123456");
  await page.getByTestId("register-unit-number-input").fill("A3305");
  await page.getByTestId("register-submit-button").click();

  const invalidFirestorePayload = page.getByText(/Function setDoc\(\) called with invalid/i);
  await expect(invalidFirestorePayload).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText(/pending|approval|awaiting/i).first()).toBeVisible({ timeout: 45_000 });
}

async function signInManager(page: Page) {
  await clearBrowserState(page);
  await page.goto("/login");
  await expect(page.getByTestId("login-email-input")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("login-email-input").fill(MANAGER_EMAIL);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 60_000 });
  const onboardingSkip = page.getByTestId("onboarding-skip");
  if (await onboardingSkip.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await onboardingSkip.click({ force: true });
    await expect(page.getByTestId("onboarding-screen")).toHaveCount(0, { timeout: 20_000 });
  }
}

test.describe.configure({ mode: "serial" });

test("tenant registration accepts blank optional phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chrome", "avoid creating duplicate accounts in every viewport project");

  const email = `codex-${Date.now()}@trackeeper.test`;

  await registerPendingTenant(page, email);
});

test("manager approves newly registered tenant without Firestore invalid data", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chrome", "avoid approving duplicate accounts in every viewport project");
  test.setTimeout(120_000);

  const email = `codex-approve-${Date.now()}@trackeeper.test`;

  await registerPendingTenant(page, email);
  await signInManager(page);
  await page.goto("/approvals");
  await expect(page.getByText(email)).toBeVisible({ timeout: 30_000 });

  const approveButton = page
    .getByText(email)
    .locator('xpath=ancestor::*[.//button[starts-with(@data-testid, "approve-tenant-")]][1]//button[starts-with(@data-testid, "approve-tenant-")]');
  await approveButton.click();

  await expect(page.getByText(/Function addDoc\(\) called with invalid|invalid data|Unsupported field value/i)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText(/Approved/i).first()).toBeVisible({ timeout: 30_000 });
});
