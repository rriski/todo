import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { attribute, ensureReceiver, makeSpan, post, readSpans, startMs } from "./otlp.mjs";

const runId = process.argv[2];
if (!/^\d+$/.test(runId ?? "")) stop("Usage: scripts/ci-trace <run-id>");

const api = (path) => JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8" }));
const ms = (time) => new Date(time).getTime();
const id = (...seed) => createHash("sha256").update(seed.join("/")).digest("hex").slice(0, 16);
const failed = ({ conclusion }) => (["success", "skipped"].includes(conclusion) ? 0 : 1);

function stop(message) {
  console.error(message);
  process.exit(1);
}

function findPush(run) {
  const pushes = readSpans()
    .filter((span) => span.name === "pre-push")
    .toSorted((a, b) => startMs(b) - startMs(a));
  const onBranch = (branch) =>
    pushes.find((span) => attribute(span, "vcs.ref.head.name") === branch);
  return (
    pushes.find((span) => attribute(span, "vcs.ref.head.revision") === run.head_sha) ??
    onBranch(run.head_branch) ??
    api(`repos/{owner}/{repo}/commits/${run.head_sha}/pulls`)
      .map((pull) => onBranch(pull.head.ref))
      .find(Boolean)
  );
}

const run = api(`repos/{owner}/{repo}/actions/runs/${runId}`);
if (run.status !== "completed") stop(`Run ${runId} is ${run.status}. Wait until it finishes.`);
const push = findPush(run);
if (!push) stop(`No pre-push span for ${run.head_sha} or ${run.head_branch}. It was not traced.`);

const { traceId } = push;
const seed = [runId, run.run_attempt];
const workflowId = id(...seed);
const spans = [
  makeSpan({
    traceId,
    parentId: attribute(push, "change.root_span_id") ?? push.parentSpanId,
    spanId: workflowId,
    name: `workflow ${run.name}`,
    start: ms(run.run_started_at),
    end: ms(run.updated_at),
    exitCode: failed(run),
    attributes: {
      "cicd.pipeline.run.id": runId,
      "cicd.pipeline.result": run.conclusion,
      "vcs.ref.head.revision": run.head_sha,
    },
  }),
];
for (const job of api(`repos/{owner}/{repo}/actions/runs/${runId}/jobs?per_page=100`).jobs) {
  if (!job.started_at || !job.completed_at) continue;
  const jobId = id(...seed, job.id);
  spans.push(
    makeSpan({
      traceId,
      parentId: workflowId,
      spanId: jobId,
      name: `job ${job.name}`,
      start: ms(job.started_at),
      end: ms(job.completed_at),
      exitCode: failed(job),
      attributes: { "cicd.pipeline.task.queue_ms": ms(job.started_at) - ms(job.created_at) },
    }),
  );
  for (const step of job.steps ?? []) {
    if (!step.started_at || !step.completed_at) continue;
    spans.push(
      makeSpan({
        traceId,
        parentId: jobId,
        spanId: id(...seed, job.id, step.number),
        name: `step ${step.name}`,
        start: ms(step.started_at),
        end: Math.max(ms(step.started_at), ms(step.completed_at)),
        exitCode: failed(step),
      }),
    );
  }
}

const delivered = (await ensureReceiver()) && (await post("github-actions", spans));
if (!delivered) stop("The receiver did not take the spans.");
console.log(`${traceId} ${spans.length} spans from run ${runId}`);
