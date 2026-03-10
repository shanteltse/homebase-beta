import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("shows the rundown heading", async ({ page }) => {
    await expect(page.getByText("Here's the Rundown")).toBeVisible();
  });

  test("displays stat cards", async ({ page }) => {
    await expect(page.getByText("Overdue")).toBeVisible();
    await expect(page.getByText("Due Today")).toBeVisible();
    await expect(page.getByText("Completed")).toBeVisible();
  });

  test("shows task section or empty state", async ({ page }) => {
    // Wait for loading to finish — stat cards show numbers instead of "—"
    await expect(page.getByText("Overdue")).toBeVisible();

    // Dashboard shows overdue/today task cards OR the "all caught up" message
    const caughtUp = page.getByText("all caught up");
    const taskCards = page.locator("[data-testid='task-card']");

    // Wait a moment for data to load
    await page.waitForTimeout(1000);

    const hasCaughtUp = await caughtUp.isVisible().catch(() => false);
    const hasTaskCards = (await taskCards.count()) > 0;

    // One of these should be true
    expect(hasCaughtUp || hasTaskCards).toBeTruthy();
  });

  test("can navigate to tasks page", async ({ page }) => {
    await page.getByRole("link", { name: "Tasks" }).first().click();
    await page.waitForURL("/tasks*");
    await expect(page).toHaveURL(/\/tasks/);
  });

  test("stat cards link to filtered task views", async ({ page }) => {
    // Wait for stats to load
    await expect(page.getByText("Due Today")).toBeVisible();

    // Click the "Due Today" stat card
    await page.getByRole("link", { name: /Due Today/ }).click();
    await page.waitForURL("/tasks*");
    await expect(page).toHaveURL(/\/tasks\?view=today/);
  });
});
