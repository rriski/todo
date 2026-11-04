#!/bin/sh
set -eu

base=origin/main
git rev-parse --quiet --verify "$base" >/dev/null || base=main

pnpm nx affected -t lint typecheck test --base="$base" --output-style=static
