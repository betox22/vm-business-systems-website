import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/inject-cache-bust.mjs", import.meta.url));

test("published client setup versions its own CSS alongside builder assets", () => {
  const root = mkdtempSync(join(tmpdir(), "kreaton-cache-bust-"));
  try {
    mkdirSync(join(root, "public-dist", "client", "setup"), { recursive: true });
    writeFileSync(
      join(root, "public-dist", "client", "setup", "index.html"),
      '<link href="/ai-builder.css?v=108"><link href="/client-setup.css?v=62"><script src="/ai-builder.js?v=108"></script>',
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const html = readFileSync(join(root, "public-dist", "client", "setup", "index.html"), "utf8");
    const versions = [...html.matchAll(/(?:ai-builder\.css|client-setup\.css|ai-builder\.js)\?v=([^"']+)/g)]
      .map((match) => match[1]);
    assert.equal(versions.length, 3);
    assert.equal(new Set(versions).size, 1);
    assert.notEqual(versions[0], "62");
    assert.notEqual(versions[0], "108");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
