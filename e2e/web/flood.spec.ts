import { test, expect, Page, TestInfo } from "@playwright/test";

const PASSWORD = "Demo1234!";
const TENANT_EMAIL = "alice@demo.trackeeper.app";
const MANAGER_EMAIL = "manager@demo.trackeeper.app";
const FARAH_EMAIL = "farah@demo.trackeeper.app";
const RUN_ID = Date.now().toString(36);

const FATAL_UI = /Function .*called with invalid|invalid data|Unsupported field value|Cannot read properties|Unhandled|Schedule failed|Registration failed/i;
let sharedFloodTitle = `[FLOOD ${RUN_ID}] Schedule appointment`;

function titleForProject(testInfo: TestInfo): string {
  const projectSlug = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `[FLOOD ${RUN_ID} ${projectSlug}] Schedule appointment`;
}

function localDateTimeValue(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
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

function watchPage(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function openRequestBySearch(page: Page, query: string): Promise<void> {
  await expect(page.getByTestId("filter-search-input")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("filter-search-input").fill(query);
  const cards = page.locator('[data-testid^="request-card-"]').filter({ hasText: new RegExp(escapeRegExp(query), "i") });
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  await cards.first().click();
}

async function createTenantRequest(page: Page, title: string) {
  await signIn(page, TENANT_EMAIL);
  await page.goto("/create");
  await expect(page.getByTestId("create-request-example-plumbing")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("create-request-example-plumbing").click();
  await page.getByTestId("create-request-title-input").fill(title);
  await page.getByTestId("create-request-description-input").fill(
    "Flooding E2E coverage for schedule appointment UI and button interactions.",
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
  await page.getByTestId("assign-eta-input").fill("Today 3PM");
  await page.getByTestId("confirm-assignment-button").click();
  await expect(page.getByTestId("manager-schedule-button")).toBeVisible({ timeout: 30_000 });
}

async function setDateTimeAndConfirm(page: Page, pickerTestId: string, hoursFromNow: number) {
  const input = page.locator(`[data-testid="${pickerTestId}-input"]`);
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.fill(localDateTimeValue(hoursFromNow));
  await page.getByTestId(`${pickerTestId}-confirm`).click();
}

async function cancelIfPresent(page: Page) {
  await page.keyboard.press("Escape").catch(() => {});
  await dismissOnboardingIfPresent(page);
  const cancel = page.getByTestId("confirm-modal-cancel");
  if (await cancel.isVisible().catch(() => false)) {
    await cancel.click({ timeout: 1_000, force: true }).catch(() => {});
  }
  const scheduleCancel = page.locator('[data-testid$="-picker-cancel"]');
  if ((await scheduleCancel.count()) > 0 && await scheduleCancel.first().isVisible().catch(() => false)) {
    await scheduleCancel.first().click({ timeout: 1_000, force: true }).catch(() => {});
  }
}

async function dismissOnboardingIfPresent(page: Page) {
  const skipOnboarding = page.getByTestId("onboarding-skip");
  if (await skipOnboarding.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipOnboarding.click({ timeout: 5_000, force: true }).catch(() => {});
    await expect(page.getByTestId("onboarding-screen")).toHaveCount(0, { timeout: 20_000 });
  }
}

async function floodVisibleButtons(page: Page, label: string, maxClicks = 18) {
  const seen = new Set<string>();
  for (let pass = 0; pass < 2 && seen.size < maxClicks; pass += 1) {
    const buttons = page.getByRole("button");
    const count = await buttons.count();
    for (let i = 0; i < count && seen.size < maxClicks; i += 1) {
      const button = buttons.nth(i);
      if (!await button.isVisible().catch(() => false)) continue;
      const name =
        (await button.getAttribute("aria-label").catch(() => null)) ??
        (await button.innerText().catch(() => "")) ??
        `${label} button ${i}`;
      const normalized = name.replace(/\s+/g, " ").trim();
      if (!normalized || seen.has(normalized)) continue;
      if (/sign out|pay maintainer|refund payment|confirm assignment|submit request|resend verification email|open notifications|mark all as read|suspend|activate|deactivate|delete|remove|approve|reject/i.test(normalized)) continue;
      seen.add(normalized);
      const beforeUrl = page.url();
      await button.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(350);
      await cancelIfPresent(page);
      if (page.url() !== beforeUrl && !/login/.test(page.url())) {
        await page.goBack().catch(() => {});
        await page.waitForTimeout(350);
      }
    }
  }
  test.info().annotations.push({ type: `${label}-buttons-clicked`, description: String(seen.size) });
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  (page as Page & { __floodErrors?: string[] }).__floodErrors = watchPage(page);
});

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) {
    await expectNoFatalSurface(page, (page as Page & { __floodErrors?: string[] }).__floodErrors ?? []);
  }
});

test("manager schedule appointment survives cancel, confirm, and reschedule", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  sharedFloodTitle = titleForProject(testInfo);
  const tenantPage = await browser.newPage();
  const tenantErrors = watchPage(tenantPage);
  await createTenantRequest(tenantPage, sharedFloodTitle);
  await expectNoFatalSurface(tenantPage, tenantErrors);
  await tenantPage.close();

  const page = await browser.newPage();
  const managerErrors = watchPage(page);
  await signIn(page, MANAGER_EMAIL);
  await openRequestBySearch(page, sharedFloodTitle);
  await assignCurrentRequestToFarah(page);

  const schedule = page.getByTestId("manager-schedule-button");
  await expect(schedule).toBeVisible({ timeout: 30_000 });

  await schedule.click();
  await expect(page.getByTestId("manager-schedule-picker")).toBeVisible();
  await page.getByTestId("manager-schedule-picker-cancel").click();
  await expect(page.getByTestId("manager-schedule-picker")).toHaveCount(0);

  await schedule.click();
  await setDateTimeAndConfirm(page, "manager-schedule-picker", 3);
  await expect(page.getByTestId("scheduled-banner")).toBeVisible({ timeout: 30_000 });

  await page.getByTestId("manager-schedule-button").click();
  await setDateTimeAndConfirm(page, "manager-schedule-picker", 5);
  await expect(page.getByTestId("scheduled-banner")).toBeVisible({ timeout: 30_000 });
  await expectNoFatalSurface(page, managerErrors);
  await page.close();
});

