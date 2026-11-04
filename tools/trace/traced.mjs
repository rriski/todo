import { activeContext, anyContext, runTraced } from "./otlp.mjs";

const args = process.argv.slice(2);
const ifActive = args[0] === "--if-active";
const [name, separator, ...command] = ifActive ? args.slice(1) : args;
if (!name || separator !== "--" || !command.length) {
  console.error("Usage: scripts/traced [--if-active] <name> -- <command>");
  process.exit(2);
}
const parent = ifActive ? activeContext() : anyContext();
process.exit(await runTraced("local-gates", name, command, parent));
