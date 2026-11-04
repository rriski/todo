export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

export type NewTask = Pick<Task, "title">;

export function validateTask(task: NewTask): string | null {
  return task.title.trim() === "" ? "Enter a title" : null;
}

export function countOpen(tasks: Task[]): number {
  return tasks.filter((task) => !task.completed).length;
}
