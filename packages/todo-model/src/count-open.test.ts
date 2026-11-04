import { expect, it } from "vitest";
import { countOpen } from "./task";

it("counts the tasks that are not completed", () => {
  const tasks = [
    { id: "1", title: "Buy milk", completed: false },
    { id: "2", title: "Call Sam", completed: true },
  ];

  expect(countOpen(tasks)).toBe(1);
});
