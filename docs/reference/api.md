# API

The Go API listens on port 8080. Bodies are JSON. A task has `id`, `title`, `completed` and an optional `dueDate`, a calendar date written `YYYY-MM-DD`. A task without a due date omits `dueDate`.

| Method and path | Body | Success | Failure |
| --- | --- | --- | --- |
| `GET /healthz` | | 200, `{"status": "ok"}` | |
| `GET /api/tasks?today=2026-11-04` | | 200, all tasks, in the sort order below | 400, `today` is not a real calendar date |
| `POST /api/tasks` | `{"title": "Buy milk", "dueDate": "2026-11-04"}` | 201, the task | 400, malformed, blank title, or `dueDate` is not a real calendar date |
| `PATCH /api/tasks/{id}` | `{"completed": true}` | 200, the task | 400, malformed; 404, unknown id |
| `DELETE /api/tasks/{id}` | | 204 | 404, unknown id |

## Due dates

- `POST /api/tasks` accepts a `dueDate` in the past. It rejects an empty string or an impossible date such as `2026-02-30`, and stores nothing.
- `PATCH /api/tasks/{id}` never changes `dueDate`.
- `today` is optional. Without it, the API uses its own local date.

## Sort order

`GET /api/tasks` returns three groups, and tasks with the same due date keep the order they were added in:

1. Overdue tasks, by due date. A task is overdue when it is not completed and its `dueDate` is before `today`.
2. Other tasks with a due date, by due date. This group includes completed tasks.
3. Tasks without a due date.
