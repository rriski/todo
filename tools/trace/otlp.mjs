import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = resolve(import.meta.dirname, "../..");
const SCRATCH = process.env.TRACE_SCRATCH ?? `${ROOT}/.scratch`;
export const TRACES = `${SCRATCH}/traces`;
export const CURRENT = `${SCRATCH}/current-trace`;
export const ENDPOINT = process.env.TRACE_ENDPOINT ?? "http://localhost:4318";

export const newId = (bytes) => randomBytes(bytes).toString("hex");
export const traceparent = (traceId, spanId) => `00-${traceId}-${spanId}-01`;

function envContext() {
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-/.exec(process.env.TRACEPARENT ?? "");
  return match ? { traceId: match[1], parentId: match[2] } : null;
}

export function activeChange() {
  return existsSync(CURRENT) ? JSON.parse(readFileSync(CURRENT, "utf8")) : null;
}

// The change file beats an ambient TRACEPARENT from another trace, such as an interactive agent session.
export function activeContext() {
  const change = activeChange();
  if (!change) return null;
  const env = envContext();
  const parentId = env?.traceId === change.traceId ? env.parentId : change.rootId;
  return { traceId: change.traceId, parentId, rootId: change.rootId };
}

export const anyContext = () =>
  activeContext() ?? envContext() ?? { traceId: newId(16), parentId: "" };

export function makeSpan({ traceId, parentId, spanId, name, start, end, exitCode, attributes }) {
  return {
    traceId,
    spanId: spanId ?? newId(8),
    parentSpanId: parentId ?? "",
    name,
    kind: 1,
    startTimeUnixNano: `${start}000000`,
    endTimeUnixNano: `${end}000000`,
    status: { code: exitCode ? 2 : 1 },
    attributes: Object.entries({ "process.exit_code": exitCode ?? 0, ...attributes }).map(
      ([key, value]) => ({ key, value: { stringValue: String(value) } }),
    ),
  };
}

export async function post(service, spans) {
  const resource = { attributes: [{ key: "service.name", value: { stringValue: service } }] };
  const body = { resourceSpans: [{ resource, scopeSpans: [{ scope: { name: "todo" }, spans }] }] };
  try {
    const response = await fetch(`${ENDPOINT}/v1/traces`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function headRef() {
  const git = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD", "HEAD"], { encoding: "utf8" });
  const [name, revision] = git.stdout?.trim().split("\n") ?? [];
  return revision ? { "vcs.ref.head.name": name, "vcs.ref.head.revision": revision } : {};
}

export async function runTraced(service, name, command, parent, env = {}) {
  const spanId = newId(8);
  const start = Date.now();
  const { status } = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      ...(parent && { TRACEPARENT: traceparent(parent.traceId, spanId) }),
    },
  });
  const exitCode = status ?? 1;
  if (parent) {
    const attributes = {
      ...headRef(),
      ...(parent.rootId && { "change.root_span_id": parent.rootId }),
    };
    const end = Date.now();
    await post(service, [makeSpan({ ...parent, spanId, name, start, end, exitCode, attributes })]);
  }
  return exitCode;
}

export async function hookSpan(name, start, exitCode) {
  const parent = activeContext();
  if (parent)
    await post("agent-hooks", [makeSpan({ ...parent, name, start, end: Date.now(), exitCode })]);
}

const listening = () =>
  fetch(ENDPOINT, { signal: AbortSignal.timeout(300) }).then(
    () => true,
    () => false,
  );

export async function ensureReceiver() {
  mkdirSync(TRACES, { recursive: true });
  if (await listening()) return true;
  const log = openSync(`${SCRATCH}/receiver.log`, "a");
  const receiver = `${import.meta.dirname}/receiver.mjs`;
  spawn(process.execPath, [receiver], { detached: true, stdio: ["ignore", log, log] }).unref();
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await listening()) return true;
    await sleep(100);
  }
  return false;
}

export function readSpans(traceId) {
  const files = existsSync(TRACES) ? readdirSync(TRACES) : [];
  const wanted = files.filter((file) =>
    traceId ? file === `${traceId}.jsonl` : file.endsWith(".jsonl"),
  );
  const spans = wanted
    .flatMap((file) => readFileSync(`${TRACES}/${file}`, "utf8").split("\n"))
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return [...new Map(spans.map((span) => [span.spanId, span])).values()];
}

export const attribute = (span, key) => {
  const value = span.attributes?.find((entry) => entry.key === key)?.value;
  return value && Object.values(value)[0];
};
export const startMs = (span) => Number(BigInt(span.startTimeUnixNano) / 1_000_000n);
export const durationMs = (span) =>
  Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1e6;
