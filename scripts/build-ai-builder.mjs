import { build } from "esbuild";
import { resolve } from "node:path";

const rootDir = process.cwd();

await build({
  absWorkingDir: rootDir,
  alias: {
    "@kreaton/shared-commerce-cart": resolve(rootDir, "shared-commerce-cart.js"),
  },
  entryPoints: [resolve(rootDir, "src/ai-builder/index.js")],
  outfile: resolve(rootDir, "dist/ai-builder.js"),
  bundle: true,
  minify: false,
  sourcemap: false,
  logLevel: "warning",
});
