import { execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const FAILED = ["FAILURE", "ERROR", "TIMED_OUT", "STARTUP_FAILURE", "ACTION_REQUIRED"];
const READY = ["CLEAN", "HAS_HOOKS"];
const MAX_INTERVAL = 300;
const MAX_READ_FAILURES = 5;
const MAX_TEXT = 300;
const QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) { pullRequest(number: $number) {
    state mergeStateStatus author { login }
    commits(last: 1) { nodes { commit { statusCheckRollup { contexts(first: 100) { nodes {
      ... on CheckRun { name conclusion detailsUrl }
      ... on StatusContext { name: context conclusion: state detailsUrl: targetUrl }
    } } } } } }
    reviewThreads(last: 100) { nodes {
      isResolved path line originalLine
      comments(last: 1) { nodes { author { login } body url } }
    } }
  } }
}`;

const number = process.argv[2];
if (!/^\d+$/.test(number ?? "")) {
  console.error("Usage: scripts/watch-pr <number>");
  process.exit(2);
}
const interval = Math.min(Number(process.env.WATCH_PR_INTERVAL ?? 30), MAX_INTERVAL);
const deadline = Date.now() + Number(process.env.WATCH_PR_TIMEOUT ?? 3600) * 1000;

function read() {
  const args = ["api", "graphql", "-F", "owner={owner}", "-F", "name={repo}"];
  args.push("-F", `number=${number}`, "-f", `query=${QUERY}`);
  const { data } = JSON.parse(execFileSync("gh", args, { encoding: "utf8", stdio: "pipe" }));
  return data.repository.pullRequest;
}

function commentLine(pr) {
  for (const { isResolved, path, line, originalLine, comments } of pr.reviewThreads.nodes) {
    const latest = comments.nodes[0];
    const author = latest?.author?.login ?? "ghost";
    if (!isResolved && latest && author !== pr.author.login) {
      const text = latest.body.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
      return `comment ${path}:${line ?? originalLine} ${author}: ${text} ${latest.url}`;
    }
  }
  return null;
}

function failedCheckLine(pr) {
  const rollup = pr.commits.nodes[0]?.commit.statusCheckRollup;
  const failed = rollup?.contexts.nodes.find(({ conclusion }) => FAILED.includes(conclusion));
  return failed ? `check failed: ${failed.name} ${failed.detailsUrl}` : null;
}

function actionableLine(pr) {
  if (pr.state !== "OPEN") return `pull request #${number} is ${pr.state.toLowerCase()}`;
  return (
    commentLine(pr) ??
    failedCheckLine(pr) ??
    (pr.mergeStateStatus === "DIRTY" ? `pull request #${number} conflicts with its base` : null) ??
    (READY.includes(pr.mergeStateStatus) ? `pull request #${number} is mergeable` : null)
  );
}

let failures = 0;
while (Date.now() < deadline) {
  try {
    const line = actionableLine(read());
    failures = 0;
    if (line) {
      console.log(line);
      process.exit(0);
    }
  } catch (error) {
    failures++;
    if (failures >= MAX_READ_FAILURES) {
      console.log(`cannot read pull request #${number}: ${error.message.split("\n")[0]}`);
      process.exit(1);
    }
  }
  await sleep(interval * 1000);
}
console.log(`pull request #${number} still has nothing to act on, watch again`);
process.exit(1);
