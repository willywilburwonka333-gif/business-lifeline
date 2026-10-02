import { expect, test, type Page } from "@playwright/test";

async function openSafetyCentre(page: Page) {
  const launcher = page.getByTestId("beta-safety-launcher");
  await expect(launcher).toBeVisible({ timeout: 15000 });
  await expect(launcher).toBeEnabled({ timeout: 15000 });
  await launcher.click();
  await expect(page.getByRole("dialog", { name: /controlled beta safety centre/i })).toBeVisible({ timeout: 15000 });
}

test("home page loads without uncaught browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => { errors.push(error.message); console.log("[pageerror]", error.message); });
  page.on("console", (msg) => { if (msg.type() === "error") console.log("[console-error]", msg.text()); });
  page.on("requestfailed", (request) => console.log("[request-failed]", request.url(), request.failure()?.errorText));
  await page.goto("/");
  await expect(page).toHaveTitle(/Business Lifeline/i);
  await expect(page.locator("body")).toBeVisible();
  await page.waitForTimeout(1500);
  const launcher = page.getByTestId("beta-safety-launcher");
  await expect(launcher).toBeVisible({ timeout: 15000 });
  await expect(launcher).toBeEnabled({ timeout: 15000 });
  expect(errors).toEqual([]);
});

test("controlled beta safety centre opens and explains boundaries", async ({ page }) => {
  await page.goto("/");
  await openSafetyCentre(page);
  await expect(page.getByRole("dialog", { name: /controlled beta safety centre/i })).toBeVisible();
  await expect(page.getByText(/do not rely on it for/i)).toBeVisible();
  await expect(page.getByText(/tax or BAS lodgement/i)).toBeVisible();
});

test("feedback can be saved and exported locally", async ({ page }) => {
  await page.goto("/");
  await openSafetyCentre(page);
  await page.getByRole("button", { name: /report feedback/i }).click();
  await page.getByLabel(/screen or step/i).fill("Business MRI results");
  await page.getByLabel(/what happened/i).fill("Automated pilot feedback test");
  await page.getByRole("button", { name: /save feedback/i }).click();
  await expect(page.getByText(/feedback saved on this device/i)).toBeVisible();
  await expect(page.locator(".beta-feedback-history")).toContainText("1");
  await expect(page.locator(".beta-feedback-history")).toContainText(/saved reports/i);
});

test("weekly pilot outcome checkpoint persists", async ({ page }) => {
  await page.goto("/");
  await openSafetyCentre(page);
  await page.getByRole("button", { name: /pilot outcomes/i }).click();
  await page.getByLabel(/actions assigned/i).fill("5");
  await page.getByLabel(/actions completed/i).fill("3");
  await page.getByRole("button", { name: /save weekly checkpoint/i }).click();
  await expect(page.getByText(/pilot outcome checkpoint saved/i)).toBeVisible();
  await page.reload();
  await openSafetyCentre(page);
  await page.getByRole("button", { name: /pilot outcomes/i }).click();
  await expect(page.getByLabel(/actions completed/i)).toHaveValue("3");
});
