# Add your first task

In this tutorial you run the app and add a task. It takes about five minutes.

1. Install the packages: `pnpm install`.
2. Start the page and the API: `pnpm nx run-many -t serve -p api web`.
3. Open <http://localhost:5173>. The page says "No tasks yet."
4. Type "Buy milk" and press Add. The task appears in the list.
5. Tick the checkbox. The task is now complete.
6. Restart the API and reload the page. The list is empty again, because the API keeps tasks in memory.

Next, [run the checks](../how-to/run-the-checks.md).
