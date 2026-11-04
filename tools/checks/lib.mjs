import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

export function repoFiles() {
  const args = ["ls-files", "--cached", "--others", "--exclude-standard"];
  const output = execFileSync("git", args, { encoding: "utf8" });
  return output.trim().split("\n").filter(existsSync);
}

export function matchingLines(file, pattern) {
  return readFileSync(file, "utf8")
    .split("\n")
    .flatMap((text, index) => (pattern.test(text) ? [{ file, line: index + 1, text }] : []));
}
