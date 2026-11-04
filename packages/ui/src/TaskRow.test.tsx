import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { TaskRow } from "./TaskRow";

const task = { id: "1", title: "Buy milk", completed: false };

it("reports a toggle", async () => {
  const onToggle = vi.fn();
  render(<TaskRow task={task} onToggle={onToggle} onDelete={vi.fn()} />);

  await userEvent.click(screen.getByRole("checkbox", { name: "Buy milk" }));

  expect(onToggle).toHaveBeenCalledWith(true);
});

it("reports a delete", async () => {
  const onDelete = vi.fn();
  render(<TaskRow task={task} onToggle={vi.fn()} onDelete={onDelete} />);

  await userEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));

  expect(onDelete).toHaveBeenCalled();
});
