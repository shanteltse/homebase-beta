import { test, expect } from "@playwright/test";
import { login, TEST_USER } from "./helpers";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Settings" }).first().click();
    await page.waitForURL("/settings*");
  });

  test("shows profile information", async ({ page }) => {
    await expect(page.getByText("Profile")).first().toBeVisible();
    await expect(page.getByText("Your account information.")).toBeVisible();

    // Should display the user's email
    await expect(page.getByText(TEST_USER.email)).toBeVisible();
  });

  test("shows notification settings", async ({ page }) => {
    // The Notifications card should be visible
    await expect(page.getByText("Notifications")).first().toBeVisible();
  });

  test("shows appearance section", async ({ page }) => {
    await expect(page.getByText("Appearance")).first().toBeVisible();
    await expect(
      page.getByText("Customize how HomeBase looks.")
    ).toBeVisible();
  });

  test("can sign out from settings", async ({ page }) => {
    // The Account section has a "Sign out" button
    await expect(page.getByText("Account")).first().toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();

    // Should redirect to login page
    await page.waitForURL("/login");
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});
