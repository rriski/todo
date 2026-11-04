import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toCalendarDate } from "@todo/model";
import { beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { addTask, deleteTask, listTasks, setTaskCompleted } from "./api";

vi.mock("./api");

const milk = { id: "1", title: "Buy milk", completed: false };
const sam = { id: "2", title: "Call Sam", completed: false };

beforeEach(() => {
  vi.mocked(listTasks).mockResolvedValue([milk]);
});

it("lists the tasks", async () => {
  render(<App />);

  expect(await screen.findByRole("checkbox", { name: "Buy milk" })).toBeTruthy();
});

it("requests the tasks for the browser's local date", async () => {
  render(<App />);

  await screen.findByRole("checkbox", { name: "Buy milk" });

  expect(listTasks).toHaveBeenCalledWith(toCalendarDate(new Date()));
});

it("adds a task", async () => {
  vi.mocked(addTask).mockResolvedValue(sam);
  render(<App />);
  await screen.findByRole("checkbox", { name: "Buy milk" });
  vi.mocked(listTasks).mockResolvedValue([milk, sam]);

  await userEvent.type(screen.getByRole("textbox", { name: "New task" }), "Call Sam{Enter}");

  expect(await screen.findByRole("checkbox", { name: "Call Sam" })).toBeTruthy();
  expect(addTask).toHaveBeenCalledWith({ title: "Call Sam" });
});

it("adds a task with a due date", async () => {
  vi.mocked(addTask).mockResolvedValue({ ...sam, dueDate: "2026-12-01" });
  render(<App />);

  await userEvent.type(screen.getByLabelText("Due date"), "2026-12-01");
  await userEvent.type(screen.getByRole("textbox", { name: "New task" }), "Call Sam{Enter}");

  expect(addTask).toHaveBeenCalledWith({ title: "Call Sam", dueDate: "2026-12-01" });
  expect((screen.getByLabelText("Due date") as HTMLInputElement).value).toBe("");
});

it("adds the next task without the previous due date", async () => {
  vi.mocked(addTask).mockResolvedValue({ ...sam, dueDate: "2026-12-01" });
  render(<App />);
  await screen.findByRole("checkbox", { name: "Buy milk" });
  vi.mocked(listTasks).mockResolvedValue([milk, { ...sam, dueDate: "2026-12-01" }]);
  const title = screen.getByRole("textbox", { name: "New task" });

  await userEvent.type(screen.getByLabelText("Due date"), "2026-12-01");
  await userEvent.type(title, "Call Sam{Enter}");
  await screen.findByRole("checkbox", { name: "Call Sam" });
  await userEvent.type(title, "Book the dentist{Enter}");

  expect(addTask).toHaveBeenLastCalledWith({ title: "Book the dentist" });
});

it("shows the API's order after an add", async () => {
  vi.mocked(addTask).mockResolvedValue(sam);
  render(<App />);
  await screen.findByRole("checkbox", { name: "Buy milk" });
  vi.mocked(listTasks).mockResolvedValue([sam, milk]);

  await userEvent.type(screen.getByRole("textbox", { name: "New task" }), "Call Sam{Enter}");

  await screen.findByRole("checkbox", { name: "Call Sam" });
  const names = screen.getAllByRole("checkbox").map((box) => box.closest("label")?.textContent);
  expect(names).toEqual(["Call Sam", "Buy milk"]);
});

it("shows the API's order after a toggle", async () => {
  vi.mocked(listTasks).mockResolvedValue([milk, sam]);
  vi.mocked(setTaskCompleted).mockResolvedValue({ ...milk, completed: true });
  render(<App />);
  await screen.findByRole("checkbox", { name: "Buy milk" });
  vi.mocked(listTasks).mockResolvedValue([sam, { ...milk, completed: true }]);

  await userEvent.click(screen.getByRole("checkbox", { name: "Buy milk" }));

  await screen.findByRole("checkbox", { name: "Buy milk", checked: true });
  const names = screen.getAllByRole("checkbox").map((box) => box.closest("label")?.textContent);
  expect(names).toEqual(["Call Sam", "Buy milk"]);
});

it("rejects a blank title", async () => {
  render(<App />);

  await userEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(screen.getByRole("alert").textContent).toBe("Enter a title");
  expect(addTask).not.toHaveBeenCalled();
});

it("deletes a task", async () => {
  vi.mocked(deleteTask).mockResolvedValue();
  render(<App />);

  await userEvent.click(await screen.findByRole("button", { name: "Delete Buy milk" }));

  expect(await screen.findByText("No tasks yet.")).toBeTruthy();
});
