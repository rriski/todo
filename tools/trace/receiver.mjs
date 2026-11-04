import { appendFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { createGunzip } from "node:zlib";
import { ENDPOINT, TRACES } from "./otlp.mjs";

const TRACE_ID = /^[0-9a-f]{32}$/;

function store(payload) {
  for (const { resource, scopeSpans } of payload.resourceSpans ?? []) {
    const service = resource?.attributes?.find(({ key }) => key === "service.name")?.value
      ?.stringValue;
    for (const { spans } of scopeSpans ?? []) {
      for (const span of spans ?? []) {
        if (TRACE_ID.test(span.traceId)) {
          appendFileSync(
            `${TRACES}/${span.traceId}.jsonl`,
            `${JSON.stringify({ service, ...span })}\n`,
          );
        }
      }
    }
  }
}

function answer(response, status, request, note = "") {
  console.log(`${new Date().toISOString()} ${request.method} ${request.url} ${status} ${note}`);
  response.writeHead(status, { "content-type": "application/json" });
  response.end("{}");
}

mkdirSync(TRACES, { recursive: true });

const server = createServer((request, response) => {
  const type = request.headers["content-type"] ?? "";
  if (request.method !== "POST") return answer(response, 200, request);
  if (!type.includes("json")) return answer(response, 415, request, `unsupported ${type}`);
  const gzipped = request.headers["content-encoding"] === "gzip";
  const body = gzipped ? request.pipe(createGunzip()) : request;
  const chunks = [];
  body.on("data", (chunk) => chunks.push(chunk));
  body.on("error", () => answer(response, 400, request, "bad gzip"));
  body.on("end", () => {
    try {
      const payload = Buffer.concat(chunks);
      if (request.url === "/v1/traces") store(JSON.parse(payload.toString()));
      answer(response, 200, request, `${payload.length} bytes`);
    } catch (error) {
      answer(response, 400, request, error.message);
    }
  });
});

server.listen(Number(new URL(ENDPOINT).port), "127.0.0.1");
