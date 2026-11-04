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
| Ratchet | Suppressions, skipped tests and TODOs only fall | `tools/checks/ratchet.mjs`, `ratchet.json` |

## Tests

| Kind | What it proves | Where |
| --- | --- | --- |
| Unit | One behavior, in Vitest or `go test` | Beside the code |
| Browser | A user can add and complete a task | `apps/web-e2e/src/tasks.spec.ts` |
| Property | Whitespace around a title never changes the verdict; task ids stay unique through any adds and deletes | `task.property.test.ts`, `store_property_test.go` |
| Fuzz | No request body crashes the API, and a stored title is never blank | `apps/api/task_fuzz_test.go` |
| Visual | The task list matches its committed screenshot | `apps/web-e2e/src/visual.spec.ts` |
