---
name: ship-a-change
description: Takes a finished change to a green pull request. Use when asked to ship, push or open a pull request.
---

# Ship a change

1. Run `pnpm nx affected -t lint typecheck test --base=origin/main`. Fix what fails.
2. Run the `review` sub-agent. It reads the diff with fresh context and reports against `REVIEW.md`.
3. Fix each finding, or answer it with evidence.
4. Run `git push -u origin HEAD`. If the pre-push hook rebased the branch, run the same command again with `--force-with-lease`.
5. Run `gh pr create --fill`.
6. Run `scripts/watch-pr <number>` in the background. It reads GitHub every 30 seconds and exits with one line when a check fails, the pull request conflicts or becomes mergeable, or an unresolved review comment's latest reply is not from the author. Its exit wakes you.
7. Act on that line. Fix confirmed issues in one push. Answer or resolve a comment's thread, or the watcher stops on it again. Repeat from step 6 until the line says the pull request is mergeable.
8. Report the pull request link, the checks and any open finding.
