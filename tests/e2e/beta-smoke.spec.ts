import { expect, test } from "@playwright/test";

test("public preview loads cleanly without exposing operating modules", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Business Lifeline/);
  await expect(page.getByRole("heading", { name: /Diagnose the pressure/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create a free pilot account/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: /Business Lifeline main areas/i })).toHaveCount(0);
  await expect(page.getByText(/fictional/i).first()).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("public register action opens the account creation panel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Create a free pilot account/i }).click();
  const panel = page.getByRole("region", { name: "Business Lifeline account" });
  await expect(panel).toBeVisible();
  // CI intentionally has no Firebase client configuration: verify a helpful
  // setup blocker there, and the real registration form when configured.
  if (await page.getByText("Firebase configuration missing").isVisible()) {
    await expect(panel).toContainText("NEXT_PUBLIC_FIREBASE");
  } else {
    await expect(page.getByRole("heading", { name: /Create your account/i })).toBeVisible();
    const actions = panel.getByRole("group", { name: "Choose account action" });
    const signInTab = actions.getByRole("button", { name: "Sign in" });
    await expect(signInTab).toBeVisible();
    await signInTab.click();
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Forgot password?" })).toBeVisible();
    await actions.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: /Create your account/i })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  }
});

test("public preview displays all five indicative service offers without checkout", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Lifeline Pulse", "Lifeline MRI", "Lifeline Deep Scan", "Lifeline Recovery Map", "Lifeline Intensive"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /buy|pay|checkout/i })).toHaveCount(0);
});
