import assert from "node:assert/strict";
import test from "node:test";

import {
  missingRequiredGuidedSteps,
  resolveWebsiteIntentBackfill,
  websiteIntentQuestionKey,
} from "../src/ai-builder/guided-intent-policy.js";

const restoredBrief = {
  websiteIntent: "",
  businessName: "Mi Mundo 3D",
  businessDescription: "Vendo impresoras 3D, accesorios, materiales y cursos online.",
  servicesProducts: ["Impresoras 3D", "Accesorios", "Materiales", "Cursos online"],
};

test("backfills an orphaned websiteIntent from a rich draft correction", () => {
  const message = "Vendo impresoras 3D, accesorios para impresoras 3D, materiales y equipos para imprimir, y tambien vendo cursos online de como hacer los productos.";
  assert.equal(resolveWebsiteIntentBackfill({
    websiteIntent: "",
    message,
    businessDescription: restoredBrief.businessDescription,
    messageIsRich: true,
  }), message);
});

test("does not report websiteIntent missing when the restored brief already satisfies it", () => {
  assert.deepEqual(
    missingRequiredGuidedSteps(restoredBrief, ["websiteIntent", "businessName", "businessDescription"]),
    [],
  );
});

test("uses the short website-intent follow-up for a complete business brief", () => {
  assert.equal(websiteIntentQuestionKey(restoredBrief), "websiteIntentFollowUp");
  assert.notEqual(websiteIntentQuestionKey(restoredBrief), "websiteIntent");
});
