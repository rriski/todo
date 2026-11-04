import { statSync } from "node:fs";

const LIMIT_KB = 512;

export function noLargeFiles(files) {
  return files.flatMap((file) => {
    const kb = Math.ceil(statSync(file).size / 1024);
    if (kb <= LIMIT_KB) return [];
    const message = `This file is ${kb} KB, over the ${LIMIT_KB} KB limit. Generate it in a test, or keep it outside the repository.`;
    return [{ file, message }];
  });
}
