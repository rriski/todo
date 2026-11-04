import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { addTask, deleteTask, listTasks, setTaskCompleted } from "./api";

vi.mock("./api");

const milk = { id: "1", title: "Buy milk", completed: false };

beforeEach(() => {
  vi.mocked(listTasks).mockResolvedValue([milk]);
});

it("lists tasks", async () => {
  render(<App />);

  expect(await screen.findByRole("checkbox", { name: "Buy milk" })).toBeTruthy();
});

it("adds a task", async () => {
  vi.mocked(addTask).mockResolvedValue({ id: "2", title: "Call Sam", completed: false });
  render(<App />);

  await userEvent.type(screen.getByRole("textbox", { name: "New task" }), "Call Sam{Enter}");

  expect(await screen.findByRole("checkbox", { name: "Call Sam" })).toBeTruthy();
});

it("rejects a blank title", async () => {
  render(<App />);

  await userEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(screen.getByRole("alert").textContent).toBe("Enter a title");
  expect(addTask).not.toHaveBeenCalled();
});

it("completes a task", async () => {
  vi.mocked(setTaskCompleted).mockResolvedValue({ ...milk, completed: true });
  render(<App />);

  await userEvent.click(await screen.findByRole("checkbox", { name: "Buy milk" }));

  expect(await screen.findByRole("checkbox", { name: "Buy milk", checked: true })).toBeTruthy();
});

it("deletes a task", async () => {
  vi.mocked(deleteTask).mockResolvedValue();
  render(<App />);

  await userEvent.click(await screen.findByRole("button", { name: "Delete Buy milk" }));

  expect(await screen.findByText("No tasks yet.")).toBeTruthy();
});
