import { expect, test } from "@playwright/test";

const tasks = [
  { id: "1", title: "Buy milk", completed: false, dueDate: "2026-11-01" },
  { id: "2", title: "Call Sam", completed: true, dueDate: "2026-10-20" },
  { id: "3", title: "Book the dentist", completed: false, dueDate: "2026-11-20" },
  { id: "4", title: "Water the plants", completed: false },
];

test.use({ locale: "en-US" });

test("the task list looks the same", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 10, 4, 12));
  await page.route(
    (url) => url.pathname === "/api/tasks",
    (route) => route.fulfill({ json: tasks }),
  );

  await page.goto("/");

  await expect(page.getByRole("list")).toBeVisible();
  await expect(page).toHaveScreenshot("task-list.png");
});
