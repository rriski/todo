import { matchingLines } from "./lib.mjs";

const TYPESCRIPT = /\.tsx?$/;
const TEST = /\.(test|spec)\.tsx?$/;
const APP_IMPORT = /from\s+["'](?:[./]*apps\/|web["'/])/;
const API_CALL = /\bfetch\(|["'`]\/api\//;
const API_CLIENT = "apps/web/src/api.ts";

export function noAppImportsInPackages(files) {
  return files
    .filter((file) => file.startsWith("packages/") && TYPESCRIPT.test(file))
    .flatMap((file) => matchingLines(file, APP_IMPORT))
    .map(({ file, line }) => ({
      file,
      line,
      message: "A package must not import an app. Move the shared code into a package.",
    }));
}

export function noApiCallsOutsideClient(files) {
  return files
    .filter((file) => file.startsWith("apps/web/src/") && TYPESCRIPT.test(file))
    .filter((file) => file !== API_CLIENT && !TEST.test(file))
    .flatMap((file) => matchingLines(file, API_CALL))
    .map(({ file, line }) => ({
      file,
      line,
      message: `Reach the API only through ${API_CLIENT}. Add a function there and call it.`,
    }));
}
