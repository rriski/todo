# Agent guide

A small todo app in a pnpm and Nx workspace: a React page and a Go API.

## Commands

- `pnpm install`, then `pnpm exec playwright install chromium`: set up.
- `pnpm nx run-many -t test build`: run unit tests and builds.
- `pnpm nx run-many -t typecheck`: check the TypeScript types.
- `pnpm nx e2e web-e2e`: run the browser test.
- `pnpm nx run-many -t serve -p api web`: run the app on port 5173.

## Layout

- `apps/web`: the React page.
- `apps/api`: the Go API, in-memory.
- `apps/web-e2e`: the Playwright test.
- `packages/todo-model`: the Task types, validation and JSON Schema.
- `packages/ui`: shared React components.

## Read more

- `README.md`: what the app does.
- `pnpm nx graph`: how the projects depend on each other.
- `docs/README.md`: how the docs are organized.
- `.agents/workflow.md`: how to work through a task.
- `.agents/delivery.md`: how a change reaches main.
- `REVIEW.md`: what a review looks for.

## Agent tools

- Skill `ship-a-change` in `.agents/skills`: take a finished change to a green pull request.
- Sub-agent `review`: a read-only reviewer with fresh context. Claude reads `.claude/agents/review.md`, Codex reads `.codex/agents/review.toml`.
- MCP server `playwright`: drive the running app in a browser.
