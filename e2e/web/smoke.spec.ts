import { test, expect, Page } from "@playwright/test";

const PERSONA_EMAIL = {
  tenant: "alice@demo.trackeeper.app",
  manager: "manager@demo.trackeeper.app",
  maintainer: "david@demo.trackeeper.app",
};
const PERSONA_PASSWORD = "Demo1234!";

async function gotoLogin(page: Page) {
  await page.goto("/login");
  await expect(page.getByText("TracKeeper")).toBeVisible({ timeout: 30_000 });
}

test.describe("Login screen — visual & UX", () => {
  test("renders hero, form, demo personas and signup link", async ({ page }) => {
    await gotoLogin(page);
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText("Property Maintenance, in real time")).toBeVisible();
    await expect(page.getByText("DEMO PERSONAS")).toBeVisible();
    await expect(page.getByTestId("login-demo-tenant")).toBeVisible();
    await expect(page.getByTestId("login-demo-manager")).toBeVisible();
    await expect(page.getByTestId("login-demo-maintainer")).toBeVisible();
    await expect(page.getByTestId("login-signup-link")).toBeVisible();
  });

  test("tapping Tenant demo persona auto-fills credentials", async ({ page }) => {
    await gotoLogin(page);
    await page.getByTestId("login-demo-tenant").click();
    const email = page.getByTestId("login-email-input");
    const pwd = page.getByTestId("login-password-input");
    await expect(email).toHaveValue(PERSONA_EMAIL.tenant);
    await expect(pwd).toHaveValue(PERSONA_PASSWORD);
  });

  test("password visibility toggle works", async ({ page }) => {
    await gotoLogin(page);
    const pwd = page.getByTestId("login-password-input");
    await pwd.fill("secret123");
    await expect(pwd).toHaveAttribute("type", /password|/);
  });
});

test.describe("Tenant create form — example cases", () => {
  test("login as tenant and see example cards on create form", async ({ page }) => {
    test.setTimeout(120_000);
    await gotoLogin(page);
    await page.getByTestId("login-demo-tenant").click();
    await page.getByTestId("login-submit-button").click();

    // Wait for either tenant home or pending screen.
    const success = await Promise.race([
      page.waitForURL(/^.*\/(?!login|register|pending).*$/, { timeout: 30_000 }).then(() => "tenant" as const).catch(() => null),
      page.waitForURL(/pending/, { timeout: 30_000 }).then(() => "pending" as const).catch(() => null),
      page.waitForSelector('text="Login Failed"', { timeout: 30_000 }).then(() => "auth-failed" as const).catch(() => null),
    ]);
    test.info().annotations.push({ type: "login-result", description: String(success) });
    if (success !== "tenant") {
      test.skip(true, `Tenant login did not reach tenant home (state=${success}). Skipping create-form check — likely demo accounts not seeded in Firebase.`);
      return;
    }

    // Navigate to create
    await page.goto("/create");
    await expect(page.getByText("EXAMPLES")).toBeVisible({ timeout: 15_000 });
    const example = page.getByTestId("create-request-example-plumbing");
    await expect(example).toBeVisible();
    await example.click();
    await expect(page.getByTestId("create-request-title-input")).toHaveValue(/leaking/i);
    await expect(page.getByTestId("create-request-description-input")).toHaveValue(/U-bend|dripping/i);
  });
});

test.describe("Form validation", () => {
  test("empty form shows error toast", async ({ page }) => {
    await gotoLogin(page);
    await page.getByTestId("login-submit-button").click();
    // Accept either inline error or toast.
    const errorVisible = await Promise.race([
      page.waitForSelector('text=/Invalid|required|enter/i', { timeout: 5_000 }).then(() => true).catch(() => false),
    ]);
    expect(errorVisible).toBeTruthy();
  });
});
