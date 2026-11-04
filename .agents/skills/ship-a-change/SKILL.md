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
6. Run `gh pr checks --watch`. It exits when the checks finish.
7. Read comments with `gh pr view --comments`. Fix confirmed issues in one push.
8. Report the pull request link, the checks and any open finding.
