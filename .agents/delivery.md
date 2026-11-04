# Deliver a change

1. Work on a branch. Keep main linear.
2. Write commit subjects as `type(scope): summary`, such as `feat(api): add the tasks API`.
3. Run the `review` sub-agent before the first push.
4. Push. The pre-push hook stops a branch that is behind `origin/main` and checks what the change affects. Never skip it with `--no-verify`.
5. Open a pull request that says what changed and how you checked it.
6. Comment `@coderabbitai review` on its own line when the author wants an outside review.
7. Stay with the pull request until it merges: wait for checks, fix failures and confirmed comments in one push.

CI runs every check again. A hook can be skipped, and CI cannot.
