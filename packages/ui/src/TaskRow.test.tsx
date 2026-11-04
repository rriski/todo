import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { TaskRow } from "./TaskRow";

const task = { id: "1", title: "Buy milk", completed: false };
const today = "2026-11-04";

it("reports a toggle", async () => {
  const onToggle = vi.fn();
  render(<TaskRow task={task} today={today} onToggle={onToggle} onDelete={vi.fn()} />);

  await userEvent.click(screen.getByRole("checkbox", { name: "Buy milk" }));

  expect(onToggle).toHaveBeenCalledWith(true);
});

it("reports a delete", async () => {
  const onDelete = vi.fn();
  render(<TaskRow task={task} today={today} onToggle={vi.fn()} onDelete={onDelete} />);

  await userEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));

  expect(onDelete).toHaveBeenCalled();
});

it("shows the due date in the browser's locale format", () => {
  render(
    <TaskRow
      task={{ ...task, dueDate: "2026-12-01" }}
      today={today}
      onToggle={vi.fn()}
      onDelete={vi.fn()}
    />,
  );

  const date = screen.getByText(new Date(2026, 11, 1).toLocaleDateString());
  expect(date.getAttribute("datetime")).toBe("2026-12-01");
});

it("shows no date without a due date", () => {
  const { container } = render(
    <TaskRow task={task} today={today} onToggle={vi.fn()} onDelete={vi.fn()} />,
  );

  expect(container.querySelector("time")).toBeNull();
});

it.each([
  { dueDate: "2026-11-03", completed: false, chips: 1 },
  { dueDate: "2026-11-04", completed: false, chips: 0 },
  { dueDate: "2026-11-03", completed: true, chips: 0 },
  { dueDate: undefined, completed: false, chips: 0 },
])(
  "shows $chips Overdue chips for due $dueDate with completed $completed",
  ({ dueDate, completed, chips }) => {
    render(
      <TaskRow
        task={{ ...task, dueDate, completed }}
        today={today}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryAllByText("Overdue")).toHaveLength(chips);
  },
);
