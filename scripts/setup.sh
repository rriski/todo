#!/bin/sh
set -eu

pnpm install
pnpm exec playwright install chromium
