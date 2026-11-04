import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

function targets(exports) {
  if (typeof exports === "string") return [exports];
  return Object.values(exports ?? {}).flatMap(targets);
}

export function exportsExist(files) {
  return files
    .filter((file) => file.endsWith("package.json"))
    .flatMap((file) =>
      targets(JSON.parse(readFileSync(file, "utf8")).exports)
        .filter((target) => !existsSync(join(dirname(file), target)))
        .map((target) => ({
          file,
          message: `The exports field points at ${target}, which does not exist. Fix the path or remove the entry.`,
        })),
    );
}
