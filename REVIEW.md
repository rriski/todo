# Review

Read the diff against `git merge-base origin/main HEAD`. Look for failures, not style: the hooks own style.

## Look for

- **Behavior.** Does the change do what its request says? Which input breaks it?
- **Contracts.** Do `task.schema.json`, the Go `Task` and the TypeScript `Task` still agree? Does `docs/reference/api.md` match the API?
- **Boundaries.** Does the page reach the API only through `apps/web/src/api.ts`?
- **Tests.** Would a test fail if the new code were wrong? Does a change in behavior come with a test?
- **Deletion.** Could this change remove code instead of adding it?

## Report findings

Report each finding in this format, most severe first. Report nothing you could not confirm from the code.

```text
[Critical|Important|Suggestion] path:line - issue
Problem: what goes wrong, and for which input
Fix: the smallest change that solves it
```

- **Critical:** loses data, breaks the API contract or fails on main.
- **Important:** a real bug or a missing test for new behavior.
- **Suggestion:** a simpler way that keeps the behavior.

When you find nothing, say "No findings" and list what you checked.
