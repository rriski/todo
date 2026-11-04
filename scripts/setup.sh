#!/bin/sh
set -eu

pnpm install
pnpm exec playwright install chromium

git config core.hooksPath .githooks
git config merge.mergiraf.name mergiraf
git config merge.mergiraf.driver 'mergiraf merge --git %O %A %B -s %S -x %X -y %Y -p %P -l %L'
