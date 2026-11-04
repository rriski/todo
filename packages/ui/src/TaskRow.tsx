import type { Task } from "@todo/model";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";

type TaskRowProps = {
  task: Task;
  onToggle: (completed: boolean) => void;
  onDelete: () => void;
};

export function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  return (
    <li className="task-row">
      <Checkbox label={task.title} checked={task.completed} onChange={onToggle} />
      <Button variant="quiet" aria-label={`Delete ${task.title}`} onClick={onDelete}>
        Delete
      </Button>
    </li>
  );
}
