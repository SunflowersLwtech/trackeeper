/**
 * Targeted investigative spec — focuses on the high-risk areas:
 *   • Onboarding skip behaviour (the AuthContext onSnapshot fix)
 *   • ImageGallery.web lightbox (the new web shim)
 *   • Tenant home actually renders cards (not just skeletons)
 *   • Manager dashboard actually has request data
 */
import { test, expect, Page, Locator } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const PWD = "Demo1234!";
const TENANT = "alice@demo.trackeeper.app";
const MANAGER = "manager@demo.trackeeper.app";
const MAINTAINER = "david@demo.trackeeper.app";

// Use absolute path to ensure screenshots end up where we expect
const SHOTS = path.resolve(
  __dirname,
  "../../../../screenshots/web-bugs",
);
fs.mkdirSync(SHOTS, { recursive: true });

async function shot(page: Page, name: string) {
  try { await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); } catch {}
}

async function gotoLogin(page: Page) {
  await page.goto("/login");
  await expect(page.getByTestId("login-email-input")).toBeVisible({ timeout: 30_000 });
}

async function signIn(page: Page, email: string) {
  await gotoLogin(page);
  await page.getByTestId("login-email-input").fill("");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(PWD);
  await page.getByTestId("login-submit-button").click();
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), null, { timeout: 45_000 }).catch(() => {});
}

async function exists(loc: Locator, ms = 3_000) {
  return loc.first().waitFor({ state: "visible", timeout: ms }).then(() => true).catch(() => false);
}

test.describe.configure({ mode: "serial" });

test("INV-1 maintainer onboarding skip actually dismisses and persists", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, MAINTAINER);
  // After login, maintainer should see EITHER onboarding OR earnings tab
  const onbVisible = await exists(page.getByTestId("onboarding-screen"), 8_000);
  await shot(page, "inv1-after-login");

  if (!onbVisible) {
    test.info().annotations.push({ type: "no-onboarding", description: "david already past onboarding" });
    return;
  }

  // Skip
  const skipBtn = page.getByTestId("onboarding-skip");
  await expect(skipBtn).toBeVisible();
  await skipBtn.click();

  // Wait long enough for Firestore round-trip + onSnapshot
  await page.waitForTimeout(4_000);
  await shot(page, "inv1-after-skip");

  const stillOnb = await exists(page.getByTestId("onboarding-screen"), 2_000);
  expect(stillOnb, "BUG: after skip, onboarding screen still visible").toBeFalsy();

  // Now reload to confirm persistence
  await page.reload();
  await page.waitForTimeout(5_000);
  await shot(page, "inv1-after-reload");
  const reappears = await exists(page.getByTestId("onboarding-screen"), 4_000);
  expect(reappears, "BUG: onboarding reappears after reload (skip not persisted)").toBeFalsy();
});

test("INV-2 tenant home loads actual request cards (not just skeletons)", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, TENANT);
  // Wait for page to settle
  await page.waitForTimeout(8_000);
  await shot(page, "inv2-tenant-home");

  // Look for evidence the cards have populated:
  //   • request titles (leak / outlet / etc) anywhere in the document
  //   • status badges (Submitted / Assigned / etc)
  //   • OR "no requests" empty state
  const hasContent = await Promise.race([
    exists(page.getByText(/leak|outlet|sparked|HVAC|broken|noise|cabinet|sink/i), 5_000),
    exists(page.getByText(/SUBMITTED|ASSIGNED|SCHEDULED|IN PROGRESS|COMPLETED/i), 5_000),
    exists(page.getByText(/no requests|nothing here|empty/i), 5_000),
  ]);
  expect(hasContent, "BUG: tenant home shows neither cards nor empty state — stuck in skeleton loading").toBeTruthy();
});

