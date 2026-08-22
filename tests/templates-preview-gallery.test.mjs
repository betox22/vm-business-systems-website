import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const gallery = fs.readFileSync(new URL("../templates-preview/index.html", import.meta.url), "utf8");
const demos = fs.readFileSync(new URL("../templates-preview/template-demo-data.js", import.meta.url), "utf8");

test("B2B SaaS and Mega Retail use dedicated responsive captures and interactive previews", () => {
  for (const template of ["b2b-saas-enterprise-pro", "mega-retail-store"]) {
    assert.match(gallery, new RegExp(`screenshots/${template.replace(/-pro$/, "")}-desktop\\.png`));
    assert.match(gallery, new RegExp(`screenshots/${template.replace(/-pro$/, "")}-mobile\\.png`));
    assert.match(gallery, new RegExp(`\\?template=${template}`));
    assert.match(gallery, new RegExp(`live-preview\\.html\\?template=${template}`));
    assert.match(demos, new RegExp(`"${template}"`));
  }
});
