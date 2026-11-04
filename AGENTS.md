# Agent guide

A small todo app in a pnpm and Nx workspace: a React page and a Go API.

## Commands

- `./scripts/setup.sh`: set up. Run it inside the devshell, `direnv allow` or `nix develop`.
- `./scripts/affected.sh`: run the checks for what this branch changed.
- `pnpm nx run-many -t test build`: run unit tests and builds.
- `pnpm nx run-many -t typecheck`: check the TypeScript types.
- `pnpm nx run-many -t lint`: run every lint rule. `docs/reference/checks.md` lists them.
- `pnpm nx e2e web-e2e`: run the browser and visual tests. Add `--update-snapshots` after an intended visual change.
- `gh workflow run visual-baselines`: take the Linux screenshots on a runner. Commit its artifact to `apps/web-e2e/src/__screenshots__/linux`.
- `pnpm nx fuzz api`: fuzz the task decoder for 30 seconds.
- `pnpm nx run-many -t mutation`: run mutation tests. Reports land in `.scratch/mutation`.
- `gh issue list --label nightly`: read the last nightly failures. `docs/how-to/fix-a-nightly-failure.md` says what to do.
- `pnpm nx run-many -t serve -p api web`: run the app on port 5173.
- `./scripts/deploy-dev.sh <tag>`: build the images, start them, and roll back if `/healthz` fails.
- `pnpm nx build web && flyctl deploy --ha=false`: deploy the public demo that `fly.toml` describes.
- `scripts/watch-pr <number>`: wait in the background until a pull request needs you.
- `scripts/trace-change start <name>`: trace one change. `docs/reference/tracing.md` lists the commands.

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
