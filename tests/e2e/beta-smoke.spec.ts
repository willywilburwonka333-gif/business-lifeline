import { expect, test } from "@playwright/test";

test("public preview loads without exposing customer workspaces or advanced tools", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Business Lifeline/);
  await expect(page.getByRole("heading", { name: /Diagnose the pressure/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create a pilot account/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /Business Lifeline main areas/i })).toHaveCount(0);
  await expect(page.getByText(/fictional/i).first()).toBeVisible();
  await expect(page.getByTestId("beta-safety-launcher")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("registration CTA makes account access available, including on narrow mobile viewports", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Create a pilot account/i }).click();
  const panel = page.getByRole("region", { name: "Business Lifeline account" });
  await expect(panel).toBeVisible();
  if (await panel.getByText("Firebase configuration missing").isVisible()) {
    await expect(panel).toContainText("NEXT_PUBLIC_FIREBASE");
  } else {
    const actions = panel.getByRole("group", { name: "Choose account action" });
    await expect(actions.getByRole("button", { name: "Sign in" })).toBeVisible();
    await actions.getByRole("button", { name: "Create account" }).click();
    await expect(panel.getByRole("heading", { name: /Create your account/i })).toBeVisible();
    await expect(panel.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(panel.getByLabel("Password", { exact: true })).toBeVisible();
  }
});

test("public preview lists five services without creating a paid charge", async ({ page }) => {
  await page.goto("/");
  for (const offer of ["Lifeline Pulse", "Lifeline MRI", "Lifeline Deep Scan", "Lifeline Recovery Map", "Lifeline Intensive"]) {
    await expect(page.getByRole("heading", { name: offer, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /checkout|pay now|buy now/i })).toHaveCount(0);
});

test("visitor cannot access studio management or pilot entitlements without signing in", async ({ request }) => {
  const accounts = await request.get("/api/pilot/accounts");
  expect(accounts.status()).toBe(403);
  const access = await request.get("/api/pilot/access");
  expect([401, 503]).toContain(access.status());
  const createPilot = await request.post("/api/pilots", {
    data: { selfServe: true, businessName: "Test", clientName: "Test", serviceKey: "lifeline_pulse", paymentMethod: "stripe", confirmConsent: true },
  });
  expect([401, 403]).toContain(createPilot.status());
});

test("any visitor can interact with a fictional MRI demo without an account or real data input", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /See what your business numbers/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Family Table Cafe/i })).toHaveAttribute("aria-pressed","true");
  await expect(page.getByText("BUSINESS HEALTH INDICATOR")).toBeVisible();
  await expect(page.getByRole("button", { name: /Metro Projects Group/i })).toBeVisible();
  await page.getByRole("button", { name: /Metro Projects Group/i }).click();
  await expect(page.getByRole("heading", { name: "Metro Projects Group" })).toBeVisible();
  await page.getByRole("tab", { name: /Recover/i }).click();
  await expect(page.getByText("Next 30 days")).toBeVisible();
  await expect(page.getByRole("link", { name: /Message Dylan about my business/i })).toHaveAttribute("href",/mailto:businesslifelinesupport@gmail.com/);
  await expect(page.locator("input, textarea, form")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: /Business Lifeline main areas/i })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("public landing sends visitors to demo and demo is responsive on mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Try the interactive demo/i }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole("tab", { name: /Diagnose/i })).toBeVisible();
  const bounds = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.viewport + 2);
});
