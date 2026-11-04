import { formatDueDate, isOverdue, type Task } from "@todo/model";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";

type TaskRowProps = {
  task: Task;
  today: string;
  onToggle: (completed: boolean) => void;
  onDelete: () => void;
};

export function TaskRow({ task, today, onToggle, onDelete }: TaskRowProps) {
  return (
    <li className="task-row">
      <Checkbox label={task.title} checked={task.completed} onChange={onToggle} />
      {task.dueDate && (
        <time className="task-due" dateTime={task.dueDate}>
          {formatDueDate(task.dueDate)}
        </time>
      )}
      {isOverdue(task, today) && <span className="chip-overdue">Overdue</span>}
      <Button variant="quiet" aria-label={`Delete ${task.title}`} onClick={onDelete}>
        Delete
      </Button>
    </li>
  );
}
