# API

The Go API listens on port 8080. Bodies are JSON. A task has `id`, `title`, `completed` and an optional `dueDate`, a calendar date written `YYYY-MM-DD`. A task without a due date omits `dueDate`.

| Method and path | Body | Success | Failure |
| --- | --- | --- | --- |
| `GET /healthz` | | 200, `{"status": "ok"}` | |
| `GET /api/tasks?today=2026-11-04` | | 200, all tasks, in the sort order below | 400, `today` is not a real calendar date |
| `POST /api/tasks` | `{"title": "Buy milk", "dueDate": "2026-11-04"}` | 201, the task | 400, malformed, blank title, title over 200 characters, or `dueDate` is not a real calendar date; 409, the list holds 50 tasks; 413, body over 4,096 bytes |
| `PATCH /api/tasks/{id}` | `{"completed": true}` | 200, the task | 400, malformed; 404, unknown id; 413, body over 4,096 bytes |
| `DELETE /api/tasks/{id}` | | 204 | 404, unknown id |

## Visitor lists

Each visitor has their own list, selected by a `todo_list` cookie that the API sets on the first `/api/` request. The cookie is `HttpOnly`, `Secure` and `SameSite=Lax`.

- The API ignores a cookie value it did not issue, and starts a new list with a new cookie.
- The API holds 1,000 lists, and evicts the least recently used one to make room for a new one.
- Lists live in memory, so they end when the process stops.

With `WEB_DIR` set, the API also serves the page from that folder.

## Due dates

- `POST /api/tasks` accepts a `dueDate` in the past. It rejects an empty string or an impossible date such as `2026-02-30`, and stores nothing.
- `PATCH /api/tasks/{id}` never changes `dueDate`.
- `today` is optional. Without it, the API uses its own local date.

## Sort order

`GET /api/tasks` returns three groups. Within a group, tasks with the same due date keep the order they were added in:

1. Overdue tasks, by due date. A task is overdue when it is not completed and its `dueDate` is before `today`.
2. Other tasks with a due date, by due date. This group includes completed tasks.
3. Tasks without a due date.
