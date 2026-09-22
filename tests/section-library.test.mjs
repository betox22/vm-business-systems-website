import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const library = join(root, "templates", "sections");
const source = readFileSync(join(root, "backend", "app", "agents.py"), "utf8");
const catalogSource = source.split("TEMPLATE_CATALOG:")[1].split("\n\ndef template_catalog_for_state")[0];
const catalog = Object.fromEntries(
  [...catalogSource.matchAll(/^    "([a-z][a-z0-9-]+)": \{\s*"name": "([^"]+)"/gm)]
    .map((match) => [match[1], match[2]]),
);
const roles = new Set(["hero_candidate", "product_card", "texture_atmosphere", "process_shot", "portrait"]);
const keys = ["id", "section_type", "source_template", "eligibility", "required_copy_fields", "image_slots", "animation_profile", "html_partial", "css_partial"];
const standaloneSections = new Map([["quote-upload--custom-order", "Custom Order"]]);

test("section library covers the current template catalog with complete standalone partials", () => {
  const directories = readdirSync(library).filter((name) => statSync(join(library, name)).isDirectory());
  assert.ok(directories.length >= Object.keys(catalog).length);
  const covered = new Set();
  for (const directory of directories) {
    const manifest = JSON.parse(readFileSync(join(library, directory, "manifest.json"), "utf8"));
    assert.deepEqual(Object.keys(manifest), keys, directory);
    assert.equal(manifest.id, directory);
    const templateId = Object.keys(catalog).find((id) => directory.startsWith(`${id}--`));
    assert.ok(templateId || standaloneSections.has(directory), directory);
    assert.equal(manifest.source_template, templateId ? catalog[templateId] : standaloneSections.get(directory));
    assert.deepEqual(Object.keys(manifest.eligibility), ["requires_archetype"]);
    assert.ok(manifest.eligibility.requires_archetype === null || typeof manifest.eligibility.requires_archetype === "string");
    assert.equal(typeof manifest.section_type, "string");
    assert.equal(typeof manifest.animation_profile, "string");
    assert.equal(manifest.html_partial, `${directory}/section.html`);
    assert.equal(manifest.css_partial, `${directory}/section.css`);
    const html = readFileSync(join(library, manifest.html_partial), "utf8");
    const css = readFileSync(join(library, manifest.css_partial), "utf8");
    assert.ok(html.startsWith(`<div class="rendered-site template-${templateId || "custom-order"}">`), directory);
    assert.ok(css.trim(), directory);
    assert.ok(!html.includes("SECTION_COPY_") && !html.includes("SECTION_BUSINESS_"), directory);
    for (const field of manifest.required_copy_fields) {
      assert.equal(typeof field, "string");
      assert.ok(html.includes(`{{${field}}}`), `${directory}: ${field}`);
    }
    for (const slot of manifest.image_slots) {
      assert.deepEqual(Object.keys(slot), ["slot_id", "image_role", "min", "max"]);
      assert.ok(roles.has(slot.image_role), `${directory}: ${slot.image_role}`);
      assert.ok(Number.isInteger(slot.min) && Number.isInteger(slot.max) && slot.min >= 0 && slot.max >= slot.min);
      assert.ok(html.includes(`{{${slot.slot_id}}}`), `${directory}: ${slot.slot_id}`);
    }
    if (templateId) covered.add(templateId);
  }
  assert.deepEqual([...covered].sort(), Object.keys(catalog).sort());
});
