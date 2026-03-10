import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Notifications", () => {
  test("shows notification bell", async ({ page }) => {
    await login(page);

    // The notification bell should be visible in the header
    const bell = page.getByRole("button", { name: "Notifications" });
    await expect(bell.first()).toBeVisible();
  });
});
