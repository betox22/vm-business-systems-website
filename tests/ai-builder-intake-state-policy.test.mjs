import assert from "node:assert/strict";
import test from "node:test";

import {
  isStrongNewBusinessBrief,
  resolveBackendMissingSteps,
} from "../src/ai-builder/intake-state-policy.js";

test("recognizes the Mi Mundo 3D free-paragraph brief as a new project", () => {
  const message = "Vendo impresoras 3D, accesorios para impresoras 3D, materiales y equipos para imprimir, y tambien vendo cursos online de como hacer los productos. Se llama Mi Mundo 3D. Vendo todo online.";
  assert.equal(isStrongNewBusinessBrief({
    message,
    isRich: true,
    businessName: "Mi Mundo 3D",
    offerings: ["Impresoras 3D", "Accesorios", "Materiales", "Cursos online"],
    salesMode: "online_sales",
  }), true);
});

test("does not reset a restored project for a normal detailed follow-up", () => {
  assert.equal(isStrongNewBusinessBrief({
    message: "También quiero que la página explique que entregamos rápido y que damos soporte después de la compra.",
    isRich: true,
    businessName: "",
    offerings: [],
    salesMode: "",
  }), false);
});

test("preserves an unmapped backend missing slot instead of falling back to websiteIntent", () => {
  assert.deepEqual(resolveBackendMissingSteps({
    backendMissingFields: ["warehouse_location"],
    mapField: () => "",
    guidedStep: "review",
  }), ["warehouse_location"]);
});

test("uses a neutral clarification when backend reports no slot", () => {
  assert.deepEqual(resolveBackendMissingSteps({
    backendMissingFields: [],
    guidedStep: "review",
  }), ["backendClarification"]);
});
