export type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
};

export type NewTask = Pick<Task, "title" | "dueDate">;

export function validateTask(task: NewTask): string | null {
  return task.title.trim() === "" ? "Enter a title" : null;
}

export function toCalendarDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isOverdue(task: Task, today: string): boolean {
  return !task.completed && task.dueDate !== undefined && task.dueDate < today;
}

export function formatDueDate(dueDate: string, locales?: Intl.LocalesArgument): string {
  return new Date(`${dueDate}T00:00`).toLocaleDateString(locales);
}

export function countOpen(tasks: Task[]): number {
  return tasks.filter((task) => !task.completed).length;
}

export function tabTitle(tasks: Task[]): string {
  const open = countOpen(tasks);
  return open === 0 ? "Tasks" : `Tasks (${open})`;
}
