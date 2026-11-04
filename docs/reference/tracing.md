# Delivery tracing

One change gets one trace id. The agent, the hooks, the gates and CI all record spans under it, in OpenTelemetry form, on this machine.

| Command | What it does |
| --- | --- |
| `scripts/trace-receiver` | Takes OTLP/HTTP JSON on port 4318 and appends spans to `.scratch/traces/<trace-id>.jsonl`. |
| `scripts/trace-change start <name>` | Starts the receiver if needed, and writes the trace id and root span to `.scratch/current-trace`. |
| `scripts/trace-change run <command>` | Runs `claude -p`, `codex exec` or anything else in that trace, with the OTLP settings the agents read. |
| `scripts/trace-change end` | Records the root span and ends the change. |
| `scripts/traced [--if-active] <name> -- <command>` | Records one command as a span with its exit status, and passes a child `TRACEPARENT` on. |
| `scripts/ci-trace <run-id>` | Reads a finished GitHub Actions run with `gh api` and writes its jobs and steps as backdated spans. |
| `scripts/trace-stats [--json]` | Prints p50 and p90 per span name over all stored traces. |
| `scripts/trace-export <trace-id> [--text]` | Writes one JSON file ordered for a waterfall, or prints the waterfall as text. |

## What joins the trace

| Source | Span | Parent |
| --- | --- | --- |
| Git hooks | `pre-commit`, `pre-push`, `affected` | `TRACEPARENT` if it is in this trace, else the root |
| Agent hooks | `hook PostToolUse`, `hook SubagentStop` | `TRACEPARENT` if it is in this trace, else the root |
| GitHub Actions | `workflow`, `job`, `step` | The root |

Hooks do nothing and print nothing while no change is active.

`scripts/ci-trace` finds the trace from the `pre-push` span: the commit it pushed, then its branch, then the branch of the pull request that holds the commit.

## Agent spans

`scripts/trace-change run` passes the agent the OTLP settings and `TRACEPARENT`. The agent's own configuration decides where its spans go.

- **Claude Code** reads `TRACEPARENT` in `-p` mode, so `claude_code.interaction` nests under `run claude`. Managed settings pin the endpoint when it starts from a clean shell, and its spans skip the receiver here. Started from inside a Claude desktop session, the launch environment wins and the spans arrive. `claude --debug-file <file>` logs the endpoint it chose on its `3P telemetry` lines.
- **Codex** gets `otel.trace_exporter` through `-c`, and managed configuration outranks `-c`. `codex exec` waits on a piped stdin, so add `</dev/null` when no terminal is attached.
