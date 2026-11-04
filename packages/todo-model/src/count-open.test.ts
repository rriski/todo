import { expect, it } from "vitest";
import { countOpen, tabTitle } from "./task";

const open = { id: "1", title: "Buy milk", completed: false };
const done = { id: "2", title: "Call Sam", completed: true };

it("counts the tasks that are not completed", () => {
  expect(countOpen([open, done])).toBe(1);
});

it("shows the count in the tab title while a task is open", () => {
  expect(tabTitle([open, done])).toBe("Tasks (1)");
});

it("drops the count from the tab title when nothing is open", () => {
  expect(tabTitle([done])).toBe("Tasks");
});
