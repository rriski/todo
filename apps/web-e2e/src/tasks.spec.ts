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

test("an overdue task sorts first and loses its chip when completed", async ({ page }) => {
  await page.goto("/");
  const title = page.getByRole("textbox", { name: "New task" });

  await title.fill("Water the plants");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("checkbox", { name: "Water the plants" })).toBeVisible();
  await title.fill("Return the books");
  await page.getByLabel("Due date").fill("2000-01-01");
  await page.getByRole("button", { name: "Add" }).click();

  const books = page.getByRole("listitem").filter({ hasText: "Return the books" });
  await expect(books.getByText("Overdue")).toBeVisible();
  await expect(books.locator("time")).toHaveText(
    await page.evaluate(() => new Date(2000, 0, 1).toLocaleDateString()),
  );
  const rows = await page.getByRole("listitem").allTextContents();
  expect(rows.findIndex((row) => row.includes("Return the books"))).toBeLessThan(
    rows.findIndex((row) => row.includes("Water the plants")),
  );

  await books.getByRole("checkbox").click();
  await expect(books.getByRole("checkbox")).toBeChecked();
  await expect(books.getByText("Overdue")).toHaveCount(0);
});
