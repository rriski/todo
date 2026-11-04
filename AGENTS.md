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
