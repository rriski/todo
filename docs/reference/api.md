# API

The Go API listens on port 8080. Bodies are JSON. A task has `id`, `title` and `completed`.

| Method and path | Body | Success | Failure |
| --- | --- | --- | --- |
| `GET /api/tasks` | | 200, all tasks | |
| `POST /api/tasks` | `{"title": "Buy milk"}` | 201, the task | 400, malformed or blank title |
| `PATCH /api/tasks/{id}` | `{"completed": true}` | 200, the task | 400, malformed; 404, unknown id |
| `DELETE /api/tasks/{id}` | | 204 | 404, unknown id |
