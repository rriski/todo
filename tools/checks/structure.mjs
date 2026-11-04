import { dirname } from "node:path";

const MAX_CODE_FILES = 20;
const CODE = /\.(ts|tsx|go|mjs)$/;
const DOC_FOLDERS = /^docs\/(README\.md|(tutorials|how-to|reference|explanation)\/)/;

export function foldersStaySmall(files) {
  const counts = Map.groupBy(
    files.filter((file) => CODE.test(file)),
    dirname,
  );
  return [...counts].flatMap(([folder, code]) =>
    code.length > MAX_CODE_FILES
      ? [
          {
            file: folder,
            message: `This folder holds ${code.length} code files, over the limit of ${MAX_CODE_FILES}. Split it by responsibility.`,
          },
        ]
      : [],
  );
}

export function docsFollowDiataxis(files) {
  return files
    .filter((file) => file.startsWith("docs/") && !DOC_FOLDERS.test(file))
    .map((file) => ({
      file,
      message: "Move this page into docs/tutorials, how-to, reference or explanation.",
    }));
}
