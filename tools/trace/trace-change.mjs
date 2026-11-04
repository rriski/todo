import { rmSync, writeFileSync } from "node:fs";
import {
  activeChange,
  activeContext,
  CURRENT,
  ENDPOINT,
  ensureReceiver,
  makeSpan,
  newId,
  post,
  runTraced,
} from "./otlp.mjs";

const AGENT_ENV = {
  CLAUDE_CODE_ENABLE_TELEMETRY: "1",
  CLAUDE_CODE_ENHANCED_TELEMETRY_BETA: "1",
  OTEL_TRACES_EXPORTER: "otlp",
  OTEL_METRICS_EXPORTER: "none",
  OTEL_LOGS_EXPORTER: "none",
  OTEL_EXPORTER_OTLP_PROTOCOL: "http/json",
  OTEL_EXPORTER_OTLP_ENDPOINT: ENDPOINT,
  OTEL_TRACES_EXPORT_INTERVAL: "1000",
};
const CODEX_TRACES = `otel.trace_exporter={otlp-http={endpoint="${ENDPOINT}/v1/traces",protocol="json"}}`;

function stop(message) {
  console.error(message);
  process.exit(2);
}

const verbs = {
  async start(name) {
    if (!name) stop("Usage: scripts/trace-change start <name>");
    if (activeChange()) stop("A change is already active. Run scripts/trace-change end first.");
    if (!(await ensureReceiver())) stop(`No receiver answers at ${ENDPOINT}.`);
    const change = { name, traceId: newId(16), rootId: newId(8), start: Date.now() };
    writeFileSync(CURRENT, `${JSON.stringify(change)}\n`);
    console.log(change.traceId);
  },
  async run(...command) {
    const parent = activeContext();
    if (!command.length) stop("Usage: scripts/trace-change run <command>");
    if (!parent) stop("No active change. Run scripts/trace-change start <name> first.");
    const argv =
      command[0] === "codex" ? ["codex", "-c", CODEX_TRACES, ...command.slice(1)] : command;
    process.exit(await runTraced("delivery", `run ${command[0]}`, argv, parent, AGENT_ENV));
  },
  async end() {
    const change = activeChange();
    if (!change) stop("No active change.");
    const { name, traceId, rootId: spanId, start } = change;
    await post("delivery", [makeSpan({ traceId, spanId, name, start, end: Date.now() })]);
    rmSync(CURRENT);
    console.log(traceId);
  },
};

const [verb, ...args] = process.argv.slice(2);
if (!verbs[verb]) stop("Usage: scripts/trace-change start <name> | run <command> | end");
await verbs[verb](...args);
