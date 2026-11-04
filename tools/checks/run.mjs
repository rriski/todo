import { noApiCallsOutsideClient, noAppImportsInPackages } from "./boundaries.mjs";
import { noLargeFiles } from "./hygiene.mjs";
import { repoFiles } from "./lib.mjs";
import { exportsExist } from "./package-exports.mjs";
import { countsOnlyFall } from "./ratchet.mjs";
import { docsFollowDiataxis, foldersStaySmall } from "./structure.mjs";
import { noBranchesInTests, testNamesDescribeBehavior } from "./test-quality.mjs";

const checks = {
  "repository hygiene": [noLargeFiles],
  "names and structure": [foldersStaySmall, docsFollowDiataxis],
  "architecture boundaries": [noAppImportsInPackages, noApiCallsOutsideClient],
  "test quality": [noBranchesInTests, testNamesDescribeBehavior],
  "package exports": [exportsExist],
  ratchet: [countsOnlyFall],
};

const files = repoFiles();
let failures = 0;
for (const [category, rules] of Object.entries(checks)) {
  for (const { file, line, message } of rules.flatMap((rule) => rule(files))) {
    console.log(`${file}:${line ?? 1} [${category}] ${message}`);
    failures++;
  }
}
process.exit(failures ? 1 : 0);
