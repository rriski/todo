import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fakeGh, script } from "./fixture.mjs";

const AUTHOR = { login: "rriski" };

function response(overrides = {}) {
  const { checks = [], threads = [], ...pr } = overrides;
  const contexts = { nodes: checks };
  const pullRequest = {
    state: "OPEN",
    mergeStateStatus: "BLOCKED",
    author: AUTHOR,
    commits: { nodes: [{ commit: { statusCheckRollup: { contexts } } }] },
    reviewThreads: { nodes: threads },
    ...pr,
  };
  return { data: { repository: { pullRequest } } };
}

const thread = (login, body, overrides = {}) => ({
  isResolved: false,
  path: "apps/api/store.go",
  line: 42,
  originalLine: 40,
  comments: { nodes: [{ author: { login }, body, url: "https://example.test/c/1" }] },
  ...overrides,
});
const check = (name, conclusion) => ({
  name,
  conclusion,
  detailsUrl: `https://example.test/${name}`,
});

function watch(responses, env = {}) {
  const gh = fakeGh(responses);
  const result = script("watch-pr", ["7"], { WATCH_PR_INTERVAL: "0", ...gh, ...env });
  return { ...result, calls: gh.calls() };
}

describe("watch-pr exits with one line when", () => {
  it("a check fails", () => {
    const { status, stdout } = watch([
      response({ checks: [check("lint", "SUCCESS"), check("test", "FAILURE")] }),
    ]);
    assert.equal(status, 0);
    assert.equal(stdout, "check failed: test https://example.test/test\n");
  });

  it("a legacy status errors", () => {
    const { stdout } = watch([response({ checks: [check("ci/legacy", "ERROR")] })]);
    assert.equal(stdout, "check failed: ci/legacy https://example.test/ci/legacy\n");
  });

  it("the pull request becomes mergeable", () => {
    const { stdout } = watch([response({ mergeStateStatus: "CLEAN" })]);
    assert.equal(stdout, "pull request #7 is mergeable\n");
  });

  it("an unresolved comment's latest author is not the pull request author", () => {
    const body = "Handle the\nempty title.";
    const { stdout } = watch([response({ threads: [thread("coderabbitai", body)] })]);
    assert.equal(
      stdout,
      "comment apps/api/store.go:42 coderabbitai: Handle the empty title. https://example.test/c/1\n",
    );
  });

  it("a comment sits on an outdated line", () => {
    const threads = [thread("reviewer", "Why?", { line: null })];
    const { stdout } = watch([response({ threads })]);
    assert.match(stdout, /^comment apps\/api\/store\.go:40 reviewer: Why\?/);
  });

  it("the branch conflicts with its base", () => {
    const { stdout } = watch([response({ mergeStateStatus: "DIRTY" })]);
    assert.equal(stdout, "pull request #7 conflicts with its base\n");
  });

  it("the pull request was merged", () => {
    const { stdout } = watch([response({ state: "MERGED" })]);
    assert.equal(stdout, "pull request #7 is merged\n");
  });
});

describe("watch-pr keeps waiting when", () => {
  const then = response({ mergeStateStatus: "CLEAN" });

  it("checks are still running", () => {
    const pending = response({ checks: [check("test", null)], mergeStateStatus: "UNSTABLE" });
    const { calls, stdout } = watch([pending, pending, then]);
    assert.equal(calls.length, 3);
    assert.equal(stdout, "pull request #7 is mergeable\n");
  });

  it("the latest comment is the author's own", () => {
    const { calls } = watch([response({ threads: [thread("rriski", "Fixed.")] }), then]);
    assert.equal(calls.length, 2);
  });

  it("the thread is resolved", () => {
    const threads = [thread("coderabbitai", "Nit.", { isResolved: true })];
    const { calls } = watch([response({ threads }), then]);
    assert.equal(calls.length, 2);
  });

  it("one read fails", () => {
    const { calls, stdout } = watch([{ not: "json the script can use" }, then]);
    assert.equal(calls.length, 2);
    assert.equal(stdout, "pull request #7 is mergeable\n");
  });
});

describe("watch-pr gives up with exit 1 when", () => {
  it("reads keep failing", () => {
    const { status, calls, stdout } = watch([{ broken: true }]);
    assert.equal(status, 1);
    assert.equal(calls.length, 5);
    assert.match(stdout, /^cannot read pull request #7/);
  });

  it("the time limit passes", () => {
    const { status, stdout } = watch([response()], { WATCH_PR_TIMEOUT: "1" });
    assert.equal(status, 1);
    assert.match(stdout, /watch again/);
  });
});

it("watch-pr asks GitHub for the repository of the checkout", () => {
  const { calls } = watch([response({ mergeStateStatus: "CLEAN" })]);
  assert.match(calls[0], /^api graphql -F owner=\{owner\} -F name=\{repo\} -F number=7 /);
});
