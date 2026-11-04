import { readFileSync } from "node:fs";
import { matchingLines } from "./lib.mjs";

const RATCHET = "ratchet.json";
const CODE = /^(apps|packages)\/.*\.(ts|tsx|go)$/;
const COUNTED = {
  suppressions: /nolint|oxlint-disable|@ts-ignore|@ts-expect-error/,
  "skipped-tests": /\.(skip|only)\(|t\.Skip\(/,
  "todo-comments": /\b(TODO|FIXME)\b/,
};

export function countsOnlyFall(files) {
  const recorded = JSON.parse(readFileSync(RATCHET, "utf8"));
  const code = files.filter((file) => CODE.test(file));
  return Object.entries(COUNTED).flatMap(([name, pattern]) => {
    const count = code.flatMap((file) => matchingLines(file, pattern)).length;
    if (count > recorded[name]) {
      const message = `${name} grew from ${recorded[name]} to ${count}. Fix the new finding instead of counting it.`;
      return [{ file: RATCHET, message }];
    }
    if (count < recorded[name]) {
      const message = `${name} fell from ${recorded[name]} to ${count}. Lower it in ${RATCHET} so it cannot grow back.`;
      return [{ file: RATCHET, message }];
    }
    return [];
  });
}
