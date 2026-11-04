# Work through a task

1. **Read.** Find the code and the docs the task touches before you plan.
2. **Plan with the user.** When a behavior changes or the request leaves a real choice, write the plan and ask about the choice. A small fix needs no plan.
3. **Change.** Keep one concern in each commit, and put tests beside the code.
4. **Verify.** Run the narrowest check that exercises the change, such as `pnpm nx test api`.
5. **Review.** Run the `review` sub-agent on the diff. Fix each finding, or answer it with evidence.
6. **Report.** Say what you ran and what it showed.

## When the same mistake repeats

Fix the setup, not only the code. Add the rule to an instruction, a skill or a check, so the next session cannot repeat it.
