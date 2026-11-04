# Todo

A small todo app: list, add, complete and delete tasks. A React page talks to a Go API that keeps each visitor's tasks in memory.

A task can have a due date. Overdue tasks come first, then other dated tasks by due date, then undated tasks. The page sends the browser's date as `today` and marks an open task due before that date with a red "Overdue" chip. [The API reference](docs/reference/api.md) describes `dueDate`, `today` and the sort order.

## Run the app

```sh
pnpm install
pnpm nx run-many -t serve -p api web
```

Open <http://localhost:5173>.

`AGENTS.md` lists the test commands and the project layout.
