import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { fakeGh, script, startReceiver, storedSpans } from "./fixture.mjs";

const TRACE = "a".repeat(32);
const AMBIENT_TRACE = "b".repeat(32);
const ROOT_SPAN = "1".repeat(16);
const PARENT_SPAN = "2".repeat(16);
const ROOT_DIR = new URL("../..", import.meta.url).pathname;
const attr = (span, key) => span.attributes.find((entry) => entry.key === key)?.value.stringValue;

function startChange(env) {
  const change = { name: "change", traceId: TRACE, rootId: ROOT_SPAN, start: Date.now() };
  mkdirSync(env.TRACE_SCRATCH, { recursive: true });
  writeFileSync(`${env.TRACE_SCRATCH}/current-trace`, JSON.stringify(change));
}

const SHA = "f".repeat(40);

const step = (number, name, conclusion, started_at, completed_at) => ({
  number,
  name,
  conclusion,
  started_at,
  completed_at,
});

async function withPush(attributes) {
  const receiver = await startReceiver();
  const span = {
    traceId: TRACE,
    spanId: PARENT_SPAN,
    name: "pre-push",
    startTimeUnixNano: "1000000",
    endTimeUnixNano: "2000000",
    attributes: Object.entries({ "change.root_span_id": ROOT_SPAN, ...attributes }).map(
      ([key, value]) => ({ key, value: { stringValue: value } }),
    ),
  };
  await fetch(`${receiver.env.TRACE_ENDPOINT}/v1/traces`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans: [span] }] }] }),
  });
  return receiver;
}

const storedSpan = (spanId, parentSpanId, name, startMs, durationMs, code = 1) => ({
  traceId: TRACE,
  spanId,
  parentSpanId,
  name,
  kind: 1,
  status: { code },
  startTimeUnixNano: `${startMs}000000`,
  endTimeUnixNano: `${startMs + durationMs}000000`,
});

describe("with a receiver", () => {
  let receiver;
  let env;
  before(async () => {
    receiver = await startReceiver();
    env = receiver.env;
  });
  after(() => receiver.stop());

  it("stores posted spans by trace id and refuses protobuf", async () => {
    const span = { traceId: TRACE, spanId: PARENT_SPAN, name: "posted" };
    const resource = { attributes: [{ key: "service.name", value: { stringValue: "demo" } }] };
    const body = { resourceSpans: [{ resource, scopeSpans: [{ spans: [span] }] }] };
    const headers = { "content-type": "application/json" };
    const url = `${env.TRACE_ENDPOINT}/v1/traces`;
    const posted = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const binary = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-protobuf" },
      body: "x",
    });
    assert.equal(posted.status, 200);
    assert.equal(binary.status, 415);
    assert.deepEqual(storedSpans(env.TRACE_SCRATCH, TRACE)[0].service, "demo");
  });

  it("joins the current TRACEPARENT and passes a child on", () => {
    const traceId = "c".repeat(32);
    const traced = script("traced", ["step", "--", "printenv", "TRACEPARENT"], {
      ...env,
      TRACEPARENT: `00-${traceId}-${PARENT_SPAN}-01`,
    });
    const [span] = storedSpans(env.TRACE_SCRATCH, traceId);
    assert.equal(span.parentSpanId, PARENT_SPAN);
    assert.equal(traced.stdout.trim(), `00-${traceId}-${span.spanId}-01`);
  });

  it("mints a trace when none is active", () => {
    const traced = script("traced", ["step", "--", "printenv", "TRACEPARENT"], env);
    const traceId = traced.stdout.split("-")[1];
    const [span] = storedSpans(env.TRACE_SCRATCH, traceId);
    assert.equal(span.parentSpanId, "");
  });

  it("records a failing exit status and returns it", () => {
    const traceId = "d".repeat(32);
    const traced = script("traced", ["bad", "--", "sh", "-c", "exit 3"], {
      ...env,
      TRACEPARENT: `00-${traceId}-${PARENT_SPAN}-01`,
    });
    const [span] = storedSpans(env.TRACE_SCRATCH, traceId);
    assert.equal(traced.status, 3);
    assert.equal(attr(span, "process.exit_code"), "3");
    assert.equal(span.status.code, 2);
  });

  it("if-active runs the command without a span when no change is active", () => {
    const traceId = "e".repeat(32);
    const traced = script("traced", ["--if-active", "hook", "--", "sh", "-c", "exit 4"], {
      ...env,
      TRACEPARENT: `00-${traceId}-${PARENT_SPAN}-01`,
    });
    assert.equal(traced.status, 4);
    assert.equal(traced.stdout + traced.stderr, "");
    assert.equal(existsSync(`${env.TRACE_SCRATCH}/traces/${traceId}.jsonl`), false);
  });

  it("an active change wins over an ambient TRACEPARENT from another trace", async () => {
    const scoped = await startReceiver();
    startChange(scoped.env);
    script("traced", ["--if-active", "hook", "--", "true"], {
      ...scoped.env,
      TRACEPARENT: `00-${AMBIENT_TRACE}-${PARENT_SPAN}-01`,
    });
    const [span] = storedSpans(scoped.env.TRACE_SCRATCH, TRACE);
    scoped.stop();
    assert.equal(span.parentSpanId, ROOT_SPAN);
    assert.equal(attr(span, "change.root_span_id"), ROOT_SPAN);
  });

  it("an agent hook records a span only while a change is active", async () => {
    const scoped = await startReceiver();
    const input = JSON.stringify({
      hook_event_name: "PostToolUse",
      cwd: ROOT_DIR,
      tool_input: { file_path: `${ROOT_DIR}README.txt` },
    });
    const hook = () =>
      spawnSync("node", [".agents/hooks/hook.mjs"], {
        cwd: ROOT_DIR,
        input,
        encoding: "utf8",
        env: { ...process.env, ...scoped.env },
      });
    const silent = hook();
    assert.equal(silent.stdout + silent.stderr, "");
    assert.equal(existsSync(`${scoped.env.TRACE_SCRATCH}/traces/${TRACE}.jsonl`), false);
    startChange(scoped.env);
    assert.equal(hook().status, 0);
    const [span] = storedSpans(scoped.env.TRACE_SCRATCH, TRACE);
    scoped.stop();
    assert.equal(span.name, "hook PostToolUse");
    assert.equal(span.service, "agent-hooks");
  });

  it("trace-change shares one trace through start, run and end", async () => {
    const scoped = await startReceiver();
    const started = script("trace-change", ["start", "demo"], scoped.env);
    const traceId = started.stdout.trim();
    const running = script("trace-change", ["run", "printenv", "TRACEPARENT"], scoped.env);
    const ended = script("trace-change", ["end"], scoped.env);
    const spans = storedSpans(scoped.env.TRACE_SCRATCH, traceId);
    scoped.stop();
    const root = spans.find(({ name }) => name === "demo");
    const run = spans.find(({ name }) => name === "run printenv");
    assert.equal(ended.stdout.trim(), traceId);
    assert.equal(running.stdout.trim(), `00-${traceId}-${run.spanId}-01`);
    assert.equal(run.parentSpanId, root.spanId);
    assert.equal(existsSync(`${scoped.env.TRACE_SCRATCH}/current-trace`), false);
  });
});

