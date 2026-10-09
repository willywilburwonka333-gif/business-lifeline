import { expect, test, type Page } from "@playwright/test";

async function openSafetyCentre(page: Page) {
  const launcher = page.getByTestId("beta-safety-launcher");
  await expect(launcher).toBeVisible({ timeout: 15000 });
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

test("synthetic MRI can create and restore a measurable quoting repair project", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("business-lifeline-tutorial-welcome-v1", "complete");
    window.localStorage.setItem("business-lifeline-tutorial-overview-v1", "complete");
    window.localStorage.setItem("business-lifeline-tutorial-lifeline-v1", "complete");
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Choose a Demo MRI/i }).click();
  const chooser = page.getByRole("dialog", { name: /Choose the business you want to test/i });
  await expect(chooser).toBeVisible();
  await chooser.getByRole("button", { name: /Family Table Cafe/i }).click();
  await expect(page.locator(".product-brand")).toContainText("Family Table Cafe");

  const recover = page.getByRole("navigation", { name: "Business Lifeline main areas" }).getByRole("button", { name: /Business Lifeline/i });
  await recover.click();
  await page.getByRole("tab", { name: /Repair Centre/i }).click();
  await expect(page.getByRole("heading", { name: "Repair Centre" })).toBeVisible();
  await page.getByLabel(/Show all improvement templates/i).check();
  await page.getByRole("button", { name: /Create repair project/i }).first().click();
  await expect(page.getByRole("heading", { name: "Projects and progress" })).toBeVisible();
  await expect(page.getByText(/Repair project created/i)).toBeVisible();

  const projectsBefore = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith("business-lifeline-repair-projects-v1:"));
    return key ? JSON.parse(localStorage.getItem(key) || "{}").projects?.length : 0;
  });
  expect(projectsBefore).toBe(1);

  await page.reload();
  await recover.click();
  await page.getByRole("tab", { name: /Repair Centre/i }).click();
  await expect(page.getByRole("heading", { name: "Projects and progress" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Planning.*0%/i }).first()).toBeVisible();
});
