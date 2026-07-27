import { build } from "esbuild";
import { resolve } from "node:path";

const rootDir = process.cwd();

await build({
  absWorkingDir: rootDir,
  entryPoints: ["./src/ai-builder/index.js"],
  outfile: resolve(rootDir, "dist/ai-builder.js"),
  bundle: false,
  minify: false,
  sourcemap: false,
  logLevel: "warning",
});
