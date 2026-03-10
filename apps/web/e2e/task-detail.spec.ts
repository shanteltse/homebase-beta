import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Task Detail", () => {
  let unique: string;

  test.beforeEach(async ({ page }) => {
    unique = Date.now().toString(36);
    await login(page);
    await page.getByRole("link", { name: "Tasks" }).first().click();
    await page.waitForURL("/tasks*");
  });

  /** Helper: create a task and navigate to its detail page */
  async function createAndOpenTask(
    page: import("@playwright/test").Page,
    title: string
  ) {
    await page.getByRole("button", { name: "New task" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    // Click the task to go to its detail page
    await page.getByText(title).click();
    await page.waitForURL("/tasks/*");
  }

  test("can add a subtask", async ({ page }) => {
    const title = `E2E subtask-add ${unique}`;
    await createAndOpenTask(page, title);

    // The subtasks section should be visible
    await expect(page.getByText("Subtasks")).toBeVisible();

    // Add a subtask
    const subtaskTitle = `Sub ${unique}`;
    await page.getByPlaceholder("Add a subtask...").fill(subtaskTitle);
    await page.getByPlaceholder("Add a subtask...").press("Enter");

    // Verify the subtask appears
    await expect(page.getByText(subtaskTitle)).toBeVisible();
    await expect(page.getByText("0/1 subtasks completed")).toBeVisible();
  });

  test("can toggle a subtask", async ({ page }) => {
    const title = `E2E subtask-toggle ${unique}`;
    await createAndOpenTask(page, title);

    // Add a subtask first
    const subtaskTitle = `Toggle-sub ${unique}`;
    await page.getByPlaceholder("Add a subtask...").fill(subtaskTitle);
    await page.getByPlaceholder("Add a subtask...").press("Enter");
    await expect(page.getByText(subtaskTitle)).toBeVisible();

    // Toggle the subtask checkbox
    // The subtask row has a checkbox — find the one near our subtask text
    const subtaskRow = page.locator("div").filter({ hasText: subtaskTitle }).last();
    await subtaskRow.getByRole("checkbox").click();

    // Should now show 1/1 completed
    await expect(page.getByText("1/1 subtasks completed")).toBeVisible();
  });

  test("can delete a subtask", async ({ page }) => {
    const title = `E2E subtask-delete ${unique}`;
    await createAndOpenTask(page, title);

    // Add a subtask
    const subtaskTitle = `Delete-sub ${unique}`;
    await page.getByPlaceholder("Add a subtask...").fill(subtaskTitle);
    await page.getByPlaceholder("Add a subtask...").press("Enter");
    await expect(page.getByText(subtaskTitle)).toBeVisible();

    // Delete the subtask — the X button is inside the subtask row
    const subtaskRow = page
      .locator("div")
      .filter({ hasText: subtaskTitle })
      .last();
    await subtaskRow.locator("button").last().click();

    // Subtask should be removed
    await expect(page.getByText(subtaskTitle)).not.toBeVisible();
  });

  test("can add tags to a task", async ({ page }) => {
    const title = `E2E tags ${unique}`;
    await createAndOpenTask(page, title);

    // The Tags section should be visible
    await expect(page.getByText("Tags")).first().toBeVisible();

    // Type a tag and press Enter in the tag input
    const tagName = `tag-${unique}`;
    const tagInput = page.getByPlaceholder("Add tags...");
    await tagInput.fill(tagName);
    await tagInput.press("Enter");

    // The tag should appear as a badge
    await expect(page.getByText(tagName)).toBeVisible();
  });

  test("can set recurring pattern", async ({ page }) => {
    const title = `E2E recurring ${unique}`;
    await createAndOpenTask(page, title);

    // The Recurring section should be visible
    await expect(page.getByText("Recurring")).first().toBeVisible();

    // Open the recurring select and choose "Daily"
    const recurringSection = page
      .locator("div")
      .filter({ hasText: /^Recurring/ })
      .last();
    await recurringSection.getByRole("combobox").click();
    await page.getByRole("option", { name: "Daily" }).click();

    // Save the task
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL("/tasks*");

    // Re-open the task and verify recurring is set
    await page.getByText(title).click();
    await page.waitForURL("/tasks/*");

    // The recurring select should show "Daily"
    await expect(page.getByText("Daily")).first().toBeVisible();
  });
});
