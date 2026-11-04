import { durationMs, readSpans } from "./otlp.mjs";

const percentile = (sorted, p) => sorted[Math.ceil((p / 100) * sorted.length) - 1];
const cell = (value) => String(value).padStart(10);
const round = (ms) => Math.round(ms * 10) / 10;

const byName = Map.groupBy(readSpans(), (span) => span.name);
const stats = [...byName]
  .map(([name, spans]) => {
    const sorted = spans.map(durationMs).toSorted((a, b) => a - b);
    return {
      name,
      count: sorted.length,
      p50_ms: round(percentile(sorted, 50)),
      p90_ms: round(percentile(sorted, 90)),
    };
  })
  .toSorted((a, b) => b.p90_ms - a.p90_ms);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(stats, null, 2));
} else {
  const width = Math.max(4, ...stats.map(({ name }) => name.length));
  console.log(`${"name".padEnd(width)} ${cell("count")} ${cell("p50 ms")} ${cell("p90 ms")}`);
  for (const { name, count, p50_ms, p90_ms } of stats) {
    console.log(`${name.padEnd(width)} ${cell(count)} ${cell(p50_ms)} ${cell(p90_ms)}`);
  }
}
