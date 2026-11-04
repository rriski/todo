#!/bin/bash
set -euo pipefail

tag=${1:?usage: deploy-dev.sh <tag>}
health_path=${HEALTH_PATH:-/healthz}
state=.scratch/deploy
url=http://localhost:8081

start() {
  docker rm --force todo-api todo-web >/dev/null 2>&1 || true
  docker run --detach --name todo-api --network todo-dev "todo-api:$1" >/dev/null
  docker run --detach --name todo-web --network todo-dev --publish 8081:80 "todo-web:$1" >/dev/null
}

healthy() {
  for _ in {1..30}; do
    if curl --silent --fail --max-time 2 "$url$1" >/dev/null; then return 0; fi
    sleep 1
  done
  return 1
}

mkdir -p "$state"
docker network create todo-dev >/dev/null 2>&1 || true

previous=""
if [ -f "$state/tag" ]; then
  previous=$(cat "$state/tag")
  docker load --quiet --input "$state/images.tar"
fi

docker build --quiet --target api --tag "todo-api:$tag" .
docker build --quiet --target web --tag "todo-web:$tag" .

echo "deploy: starting $tag"
start "$tag"

if healthy "$health_path"; then
  docker save --output "$state/images.tar" "todo-api:$tag" "todo-web:$tag"
  echo "$tag" > "$state/tag"
  echo "deploy: $tag is healthy"
  exit 0
fi

echo "deploy: $tag failed its check on $health_path"
if [ -z "$previous" ]; then
  echo "deploy: no previous image to roll back to"
  exit 1
fi

start "$previous"
healthy /healthz
echo "deploy: rolled back to $previous, which is healthy"
exit 1
