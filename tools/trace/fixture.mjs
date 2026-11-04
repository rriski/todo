import { spawn, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = resolve(import.meta.dirname, "../..");

const FAKE_GH = `#!/bin/sh
echo "$*" | tr '\\n' ' ' >> "$FAKE_GH/calls"
echo >> "$FAKE_GH/calls"
n=$(wc -l < "$FAKE_GH/calls" | tr -d ' ')
[ -f "$FAKE_GH/$n.json" ] || n=last
[ -f "$FAKE_GH/$n.json" ] || { echo "HTTP 502" >&2; exit 1; }
cat "$FAKE_GH/$n.json"
`;

const freePort = () =>
  new Promise((done) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => done(port));
    });
  });

export const tempDir = () => mkdtempSync(`${tmpdir()}/todo-trace-`);

// Each response answers one gh call in order, and the last one repeats.
export function fakeGh(responses) {
  const dir = tempDir();
  writeFileSync(`${dir}/gh`, FAKE_GH);
  chmodSync(`${dir}/gh`, 0o755);
  responses.forEach((response, index) => {
    const name = index === responses.length - 1 ? "last" : index + 1;
    writeFileSync(`${dir}/${name}.json`, JSON.stringify(response));
  });
  return {
    FAKE_GH: dir,
    PATH: `${dir}:${process.env.PATH}`,
    calls: () => readFileSync(`${dir}/calls`, "utf8").trim().split("\n"),
  };
}

export function script(name, args = [], env = {}, input = "") {
  const { TRACEPARENT: _ambient, ...inherited } = process.env;
  return spawnSync(`${ROOT}/scripts/${name}`, args, {
    cwd: ROOT,
    encoding: "utf8",
    input,
    env: { ...inherited, ...env },
  });
}

export async function startReceiver() {
  const scratch = tempDir();
  const env = {
    TRACE_SCRATCH: scratch,
    TRACE_ENDPOINT: `http://localhost:${await freePort()}`,
  };
  const receiver = spawn(`${ROOT}/scripts/trace-receiver`, [], {
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 50; attempt++) {
    const up = await fetch(env.TRACE_ENDPOINT).then(
      () => true,
      () => false,
    );
    if (up) break;
    await sleep(50);
  }
  return { env, stop: () => receiver.kill() };
}

export const storedSpans = (scratch, traceId) =>
  readFileSync(`${scratch}/traces/${traceId}.jsonl`, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
