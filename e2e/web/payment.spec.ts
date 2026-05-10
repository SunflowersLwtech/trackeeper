import { test, expect, Browser, Page, TestInfo, devices } from "@playwright/test";

const PASSWORD = "Demo1234!";
const TENANT_EMAIL = "alice@demo.trackeeper.app";
const MANAGER_EMAIL = "manager@demo.trackeeper.app";
const FARAH_EMAIL = "farah@demo.trackeeper.app";
const RUN_ID = Date.now().toString(36);
const SETTLEMENT_AMOUNT = "200.00";

const FATAL_UI =
  /Function .*called with invalid|invalid data|Unsupported field value|Cannot read properties|Unhandled|Payment failed|Cannot pay/i;

function contextOptionsForProject(testInfo: TestInfo) {
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8083";
  if (testInfo.project.name === "iPhone 14 (mobile-web)") {
    return { ...devices["iPhone 14"], baseURL };
  }
  if (testInfo.project.name === "Pixel 7 (mobile-web)") {
    return { ...devices["Pixel 7"], baseURL };
  }
  return { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL };
}

function titleForProject(testInfo: TestInfo): string {
  const projectSlug = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `[PAY ${RUN_ID} ${projectSlug}] Salary settlement`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function watchPage(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

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

async function dismissOnboardingIfPresent(page: Page) {
  const skipOnboarding = page.getByTestId("onboarding-skip");
  if (await skipOnboarding.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipOnboarding.click({ timeout: 5_000, force: true }).catch(() => {});
    await expect(page.getByTestId("onboarding-screen")).toHaveCount(0, { timeout: 20_000 });
  }
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await clearBrowserState(page);
  await page.goto("/login");
  await expect(page.getByTestId("login-email-input")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(PASSWORD);
  await page.getByTestId("login-submit-button").click();
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 60_000 });
  await dismissOnboardingIfPresent(page);
}

async function expectNoFatalSurface(page: Page, errors: string[]) {
  const fatalErrors = errors.filter((msg) => FATAL_UI.test(msg));
  expect(fatalErrors, "browser console/page errors").toEqual([]);
  await expect(page.getByText(FATAL_UI)).toHaveCount(0);
}

async function withFreshPage(browser: Browser, testInfo: TestInfo, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext(contextOptionsForProject(testInfo));
  const page = await context.newPage();
  const errors = watchPage(page);
  try {
    await run(page);
    await expectNoFatalSurface(page, errors);
  } finally {
    await context.close();
  }
}

async function openRequestBySearch(page: Page, query: string): Promise<void> {
  let searchInput = page.getByTestId("filter-search-input");
  if (!await searchInput.isVisible({ timeout: 30_000 }).catch(() => false)) {
    searchInput = page
      .getByPlaceholder(/Search requests|Search/i)
      .or(page.getByRole("searchbox", { name: /Search/i }))
      .first();
  }
  await expect(searchInput).toBeVisible({ timeout: 30_000 });
  await searchInput.fill(query);
  const cards = page
    .locator('[data-testid^="request-card-"]')
    .filter({ hasText: new RegExp(escapeRegExp(query), "i") });
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  await cards.first().click();
}

function paymentDeskRow(page: Page, title: string) {
  return page
    .locator('[data-testid^="payments-row-"]')
    .filter({ hasText: new RegExp(escapeRegExp(title), "i") })
    .first();
}

async function openPaymentDesk(page: Page, title: string) {
  await page.goto("/payments");
  await expect(page.getByTestId("manager-payments-screen")).toBeVisible({ timeout: 30_000 });
  const row = paymentDeskRow(page, title);
  await expect(row).toBeVisible({ timeout: 45_000 });
  return row;
}

async function openPaidRequestFromPaymentDesk(page: Page, title: string) {
  const row = await openPaymentDesk(page, title);
  await expect(row).toContainText(/Paid/i, { timeout: 30_000 });
  await row.locator('[data-testid^="payments-open-button-"]').click();
  await expect(page.getByTestId("manager-refund-button")).toBeVisible({ timeout: 30_000 });
}

async function createTenantRequest(page: Page, title: string) {
  await signIn(page, TENANT_EMAIL);
  await page.goto("/create");
  await expect(page.getByTestId("create-request-example-plumbing")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("create-request-example-plumbing").click();
  await page.getByTestId("create-request-title-input").fill(title);
  await page.getByTestId("create-request-description-input").fill(
    "Controlled E2E coverage for maintainer salary settlement, pending payment, payout confirmation, and refund.",
  );
  await page.getByTestId("create-request-submit-button").click();
  await Promise.race([
    page.waitForURL((url) => !url.toString().includes("/create"), { timeout: 30_000 }),
    page.getByText(/Submitted|success|notified/i).waitFor({ state: "visible", timeout: 30_000 }),
  ]);
}

async function assignCurrentRequestToFarah(page: Page) {
  await expect(page.getByTestId("assign-request-button")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("assign-request-button").click();
  const farah = page.getByRole("button", { name: "Select Farah Aziz" });
  await expect(farah).toBeVisible({ timeout: 30_000 });
  await farah.click();
  await page.getByTestId("assign-eta-input").fill("Today 4PM");
  await page.getByTestId("confirm-assignment-button").click();
  await expect(page.getByText(/Assigned/i).first()).toBeVisible({ timeout: 30_000 });
}

async function maintainerCompletesRequest(page: Page, title: string) {
  await signIn(page, FARAH_EMAIL);
  await openRequestBySearch(page, title);

  await expect(page.getByTestId("accept-task-button")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("accept-task-button").click();
  await expect(page.getByTestId("confirm-modal-confirm")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("confirm-modal-confirm").click();

  await expect(page.getByTestId("mark-complete-button")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("mark-complete-button").click();
  await expect(page.getByTestId("confirm-modal-confirm")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("confirm-modal-confirm").click();

  await expect(page.getByText(/Completed/i).first()).toBeVisible({ timeout: 30_000 });
}

async function managerSetsCost(page: Page, title: string) {
  await signIn(page, MANAGER_EMAIL);
  await openRequestBySearch(page, title);

  await expect(page.getByTestId("cost-labor-hours")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("cost-labor-hours").fill("2");
  await page.getByTestId("cost-hourly-rate").fill("80");
  await page.getByTestId("cost-material").fill("40");
  await page.getByTestId("cost-save-button").click();
  await expect(page.getByText(/Cost saved/i).first()).toBeVisible({ timeout: 30_000 });

  const row = await openPaymentDesk(page, title);
  await expect(row).toContainText(/Unpaid/i, { timeout: 30_000 });
  await expect(row).toContainText(`RM ${SETTLEMENT_AMOUNT}`, { timeout: 30_000 });
}

async function managerMarksPaymentPending(page: Page, title: string) {
  const row = await openPaymentDesk(page, title);
  await row.locator('[data-testid^="payments-pay-button-"]').click();
  await expect(page.getByTestId("payment-dialog")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("payment-method-bank_transfer").click();
  await page.getByTestId("payment-mode-pending").click();
  await page.getByTestId("payment-pay-button").click();
  await expect(page.getByTestId("payment-dialog").getByText(/Marked Pending/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("payment-dialog")).toHaveCount(0, { timeout: 10_000 });
  const pendingRow = paymentDeskRow(page, title);
  await expect(pendingRow).toContainText(/Pending/i, { timeout: 30_000 });
  await expect(pendingRow.locator('[data-testid^="payments-pay-button-"]')).toContainText(/Confirm payment/i, { timeout: 30_000 });
}

async function managerConfirmsPayment(page: Page, title: string) {
  const row = await openPaymentDesk(page, title);
  await row.locator('[data-testid^="payments-pay-button-"]').click();
  await expect(page.getByTestId("payment-dialog")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("payment-confirm-pending")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("payment-confirm-pending").click();
  await expect(page.getByTestId("payment-dialog").getByText(/Payment Sent/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("payment-dialog")).toHaveCount(0, { timeout: 10_000 });
  const paidRow = paymentDeskRow(page, title);
  await expect(paidRow).toContainText(/Paid/i, { timeout: 30_000 });
  await expect(paidRow).toContainText(/Ref TKP-/i, { timeout: 30_000 });
}

async function managerRefundsPayment(page: Page) {
  await page.getByTestId("manager-refund-button").click();
  await expect(page.getByTestId("refund-confirm-input")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("refund-confirm-input").fill("Controlled E2E refund");
  await page.getByTestId("refund-confirm-submit").click();
  await expect(page.getByTestId("refund-confirm-input")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText(/Refunded/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Controlled E2E refund/i)).toBeVisible({ timeout: 30_000 });
}

async function expectMaintainerEarnings(page: Page, title: string, expectedState: "paid" | "refunded") {
  await signIn(page, FARAH_EMAIL);
  await page.goto("/earnings");
  await expect(page.getByText(title)).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText(`RM ${SETTLEMENT_AMOUNT}`).first()).toBeVisible({ timeout: 30_000 });
  if (expectedState === "paid") {
    await expect(page.getByText(/PAID/i).first()).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(page.getByTestId("earnings-refunded-line")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/REFUNDED/i).first()).toBeVisible({ timeout: 30_000 });
  }
}

test("manager settlement covers pending, paid, refund, and maintainer earnings", async ({ browser }, testInfo) => {
  test.setTimeout(240_000);
  const title = titleForProject(testInfo);

  await withFreshPage(browser, testInfo, (page) => createTenantRequest(page, title));

  await withFreshPage(browser, testInfo, async (page) => {
    await signIn(page, MANAGER_EMAIL);
    await openRequestBySearch(page, title);
    await assignCurrentRequestToFarah(page);
  });

  await withFreshPage(browser, testInfo, (page) => maintainerCompletesRequest(page, title));

  await withFreshPage(browser, testInfo, async (page) => {
    await managerSetsCost(page, title);
    await managerMarksPaymentPending(page, title);
    await managerConfirmsPayment(page, title);
  });

  await withFreshPage(browser, testInfo, (page) => expectMaintainerEarnings(page, title, "paid"));

  await withFreshPage(browser, testInfo, async (page) => {
    await signIn(page, MANAGER_EMAIL);
    await openPaidRequestFromPaymentDesk(page, title);
    await managerRefundsPayment(page);
  });

  await withFreshPage(browser, testInfo, (page) => expectMaintainerEarnings(page, title, "refunded"));
});
