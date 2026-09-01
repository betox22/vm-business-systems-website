import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createSharedSiteMotion,
  isMotionInteractionBlocked,
  motionDataAttributes,
  normalizeSectionMotion,
  supportsSharedSiteMotion,
} from "../src/ai-builder/shared-site-motion.js";

const viewer = readFileSync(new URL("../site-viewer.js", import.meta.url), "utf8");
const stageScript = readFileSync(new URL("../scripts/stage-public-site.mjs", import.meta.url), "utf8");

test("only the two pilot templates opt into the shared motion engine", () => {
  assert.equal(supportsSharedSiteMotion("mega-retail-store"), true);
  assert.equal(supportsSharedSiteMotion("b2b-saas-enterprise-pro"), true);
  assert.equal(supportsSharedSiteMotion("premium-product-store"), false);
});

test("motion metadata must contain a concrete conversion goal", () => {
  const valid = normalizeSectionMotion({
    animate: true,
    conversionGoal: "Focus the visitor on the primary offer",
    trigger: "load",
    target: "headline_and_cta",
    treatment: "hero_enter",
  });
  const decorative = normalizeSectionMotion({
    animate: true,
    conversionGoal: "none",
    trigger: "scroll",
    target: "section_content",
    treatment: "stagger_cards",
  });

  assert.equal(valid.animate, true);
  assert.deepEqual(decorative, {
    animate: false,
    conversionGoal: "none",
    trigger: "none",
    target: "none",
    treatment: "static",
  });
  assert.match(motionDataAttributes(valid), /data-motion-goal="Focus the visitor/);
});

test("reduced motion never loads GSAP and leaves the page static", async () => {
  let appended = false;
  const root = { querySelector: () => ({}) };
  const controller = createSharedSiteMotion({
    root,
    templateId: "mega-retail-store",
    windowRef: { matchMedia: () => ({ matches: true }) },
    documentRef: { head: { appendChild: () => { appended = true; } } },
  });

  assert.equal(await controller.ready, false);
  assert.equal(controller.active, false);
  assert.equal(appended, false);
});

test("inline editing blocks motion feedback on the active text or CTA", () => {
  assert.equal(isMotionInteractionBlocked({ isContentEditable: true }), true);
  assert.equal(isMotionInteractionBlocked({ isContentEditable: false, closest: () => ({ className: "is-inline-editing" }) }), true);
  assert.equal(isMotionInteractionBlocked({ isContentEditable: false, closest: () => null }), false);
});

test("the public renderer uses one local lazy GSAP asset for both pilots", () => {
  assert.match(viewer, /createSharedSiteMotion/);
  assert.match(viewer, /renderB2BSaasPublicHero[\s\S]*motionDataAttributes/);
  assert.match(viewer, /renderMegaRetailPublicBento[\s\S]*motionDataAttributes/);
  assert.match(stageScript, /"shared-site-motion\.js"/);
  assert.match(stageScript, /node_modules\/gsap\/dist\/gsap\.min\.js/);
  const motionSource = readFileSync(new URL("../src/ai-builder/shared-site-motion.js", import.meta.url), "utf8");
  assert.match(motionSource, /force3D: true/);
  assert.doesNotMatch(motionSource, /cdnjs|unpkg|jsdelivr/);
});
