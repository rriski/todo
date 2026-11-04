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

Check the docs:

```sh
vale docs
```
