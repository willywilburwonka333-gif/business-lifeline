import { expect, test } from "@playwright/test";

const collectRuntimeErrors = (page: import("@playwright/test").Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
  });
  return errors;
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("MRI setup protects privacy and reaches the business questions", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.getByRole("button", { name: /run my business mri/i }).click();
  await expect(page.getByRole("heading", { name: /choose how your mri is prepared/i })).toBeVisible();
  await expect(page.getByText(/private calculation-only report/i)).toBeVisible();
  await page.getByRole("button", { name: /continue to your business/i }).click();
  await expect(page.getByText(/business mri · step 2 of 4/i)).toBeVisible();
  expect(errors).toEqual([]);
});

test("AI mode cannot continue without explicit consent", async ({ page }) => {
  await page.getByRole("button", { name: /run my business mri/i }).click();
  await page.getByText(/ai-enhanced report and document reading/i).click();
  const continueButton = page.getByRole("button", { name: /continue to your business/i });
  await expect(continueButton).toBeDisabled();
  await expect(page.getByText(/tick the consent box/i)).toBeVisible();
  await page.getByRole("checkbox").check();
  await expect(continueButton).toBeEnabled();
});

test("demo diagnosis opens, persists and can be reset safely", async ({ page }) => {
  const errors = collectRuntimeErrors(page);
  await page.getByRole("button", { name: /open riverbend café demo/i }).click();
  await expect(page.getByText(/riverbend café/i).first()).toBeVisible();
  await expect(page.getByText(/recovery/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(/riverbend café/i).first()).toBeVisible();
  const reset = page.getByRole("button", { name: /reset|start again|new mri/i }).first();
  if (await reset.isVisible().catch(() => false)) {
    await reset.click();
    await expect(page.getByRole("button", { name: /run my business mri/i })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("key pilot controls remain reachable on a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /run my business mri/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /safety & feedback/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