test("maintainer schedule and ETA pickers survive repeated interaction", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  sharedFloodTitle = titleForProject(testInfo);
  await signIn(page, FARAH_EMAIL);
  await openRequestBySearch(page, sharedFloodTitle);

  await expect(page.getByTestId("maintainer-schedule-button")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("maintainer-schedule-button").click();
  await setDateTimeAndConfirm(page, "maintainer-schedule-picker", 6);
  await expect(page.getByTestId("maintainer-scheduled-banner")).toBeVisible({ timeout: 30_000 });

  const etaSpecific = page.getByTestId("maintainer-eta-specific-button");
  if (await etaSpecific.isVisible().catch(() => false)) {
    await etaSpecific.click();
    await setDateTimeAndConfirm(page, "maintainer-eta-specific-picker", 7);
  }

  const etaWindow = page.getByTestId("maintainer-eta-window-button");
  if (await etaWindow.isVisible().catch(() => false)) {
    await etaWindow.click();
    await setDateTimeAndConfirm(page, "maintainer-eta-window-start-picker", 8);
    await setDateTimeAndConfirm(page, "maintainer-eta-window-end-picker", 9);
  }
});

test("role surfaces tolerate broad button flooding", async ({ browser }) => {
  test.setTimeout(300_000);

  const tenantPage = await browser.newPage();
  const tenantErrors = watchPage(tenantPage);
  await signIn(tenantPage, TENANT_EMAIL);
  await floodVisibleButtons(tenantPage, "tenant-home");
  await tenantPage.goto("/create");
  await expect(tenantPage.getByTestId("create-request-title-input")).toBeVisible({ timeout: 30_000 });
  await floodVisibleButtons(tenantPage, "tenant-create", 24);
  await expectNoFatalSurface(tenantPage, tenantErrors);
  await tenantPage.close();

  const managerPage = await browser.newPage();
  const managerErrors = watchPage(managerPage);
  await signIn(managerPage, MANAGER_EMAIL);
  await floodVisibleButtons(managerPage, "manager-home");
  for (const route of ["/analytics", "/approvals", "/users", "/payments", "/profile"]) {
    await managerPage.goto(route);
    await managerPage.waitForTimeout(1_000);
    await floodVisibleButtons(managerPage, `manager-${route.replace("/", "") || "home"}`);
  }
  await expectNoFatalSurface(managerPage, managerErrors);
  await managerPage.close();

  const maintainerPage = await browser.newPage();
  const maintainerErrors = watchPage(maintainerPage);
  await signIn(maintainerPage, FARAH_EMAIL);
  await floodVisibleButtons(maintainerPage, "maintainer-home");
  for (const route of ["/earnings", "/profile"]) {
    await maintainerPage.goto(route);
    await maintainerPage.waitForTimeout(1_000);
    await floodVisibleButtons(maintainerPage, `maintainer-${route.replace("/", "")}`);
  }
  await expectNoFatalSurface(maintainerPage, maintainerErrors);
  await maintainerPage.close();
});
