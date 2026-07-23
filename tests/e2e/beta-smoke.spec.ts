import { expect, test } from "@playwright/test";

test("home page loads without uncaught browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Business Lifeline/i);
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toEqual([]);
});

test("controlled beta safety centre opens and explains boundaries", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /safety & feedback/i }).click();
  await expect(page.getByRole("dialog", { name: /controlled beta safety centre/i })).toBeVisible();
  await expect(page.getByText(/do not rely on it for/i)).toBeVisible();
  await expect(page.getByText(/tax or BAS lodgement/i)).toBeVisible();
});

test("feedback can be saved and exported locally", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /safety & feedback/i }).click();
  await page.getByRole("button", { name: /report feedback/i }).click();
  await page.getByLabel(/screen or step/i).fill("Business MRI results");
  await page.getByLabel(/what happened/i).fill("Automated pilot feedback test");
  await page.getByRole("button", { name: /save feedback/i }).click();
  await expect(page.getByText(/feedback saved on this device/i)).toBeVisible();
  await expect(page.getByText(/1 saved report/i)).toBeVisible();
});

test("weekly pilot outcome checkpoint persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /safety & feedback/i }).click();
  await page.getByRole("button", { name: /pilot outcomes/i }).click();
  await page.getByLabel(/actions assigned/i).fill("5");
  await page.getByLabel(/actions completed/i).fill("3");
  await page.getByRole("button", { name: /save weekly checkpoint/i }).click();
  await expect(page.getByText(/pilot outcome checkpoint saved/i)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /safety & feedback/i }).click();
  await page.getByRole("button", { name: /pilot outcomes/i }).click();
  await expect(page.getByLabel(/actions completed/i)).toHaveValue("3");
});
