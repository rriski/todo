# Checks

Every rule belongs to one category. A failing rule says how to fix the problem. `pnpm nx affected -t lint test typecheck` runs the ones a change reaches.

| Category | Rule | Tool and file |
| --- | --- | --- |
| Repository hygiene | No file over 512 KB | `tools/checks/hygiene.mjs` |
| Formatting | One format, fixed on edit and on commit | oxfmt, gofmt |
| Names and structure | File and folder names | ls-lint, `.ls-lint.yml` |
| Names and structure | At most 20 code files in a folder; docs sit in a Diátaxis folder | `tools/checks/structure.mjs` |
| Language lint | Correct and unsuspicious code | oxlint, `.oxlintrc.json`; golangci-lint, `apps/api/.golangci.yml` |
| Types | TypeScript types | `tsc` |
| Architecture boundaries | A package never imports an app; the page calls the API only through `apps/web/src/api.ts` | `tools/checks/boundaries.mjs` |
| Test quality | No `if` in a TypeScript test; a test name says what the code does | `tools/checks/test-quality.mjs` |
| Package exports | `exports` in a `package.json` points at real files | `tools/checks/package-exports.mjs` |
| Prose | No filler; a how-to guide promises no lesson | Vale, `.vale.ini` |
| CI workflows | Workflows parse and use real runner labels and expressions | actionlint |
| Ratchet | Suppressions, skipped tests and TODOs only fall | `tools/checks/ratchet.mjs`, `ratchet.json` |

## Tests

| Kind | What it proves | Where |
| --- | --- | --- |
| Unit | One behavior, in Vitest or `go test` | Beside the code |
| Browser | A user can add and complete a task | `apps/web-e2e/src/tasks.spec.ts` |
| Property | Whitespace around a title never changes the verdict; task ids stay unique through any adds and deletes | `task.property.test.ts`, `store_property_test.go` |
| Fuzz | No request body crashes the API, and a stored title is never blank | `apps/api/task_fuzz_test.go` |
| Visual | The task list matches its committed screenshot | `apps/web-e2e/src/visual.spec.ts` |
| Mutation | The tests fail when the code changes, 80% or better | Stryker on `packages/todo-model`, Gremlins on `apps/api` |

## Where each check runs

Each check runs at the cheapest stage that can still catch the problem. CI runs the affected ones again, because a local hook can be skipped.

| Stage | What runs |
| --- | --- |
| Every agent edit | Format and lint the edited file |
| `git commit` | Format staged files, fast lint, Vale on staged pages, repository checks |
| Sub-agent stops, `git push` | Rebase check on push, then affected `lint`, `typecheck`, `test` |
| Pull request | Affected `lint`, `typecheck`, `test`, `build`, `e2e` |
| Nightly | All `e2e`, fuzz for five minutes, all `mutation`; failures go to [one issue](../how-to/fix-a-nightly-failure.md) |
| Push to main | All `lint`, `typecheck`, `test`, `build`, `e2e`. Build the images, start them, poll `/healthz`, roll back on failure |
