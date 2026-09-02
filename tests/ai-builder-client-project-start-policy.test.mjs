import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  advanceClientProjectSessionEpoch,
  clearClientProjectRuntimeState,
  isCurrentClientProjectSessionEpoch,
} from "../src/ai-builder/client-project-start-policy.js";

test("saved draft -> start new -> unrelated business leaves no prior-project residue", () => {
  const state = {
    clientIntakeSessionEpoch: 4,
    clientIntakeSession: { requestId: "old-request", draft: { businessName: "Bath All Day" } },
    clientIntakeLastSyncedSnapshot: "bath-all-day-snapshot",
    currentSchema: { business: { name: "Bath All Day" } },
    currentRequestId: "old-request",
    currentSiteId: "site-bath",
    currentBusinessId: "business-bath",
    currentGenerationId: "generation-bath",
    currentCatalogItems: [{ name: "Jabones" }, { name: "Velas" }],
    guidedState: {
      businessName: "Bath All Day",
      servicesProducts: ["Jabones", "Velas", "Bombas de bano"],
    },
  };
  const staleRequestEpoch = state.clientIntakeSessionEpoch;

  advanceClientProjectSessionEpoch(state);
  clearClientProjectRuntimeState(state, {
    businessName: "",
    businessDescription: "",
    servicesProducts: [],
    contactInfo: {},
  });
  Object.assign(state.guidedState, {
    businessName: "Turbo Parts VE",
    businessDescription: "Repuestos y piezas para carros.",
    servicesProducts: ["Filtros", "Frenos", "Aceite", "Bujias"],
  });

  assert.equal(isCurrentClientProjectSessionEpoch(staleRequestEpoch, state.clientIntakeSessionEpoch), false);
  assert.equal(isCurrentClientProjectSessionEpoch(state.clientIntakeSessionEpoch, state.clientIntakeSessionEpoch), true);
  assert.equal(state.currentSchema, null);
  assert.equal(state.currentSiteId, null);
  assert.equal(state.currentBusinessId, null);
  assert.equal(state.currentGenerationId, null);
  assert.deepEqual(state.currentCatalogItems, []);
  assert.equal(state.clientIntakeSession, null);
  assert.equal(state.clientIntakeLastSyncedSnapshot, "");
  assert.equal(JSON.stringify(state).includes("Bath All Day"), false);
  assert.equal(JSON.stringify(state).includes("Jabones"), false);
  assert.equal(state.guidedState.businessName, "Turbo Parts VE");
});

test("OAuth account switch keeps the request created after its reset", () => {
  const authSource = readFileSync(new URL("../src/ai-builder/auth.js", import.meta.url), "utf8");
  const functionStart = authSource.indexOf("export async function createOrResumeClientIntakeSession");
  const functionEnd = authSource.indexOf("export function syncClientIntakeSession", functionStart);
  const source = authSource.slice(functionStart, functionEnd);

  assert.ok(source.indexOf("resetGuidedStateForNewAccount") >= 0);
  assert.ok(
    source.indexOf("const requestEpoch = builderState.clientIntakeSessionEpoch")
      > source.indexOf("resetGuidedStateForNewAccount"),
  );
  assert.match(authSource, /if \(!session\) return null;[\s\S]*?if \(storageStatus\)/);
});

test("template preview palette lookup cannot abort OAuth resume during mixed cache loads", () => {
  const indexSource = readFileSync(new URL("../src/ai-builder/index.js", import.meta.url), "utf8");
  assert.match(indexSource, /TEMPLATE_PREVIEW_PALETTES\?\.\[normalizeTemplateId\(templateId\)\]/);
});
