#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, relative } from "node:path";
import { hookSpan } from "../../tools/trace/otlp.mjs";

const MAX_LINES = 10;
const MAX_BLOCKS = 3;

const GENERATED = [
  [/^pnpm-lock\.yaml$/, "Change package.json and run pnpm install."],
  [/(^|\/)go\.sum$/, "Change go.mod and run go mod tidy."],
  [/^flake\.lock$/, "Run nix flake update."],
  [/(^|\/)dist\//, "Change the source and run the build."],
  [/__screenshots__\//, "Run pnpm nx e2e web-e2e --update-snapshots."],
];

const handlers = { SessionStart, PreToolUse, PostToolUse, SubagentStop };
const input = JSON.parse(readFileSync(0, "utf8"));
process.chdir(run("git", ["-C", input.cwd, "rev-parse", "--show-toplevel"]).output.trim());
const started = Date.now();
const exitCode = handlers[input.hook_event_name]?.();
if (exitCode !== undefined) await hookSpan(`hook ${input.hook_event_name}`, started, exitCode);

function SessionStart() {
  const missing = [];
  if (!existsSync("node_modules")) missing.push("node_modules");
  if (run("git", ["config", "core.hooksPath"]).output.trim() !== ".githooks")
    missing.push("git hooks");
  for (const tool of ["go", "pnpm", "vale", "golangci-lint", "mergiraf"]) {
    if (!run("which", [tool]).ok) missing.push(tool);
  }
  const setup = missing.length
    ? `Setup is incomplete, ${missing.join(", ")} missing. Run direnv allow, then ./scripts/setup.sh.`
    : "Setup is complete.";
  const branch = run("git", ["branch", "--show-current"]).output.trim();
  const behind = run("git", ["rev-list", "--count", "HEAD..origin/main"]);
  const state = behind.ok
    ? `Branch ${branch} is ${behind.output.trim()} commits behind origin/main.`
    : `Branch ${branch} has no origin/main to compare with.`;
  addContext(`${setup}\n${state}\n\n${readFileSync(".agents/workflow.md", "utf8")}`);
}

function PreToolUse() {
  for (const file of editedFiles()) {
    const match = GENERATED.find(([pattern]) => pattern.test(file));
    if (match) {
      console.error(`${file} is generated. ${match[1]}`);
      process.exit(2);
    }
  }
}

function PostToolUse() {
  const errors = editedFiles().flatMap(formatAndLint);
  if (errors.length) addContext(errors.slice(0, MAX_LINES).join("\n"));
  return errors.length ? 1 : 0;
}

function SubagentStop() {
  const state = `.scratch/hooks/${input.agent_id}`;
  const blocks = existsSync(state) ? Number(readFileSync(state, "utf8")) : 0;
  if (blocks >= MAX_BLOCKS) return 0;
  const checks = run("./scripts/affected.sh", []);
  if (checks.ok) return 0;
  mkdirSync(dirname(state), { recursive: true });
  writeFileSync(state, String(blocks + 1));
  const errors = checks.output.trim().split("\n").slice(-40).join("\n");
  const reason = `Pre-push checks failed (block ${blocks + 1} of ${MAX_BLOCKS}). Fix these:\n${errors}`;
  console.log(JSON.stringify({ decision: "block", reason }));
  return 1;
}

function formatAndLint(file) {
  if (!existsSync(file)) return [];
  if (/\.(ts|tsx|mjs)$/.test(file)) {
    run("node_modules/.bin/oxfmt", ["--write", file]);
    return issues(
      run("node_modules/.bin/oxlint", ["--fix", "--format=unix", file]),
      /^\S+:\d+:\d+:/,
    );
  }
  if (file.endsWith(".go")) {
    run("gofmt", ["-w", file]);
    const lint = run(
      "golangci-lint",
      [
        "run",
        "--output.text.path=stdout",
        "--output.text.print-issued-lines=false",
        "--show-stats=false",
      ],
      dirname(file),
    );
    return issues(lint, new RegExp(`^${basename(file)}:`)).map(
      (line) => `${dirname(file)}/${line}`,
    );
  }
  if (file.endsWith(".md")) {
    return issues(run("vale", ["--output=line", file]), /^\S+:\d+:\d+:/);
  }
  return [];
}

function editedFiles() {
  const { file_path: path, command = "" } = input.tool_input ?? {};
  const patched = [...command.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm)].map(
    (match) => match[1],
  );
  return (path ? [path] : patched).map((file) => relative(process.cwd(), file));
}

function issues(result, pattern) {
  return result.output.split("\n").filter((line) => pattern.test(line));
}

function addContext(additionalContext) {
  const hookEventName = input.hook_event_name;
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext } }));
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}