describe("ci-trace", () => {
  const RUN = {
    name: "ci",
    status: "completed",
    conclusion: "failure",
    run_attempt: 1,
    head_sha: SHA,
    head_branch: "feature",
    run_started_at: "2026-11-04T10:00:00Z",
    updated_at: "2026-11-04T10:05:00Z",
  };
  const JOBS = {
    jobs: [
      {
        id: 9,
        name: "checks",
        conclusion: "failure",
        created_at: "2026-11-04T10:00:01Z",
        started_at: "2026-11-04T10:00:11Z",
        completed_at: "2026-11-04T10:04:50Z",
        steps: [
          step(1, "lint", "success", "2026-11-04T10:00:12Z", "2026-11-04T10:01:00Z"),
          step(2, "test", "failure", "2026-11-04T10:01:00Z", "2026-11-04T10:04:40Z"),
          step(3, "never ran", "skipped", null, null),
        ],
      },
    ],
  };

  it("writes backdated run, job and step spans under the change root", async () => {
    const receiver = await withPush({ "vcs.ref.head.revision": SHA });
    const gh = fakeGh([RUN, JOBS]);
    const traced = script("ci-trace", ["123"], { ...receiver.env, ...gh });
    const spans = storedSpans(receiver.env.TRACE_SCRATCH, TRACE);
    receiver.stop();
    const byName = Object.fromEntries(spans.map((span) => [span.name, span]));
    assert.equal(traced.status, 0, traced.stderr);
    assert.equal(byName["workflow ci"].parentSpanId, ROOT_SPAN);
    assert.equal(
      byName["workflow ci"].startTimeUnixNano,
      `${Date.parse(RUN.run_started_at)}000000`,
    );
    assert.equal(byName["job checks"].parentSpanId, byName["workflow ci"].spanId);
    assert.equal(byName["step test"].parentSpanId, byName["job checks"].spanId);
    assert.equal(byName["step test"].status.code, 2);
    assert.equal(byName["step lint"].status.code, 1);
    assert.equal(byName["step never ran"], undefined);
    assert.equal(attr(byName["job checks"], "cicd.pipeline.task.queue_ms"), "10000");
  });

  it("finds the trace by branch after a rebase changed the sha", async () => {
    const receiver = await withPush({ "vcs.ref.head.name": "feature" });
    const traced = script("ci-trace", ["123"], { ...receiver.env, ...fakeGh([RUN, JOBS]) });
    receiver.stop();
    assert.equal(traced.status, 0, traced.stderr);
    assert.match(traced.stdout, new RegExp(`^${TRACE} 4 spans`));
  });

  it("finds the trace of a deploy run through the commit's pull request", async () => {
    const receiver = await withPush({ "vcs.ref.head.name": "feature" });
    const deploy = { ...RUN, name: "deploy", head_branch: "main" };
    const pulls = [{ head: { ref: "feature" } }];
    const gh = fakeGh([deploy, pulls, JOBS]);
    const traced = script("ci-trace", ["124"], { ...receiver.env, ...gh });
    receiver.stop();
    assert.equal(traced.status, 0, traced.stderr);
    assert.match(gh.calls()[1], /commits\/f+\/pulls/);
  });

  it("gives every span the same id when run twice", async () => {
    const receiver = await withPush({ "vcs.ref.head.revision": SHA });
    script("ci-trace", ["123"], { ...receiver.env, ...fakeGh([RUN, JOBS]) });
    script("ci-trace", ["123"], { ...receiver.env, ...fakeGh([RUN, JOBS]) });
    const stats = script("trace-stats", ["--json"], receiver.env);
    receiver.stop();
    const workflow = JSON.parse(stats.stdout).find(({ name }) => name === "workflow ci");
    assert.equal(workflow.count, 1);
  });

  it("refuses a run that has not finished", async () => {
    const receiver = await withPush({ "vcs.ref.head.revision": SHA });
    const running = { ...RUN, status: "in_progress" };
    const traced = script("ci-trace", ["123"], { ...receiver.env, ...fakeGh([running]) });
    receiver.stop();
    assert.equal(traced.status, 1);
    assert.match(traced.stderr, /is in_progress/);
  });

  it("says so when no push was traced", async () => {
    const receiver = await startReceiver();
    const gh = fakeGh([{ ...RUN, head_branch: "other", head_sha: "0" }, []]);
    const traced = script("ci-trace", ["123"], { ...receiver.env, ...gh });
    receiver.stop();
    assert.equal(traced.status, 1);
    assert.match(traced.stderr, /It was not traced/);
  });
});

