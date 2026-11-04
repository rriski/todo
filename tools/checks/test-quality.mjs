import { matchingLines } from "./lib.mjs";

const TEST = /\.(test|spec)\.tsx?$/;
const BRANCH = /^\s*(?:\}\s*else\s+)?if\s*\(/;
const TITLE = /\b(?:it|test)\(\s*["'`]([^"'`]+)["'`]/;
const MIN_TITLE_WORDS = 3;

export function noBranchesInTests(files) {
  return files
    .filter((file) => TEST.test(file))
    .flatMap((file) => matchingLines(file, BRANCH))
    .map(({ file, line }) => ({
      file,
      line,
      message: "A test must not branch with if. Assert with a matcher, or split it with it.each.",
    }));
}

export function testNamesDescribeBehavior(files) {
  return files
    .filter((file) => TEST.test(file))
    .flatMap((file) => matchingLines(file, TITLE))
    .filter(({ text }) => text.match(TITLE)[1].trim().split(/\s+/).length < MIN_TITLE_WORDS)
    .map(({ file, line, text }) => ({
      file,
      line,
      message: `"${text.match(TITLE)[1]}" does not name a behavior. Say what the code does, in ${MIN_TITLE_WORDS} words or more.`,
    }));
}
