import { expect, test } from "@playwright/test";

const tasks = [
  { id: "1", title: "Buy milk", completed: false },
  { id: "2", title: "Call Sam", completed: true },
  { id: "3", title: "Book the dentist", completed: false },
];

test("the task list looks the same", async ({ page }) => {
  await page.route("/api/tasks", (route) => route.fulfill({ json: tasks }));

  await page.goto("/");

  await expect(page.getByRole("list")).toBeVisible();
  await expect(page).toHaveScreenshot("task-list.png");
});
