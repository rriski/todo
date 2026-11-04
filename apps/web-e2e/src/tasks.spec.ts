import { expect, test } from "@playwright/test";

test("add a task and complete it", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("textbox", { name: "New task" }).fill("Buy milk");
  await page.getByRole("button", { name: "Add" }).click();

  const task = page.getByRole("checkbox", { name: "Buy milk" });
  await expect(task).not.toBeChecked();

  await task.click();
  await expect(task).toBeChecked();
});
