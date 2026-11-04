#!/bin/bash
set -uo pipefail

logs=.scratch/nightly
mkdir -p "$logs"
summary=$logs/summary.md
echo "# Nightly $(date -u +%F)" > "$summary"
failed=0

check() {
  name=$1
  shift
  if "$@" --output-style=static 2>&1 | tee "$logs/$name.log"; then
    echo "- $name: passed" >> "$summary"
  else
    failed=1
    {
      echo "- $name: **failed**"
      echo '  ```text'
      tail -n 30 "$logs/$name.log" | sed 's/^/  /'
      echo '  ```'
    } >> "$summary"
  fi
}

check e2e pnpm nx run-many -t e2e
check fuzz pnpm nx fuzz api --fuzztime="${FUZZ_TIME:-5m}"
check mutation pnpm nx run-many -t mutation

cat "$summary" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"

gh label create nightly --force --description "Nightly run results"
issue=$(gh issue list --label nightly --state open --json number --jq '.[0].number // empty')

if [ "$failed" = 0 ]; then
  if [ -n "$issue" ]; then gh issue close "$issue" --comment "Nightly passed on $(date -u +%F)."; fi
elif [ -n "$issue" ]; then
  gh issue edit "$issue" --body-file "$summary"
else
  gh issue create --title "Nightly failures" --label nightly --body-file "$summary"
fi

exit "$failed"