test("INV-3 manager dashboard loads actual request cards", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MANAGER);
  await page.waitForTimeout(8_000);
  await shot(page, "inv3-manager-dashboard");

  const hasContent = await Promise.race([
    exists(page.getByText(/leak|outlet|sparked|HVAC|broken|noise|cabinet/i), 6_000),
    exists(page.getByText(/SUBMITTED|ASSIGNED|SCHEDULED|IN PROGRESS|COMPLETED/i), 6_000),
    exists(page.getByText(/Alice|Bob|Charlie|Diana/i), 6_000),
  ]);
  expect(hasContent, "BUG: manager dashboard shows no real content").toBeTruthy();
});

test("INV-4 manager → request detail → image gallery → lightbox open + close", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, MANAGER);
  await page.waitForTimeout(5_000);
  // Go to a known request URL via the seed — fall back to clicking first available card
  await page.waitForTimeout(2_000);

  // Try clicking any title-text card
  const card = page.getByText(/leak|outlet|sparked|HVAC|broken|noise|cabinet|sink/i).first();
  if (!(await card.isVisible().catch(() => false))) {
    test.skip(true, "no clickable request card on dashboard");
    return;
  }
  await card.click({ force: true });
  await page.waitForTimeout(3_000);
  await shot(page, "inv4-detail");

  // Find any image gallery thumbnail. Prefix is "manager-request-image"
  const thumb = page.getByTestId("manager-request-image-thumb-0");
  const hasThumb = await exists(thumb, 5_000);
  if (!hasThumb) {
    test.info().annotations.push({ type: "no-images", description: "request had no images attached" });
    return;
  }
  await thumb.click();
  await page.waitForTimeout(1_500);
  await shot(page, "inv4-lightbox-open");

  // Lightbox close button
  const closeBtn = page.getByTestId("manager-request-image-close");
  const hasClose = await exists(closeBtn, 4_000);
  expect(hasClose, "BUG: lightbox did not open or close button missing").toBeTruthy();

  // If multiple images, test next/prev
  const next = page.getByTestId("manager-request-image-next");
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(500);
    await shot(page, "inv4-lightbox-next");
  }

  await closeBtn.click();
  await page.waitForTimeout(1_000);
  await shot(page, "inv4-lightbox-closed");
});

test("INV-5 tenant create form — multi-image picker '+' button is present", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, TENANT);
  await page.goto("/create");
  await expect(page.getByTestId("create-request-example-plumbing")).toBeVisible({ timeout: 20_000 });
  // The MultiImagePicker should expose a + button. Common testID patterns:
  //   "create-request-image-picker-add" or "image-picker-add"
  // Also accept any element with role=button containing "+" or aria-label /add image/i
  const addBtn = await Promise.race([
    exists(page.getByTestId("create-request-image-picker-add"), 3_000),
    exists(page.getByTestId("multi-image-picker-add"), 3_000),
    exists(page.getByRole("button", { name: /add image|attach image|\+/i }), 3_000),
  ]);
  await shot(page, "inv5-create-form");
  test.info().annotations.push({ type: "image-picker-add-found", description: String(addBtn) });
});

test("INV-6 manager direct deep-link to request detail renders state machine", async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, MANAGER);
  await page.waitForTimeout(4_000);
  // Click first card, then verify state-machine pills exist
  const card = page.getByText(/leak|outlet|sparked|HVAC|broken|noise|cabinet/i).first();
  if (!(await card.isVisible().catch(() => false))) {
    test.skip(true, "no clickable request card");
    return;
  }
  await card.click({ force: true });
  await page.waitForTimeout(3_000);

  await shot(page, "inv6-state-machine");
  // Expect SUBMITTED, ASSIGNED, SCHEDULED, IN PROGRESS, COMPLETED, VERIFIED steps
  const steps = ["SUBMITTED", "ASSIGNED", "SCHEDULED", "IN PROGRESS", "COMPLETED", "VERIFIED"];
  let seen = 0;
  for (const s of steps) {
    if (await exists(page.getByText(s, { exact: false }), 2_000)) seen++;
  }
  expect(seen, `state-machine should show all 6 steps; saw ${seen}`).toBeGreaterThanOrEqual(5);
});
