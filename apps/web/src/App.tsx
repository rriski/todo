import { type SubmitEvent, useEffect, useState } from "react";
import { tabTitle, type Task, toCalendarDate, validateTask } from "@todo/model";
import { Button, TaskRow } from "@todo/ui";
import { addTask, deleteTask, listTasks, setTaskCompleted } from "./api";

type TaskList = { today: string; tasks: Task[] };

async function loadTasks(): Promise<TaskList> {
  const today = toCalendarDate(new Date());
  return { today, tasks: await listTasks(today) };
}

export function App() {
  const [{ today, tasks }, setTaskList] = useState<TaskList>({ today: "", tasks: [] });
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks().then(setTaskList);
  }, []);

  useEffect(() => {
    document.title = tabTitle(tasks);
  }, [tasks]);

  async function handleAdd(event: SubmitEvent) {
    event.preventDefault();
    const validationError = validateTask({ title });
    setError(validationError);
    if (validationError) return;

    await addTask(dueDate === "" ? { title } : { title, dueDate });
    setTaskList(await loadTasks());
    setTitle("");
    setDueDate("");
  }

  async function handleToggle(id: string, completed: boolean) {
    await setTaskCompleted(id, completed);
    setTaskList(await loadTasks());
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setTaskList({ today, tasks: tasks.filter((task) => task.id !== id) });
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
        <input
          type="date"
          aria-label="Due date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
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
              today={today}
              onToggle={(completed) => handleToggle(task.id, completed)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
