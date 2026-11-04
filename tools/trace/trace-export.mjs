import { writeFileSync } from "node:fs";
import { durationMs, readSpans, startMs, TRACES } from "./otlp.mjs";

const STATUS = ["unset", "ok", "error"];
const KIND = ["unspecified", "internal", "server", "client", "producer", "consumer"];
const BAR_WIDTH = 40;

const [traceId, format] = process.argv.slice(2);
if (!traceId) {
  console.error("Usage: scripts/trace-export <trace-id> [--text]");
  process.exit(2);
}
const spans = readSpans(traceId);
if (!spans.length) {
  console.error(`No spans stored for trace ${traceId}.`);
  process.exit(1);
}

const ids = new Set(spans.map(({ spanId }) => spanId));
const children = Map.groupBy(spans, ({ parentSpanId }) =>
  ids.has(parentSpanId) ? parentSpanId : "",
);
const origin = Math.min(...spans.map(startMs));
const ordered = [];
(function visit(parent, depth) {
  const siblings = (children.get(parent) ?? []).toSorted((a, b) => startMs(a) - startMs(b));
  for (const span of siblings) {
    ordered.push({
      id: span.spanId,
      name: span.name,
      parent: span.parentSpanId,
      service: span.service,
      depth,
      start: startMs(span) - origin,
      duration: durationMs(span),
      status: STATUS[span.status?.code ?? 0],
      kind: KIND[span.kind ?? 0],
    });
    visit(span.spanId, depth + 1);
  }
})("", 0);

if (format === "--text") {
  const total = Math.max(...ordered.map(({ start, duration }) => start + duration));
  const width = Math.max(...ordered.map(({ name, depth }) => name.length + depth * 2));
  for (const { name, depth, start, duration, status } of ordered) {
    const left = Math.floor((start / total) * BAR_WIDTH);
    const bar = "#".repeat(Math.max(1, Math.round((duration / total) * BAR_WIDTH)));
    const label = `${"  ".repeat(depth)}${name}`.padEnd(width);
    const seconds = `${(duration / 1000).toFixed(2)}s`.padStart(9);
    console.log(
      `${label} ${" ".repeat(left)}${bar}`.padEnd(width + BAR_WIDTH + 2) + `${seconds} ${status}`,
    );
  }
} else {
  const file = `${TRACES}/${traceId}.export.json`;
  const started = new Date(origin).toISOString();
  writeFileSync(file, `${JSON.stringify({ traceId, started, spans: ordered }, null, 2)}\n`);
  console.log(file);
}
