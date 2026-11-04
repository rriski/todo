# Traces

OpenTelemetry traces of real changes in this repository, exported with `scripts/trace-export`.

| File | What it shows | Spans |
| --- | --- | --- |
| `due-dates.json` | PR #2: the due dates change, from the first plan to the dev deploy | 1123 |
| `nightly-fix.json` | PR #5: an agent reads the nightly issue and fixes the staged bug | 159 |
| `subagent-gate.json` | PR #6: a sub-agent works and the gate passes | 411 |
| `staged-gate-block.json` | Staged, not pushed: the gate blocks a lint error | 26 |
| `staged-refusal.json` | Staged, not pushed: a hook refuses an edit to a generated file | 20 |

Each span has `id`, `name`, `parent`, `service`, `depth`, `start`, `duration`, `status` and `kind`. `start` and `duration` are in milliseconds.

The export leaves out span attributes, so prompts, file paths, accounts and hosts are not here. Step names of GitHub Actions runs come from the public workflows.