describe("stored traces", () => {
  const SPANS = [
    storedSpan("c1", "r1", "child late", 500, 100, 2),
    storedSpan("c0", "r1", "child early", 100, 200),
    storedSpan("g0", "c0", "grandchild", 150, 50),
    storedSpan("r1", "gone", "root", 0, 1000),
    ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((ms, index) =>
      storedSpan(`s${index}`, "", "repeat", 2000 + ms, ms),
    ),
  ];
  let receiver;
  before(async () => {
    receiver = await startReceiver();
    mkdirSync(`${receiver.env.TRACE_SCRATCH}/traces`, { recursive: true });
    const lines = SPANS.map((entry) => JSON.stringify(entry)).join("\n");
    writeFileSync(`${receiver.env.TRACE_SCRATCH}/traces/${TRACE}.jsonl`, `${lines}\n`);
  });
  after(() => receiver.stop());

  it("trace-stats reports p50 and p90 per name as JSON", () => {
    const stats = JSON.parse(script("trace-stats", ["--json"], receiver.env).stdout);
    const repeat = stats.find(({ name }) => name === "repeat");
    assert.deepEqual(repeat, { name: "repeat", count: 10, p50_ms: 50, p90_ms: 90 });
  });

  it("trace-stats prints a plain table", () => {
    const { stdout } = script("trace-stats", [], receiver.env);
    assert.match(stdout, /^name\s+count\s+p50 ms\s+p90 ms\n/);
    assert.match(stdout, /repeat\s+10\s+50\s+90\n/);
  });

  it("trace-export orders parents before children, then by start", () => {
    const { stdout } = script("trace-export", [TRACE], receiver.env);
    const { spans } = JSON.parse(readFileSync(stdout.trim(), "utf8"));
    const names = spans.map(({ name }) => name).slice(0, 4);
    assert.deepEqual(names, ["root", "child early", "grandchild", "child late"]);
    const { name, parent, start, duration, status, kind } = spans[3];
    assert.deepEqual(
      { name, parent, start, duration, status, kind },
      {
        name: "child late",
        parent: "r1",
        start: 500,
        duration: 100,
        status: "error",
        kind: "internal",
      },
    );
  });

  it("trace-export draws a text waterfall", () => {
    const { stdout } = script("trace-export", [TRACE, "--text"], receiver.env);
    const [first, second] = stdout.split("\n");
    assert.match(first, /^root +#+ +1\.00s ok$/);
    assert.match(second, /^ {2}child early/);
  });

  it("trace-export fails on an unknown trace", () => {
    const missing = script("trace-export", ["0".repeat(32)], receiver.env);
    assert.equal(missing.status, 1);
  });
});
