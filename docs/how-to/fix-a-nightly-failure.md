# Fix a nightly failure

The nightly run keeps one open issue with the label `nightly`. It closes the issue when a run passes.

1. Read the failures:

   ```sh
   gh issue list --label nightly
   gh issue view <number>
   ```

2. Run the failing check on your machine:

   | Failure | Command |
   | --- | --- |
   | e2e | `pnpm nx e2e web-e2e` |
   | fuzz | `pnpm nx fuzz api`; the artifact holds the failing input for `apps/api/testdata` |
   | mutation | `pnpm nx run-many -t mutation`; a surviving mutant names the line a test does not check |

3. Fix the code, or strengthen the test, and open a pull request.

The next nightly run closes the issue.
