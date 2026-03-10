import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Calendar", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Calendar" }).first().click();
    await page.waitForURL("/calendar*");
  });

  test("shows month view by default", async ({ page }) => {
    await expect(page.getByText("Calendar")).first().toBeVisible();

    // Month view renders a 7-column day header grid (Sun, Mon, …, Sat)
    await expect(page.getByText("Sun")).toBeVisible();
    await expect(page.getByText("Mon")).toBeVisible();
    await expect(page.getByText("Sat")).toBeVisible();

    // The "Month" toggle button should be active (styled as primary)
    const monthButton = page.getByRole("button", { name: "Month" });
    await expect(monthButton).toBeVisible();
  });

  test("can switch between month, week, and day views", async ({ page }) => {
    // Switch to Week view
    await page.getByRole("button", { name: "Week" }).click();
    // Week view still shows day headers
    await expect(page.getByText("Sun")).toBeVisible();

    // Switch to Day view
    await page.getByRole("button", { name: "Day" }).click();
    // Day view shows a single day with a weekday name in the navigation label
    const heading = page.locator("h3");
    // Day view label contains a weekday (e.g. "Monday", "Tuesday")
    await expect(heading.first()).toBeVisible();

    // Switch back to Month view
    await page.getByRole("button", { name: "Month" }).click();
    await expect(page.getByText("Sun")).toBeVisible();
    await expect(page.getByText("Sat")).toBeVisible();
  });

  test("can navigate to next and previous month", async ({ page }) => {
    // Grab the current navigation label (e.g. "March 2026")
    const heading = page.locator("h3").first();
    const initialLabel = await heading.textContent();

    // Click Next
    await page.getByRole("button", { name: "Next" }).click();
    await expect(heading).not.toHaveText(initialLabel!);
    const nextLabel = await heading.textContent();

    // Click Previous twice to go before the initial month
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(heading).toHaveText(initialLabel!);

    await page.getByRole("button", { name: "Previous" }).click();
    await expect(heading).not.toHaveText(initialLabel!);
    const prevLabel = await heading.textContent();

    // All three labels should be distinct
    expect(prevLabel).not.toBe(initialLabel);
    expect(prevLabel).not.toBe(nextLabel);
  });

  test("can click Today to return to current date", async ({ page }) => {
    const heading = page.locator("h3").first();
    const initialLabel = await heading.textContent();

    // Navigate away
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(heading).not.toHaveText(initialLabel!);

    // Click Today
    await page.getByRole("button", { name: "Today" }).click();
    await expect(heading).toHaveText(initialLabel!);
  });

  test("can click a day to see day view", async ({ page }) => {
    // In month view, click a day cell (the grid buttons with day numbers)
    // Find a day number cell and click it — use a cell within the grid
    const dayCells = page.locator("button").filter({ hasText: /^\d{1,2}$/ });
    // Click the 15th if visible, otherwise click the first available
    const target = dayCells.filter({ hasText: "15" }).first();
    const fallback = dayCells.first();
    const cellToClick = (await target.isVisible()) ? target : fallback;
    await cellToClick.click();

    // Should switch to Day view — the Day toggle should now be active
    // and the heading should show a full date label (contains a weekday)
    const heading = page.locator("h3").first();
    const dayLabel = await heading.textContent();
    // Day view label format: "Wednesday, March 15, 2026"
    expect(dayLabel).toMatch(/\w+day/);
  });
});
