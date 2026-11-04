import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Task, toCalendarDate } from "@todo/model";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { addTask, deleteTask, listTasks, setTaskCompleted } from "./api";

vi.mock("./api");

const milk = { id: "1", title: "Buy milk", completed: false };
const sam = { id: "2", title: "Call Sam", completed: false };

beforeEach(() => {
  vi.mocked(listTasks).mockResolvedValue([milk]);
});

afterEach(() => {
  vi.useRealTimers();
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

it("uses the date of each request after midnight passes", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 4, 23, 59));
  vi.mocked(listTasks).mockResolvedValue([{ ...milk, dueDate: "2026-11-04" }]);
  vi.mocked(addTask).mockResolvedValue(sam);
  render(<App />);
  await screen.findByRole("checkbox", { name: "Buy milk" });
  expect(screen.queryByText("Overdue")).toBeNull();

  vi.setSystemTime(new Date(2026, 10, 5, 0, 1));
  await userEvent.type(screen.getByRole("textbox", { name: "New task" }), "Call Sam{Enter}");

  expect(await screen.findByText("Overdue")).toBeTruthy();
  expect(listTasks).toHaveBeenLastCalledWith("2026-11-05");
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

it("shows why the API refused a task and keeps the title", async () => {
  vi.mocked(addTask).mockRejectedValue(new Error("a list holds at most 50 tasks"));
  render(<App />);
  const title = screen.getByRole("textbox", { name: "New task" }) as HTMLInputElement;

  await userEvent.type(title, "Call Sam{Enter}");

  expect((await screen.findByRole("alert")).textContent).toBe("a list holds at most 50 tasks");
  expect(title.value).toBe("Call Sam");
});

it("ignores a reload that finishes after a later delete", async () => {
  const staleReload: { finish?: (tasks: Task[]) => void } = {};
  vi.mocked(listTasks).mockResolvedValue([milk, sam]);
  vi.mocked(setTaskCompleted).mockResolvedValue({ ...milk, completed: true });
  vi.mocked(deleteTask).mockResolvedValue();
  render(<App />);
  await screen.findByRole("checkbox", { name: "Buy milk" });
  vi.mocked(listTasks).mockReturnValueOnce(
    new Promise<Task[]>((resolve) => (staleReload.finish = resolve)),
  );

  await userEvent.click(screen.getByRole("checkbox", { name: "Buy milk" }));
  await waitFor(() => expect(listTasks).toHaveBeenCalledTimes(2));
  vi.mocked(listTasks).mockResolvedValue([sam]);
  await userEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));
  await waitFor(() => expect(screen.queryByRole("checkbox", { name: "Buy milk" })).toBeNull());
  await act(async () => staleReload.finish?.([{ ...milk, completed: true }, sam]));

  expect(screen.queryByRole("checkbox", { name: "Buy milk" })).toBeNull();
  expect(screen.getByRole("checkbox", { name: "Call Sam" })).toBeTruthy();
});

it("removes a deleted task before its reload finishes", async () => {
  const slowReload: { finish?: (tasks: Task[]) => void } = {};
  vi.mocked(listTasks).mockResolvedValue([milk, sam]);
  vi.mocked(deleteTask).mockResolvedValue();
  render(<App />);
  await screen.findByRole("checkbox", { name: "Buy milk" });
  vi.mocked(listTasks).mockReturnValueOnce(
    new Promise<Task[]>((resolve) => (slowReload.finish = resolve)),
  );

  await userEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));
  await waitFor(() => expect(listTasks).toHaveBeenCalledTimes(2));

  expect(screen.queryByRole("checkbox", { name: "Buy milk" })).toBeNull();
  expect(screen.getByRole("checkbox", { name: "Call Sam" })).toBeTruthy();

  await act(async () => slowReload.finish?.([sam]));

  expect(screen.queryByRole("checkbox", { name: "Buy milk" })).toBeNull();
  expect(screen.getByRole("checkbox", { name: "Call Sam" })).toBeTruthy();
});

it("deletes a task", async () => {
  vi.mocked(deleteTask).mockResolvedValue();
  render(<App />);
  await screen.findByRole("checkbox", { name: "Buy milk" });
  vi.mocked(listTasks).mockResolvedValue([]);

  await userEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));

  expect(await screen.findByText("No tasks yet.")).toBeTruthy();
});
