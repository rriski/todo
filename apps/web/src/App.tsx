import { type SubmitEvent, useEffect, useState } from "react";
import { countOpen, type Task, validateTask } from "@todo/model";
import { Button, TaskRow } from "@todo/ui";
import { addTask, deleteTask, listTasks, setTaskCompleted } from "./api";

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTasks().then(setTasks);
  }, []);

  useEffect(() => {
    document.title = `Tasks (${countOpen(tasks)})`;
  }, [tasks]);

  async function handleAdd(event: SubmitEvent) {
    event.preventDefault();
    const validationError = validateTask({ title });
    setError(validationError);
    if (validationError) return;

    const task = await addTask({ title });
    setTasks([...tasks, task]);
    setTitle("");
  }

  async function handleToggle(id: string, completed: boolean) {
    const updated = await setTaskCompleted(id, completed);
    setTasks(tasks.map((task) => (task.id === id ? updated : task)));
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setTasks(tasks.filter((task) => task.id !== id));
  }

  return (
    <main className="page">
      <h1>Tasks</h1>
      <form className="add-task" onSubmit={handleAdd}>
        <input
          aria-label="New task"
          placeholder="What needs doing?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Button type="submit">Add</Button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {tasks.length === 0 ? (
        <p className="empty">No tasks yet.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={(completed) => handleToggle(task.id, completed)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
