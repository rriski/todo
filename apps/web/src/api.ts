import type { NewTask, Task } from "@todo/model";

const jsonHeaders = { "Content-Type": "application/json" };

export async function listTasks(today: string): Promise<Task[]> {
  const response = await fetch(`/api/tasks?${new URLSearchParams({ today })}`);
  return response.json();
}

export async function addTask(task: NewTask): Promise<Task> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(task),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<Task> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ completed }),
  });
  return response.json();
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(`/api/tasks/${id}`, { method: "DELETE" });
}
