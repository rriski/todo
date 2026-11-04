# Run the checks

Run the unit tests and builds of every project:

```sh
pnpm nx run-many -t test build
```

Check the TypeScript types:

```sh
pnpm nx run-many -t typecheck
```

Run the browser test. It starts the page and the API:

```sh
pnpm nx e2e web-e2e
```

Run the lint rules, tests and type checks for what your change affects:

```sh
pnpm nx affected -t lint test typecheck --base=main
```

Run every lint rule. [Checks](../reference/checks.md) lists them by category:

```sh
pnpm nx run-many -t lint
```
