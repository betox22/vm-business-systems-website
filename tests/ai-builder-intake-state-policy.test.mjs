import assert from "node:assert/strict";
import test from "node:test";

import {
  hasOnlineSalesSignal,
  isStrongNewBusinessBrief,
  resolveBackendMissingSteps,
  shouldStartCleanBusinessProject,
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

test("starts a clean project when a loaded site receives a rich brief for a different business", () => {
  const correction = "Quiero crear una tienda nueva y diferente llamada Turbo Parts VE. Vendemos repuestos y piezas de carro usados y nuevos, filtros, frenos, aceite, bujias. Vendemos online con envio a todo el pais y tambien recibimos clientes en el taller fisico en Caracas. Estilo moderno, oscuro, agresivo, para mecanicos y dueños de carros.";
  const isStrongNewBrief = isStrongNewBusinessBrief({
    message: correction,
    isRich: true,
    businessName: "Turbo Parts VE",
    offerings: ["Repuestos", "Filtros", "Frenos", "Aceite", "Bujias"],
    salesMode: "online_sales",
  });
  assert.equal(isStrongNewBrief, true);
  assert.equal(shouldStartCleanBusinessProject({
    isPublicClientSetup: true,
    isStrongNewBrief,
    incomingBusinessName: "Turbo Parts VE",
    existingBusinessName: "Mi Mundo 3D",
    hasCurrentSchema: true,
    hasRestoredDraft: true,
    hasExistingContext: true,
  }), true);
});

test("starts Bath All Day cleanly over a loaded Mi Mundo 3D project", () => {
  const message = "quiero vender en linea mi linea de jabones velas y bombas de bano, el negocio se llama bath all day";
  const isStrongNewBrief = isStrongNewBusinessBrief({
    message,
    isRich: true,
    businessName: "Bath All Day",
    offerings: ["Jabones", "Velas", "Bombas de bano"],
    salesMode: "",
  });

  assert.equal(hasOnlineSalesSignal(message), true);
  assert.equal(hasOnlineSalesSignal("quiero vender en línea"), true);
  assert.equal(isStrongNewBrief, true);
  assert.equal(shouldStartCleanBusinessProject({
    isPublicClientSetup: true,
    isStrongNewBrief,
    incomingBusinessName: "Bath All Day",
    existingBusinessName: "Mi Mundo 3D",
    hasCurrentSchema: true,
    hasRestoredDraft: true,
    hasExistingContext: true,
  }), true);
});

test("keeps the loaded project for a targeted correction or the same business", () => {
  assert.equal(shouldStartCleanBusinessProject({
    isPublicClientSetup: true,
    isStrongNewBrief: false,
    incomingBusinessName: "",
    existingBusinessName: "Mi Mundo 3D",
    hasCurrentSchema: true,
  }), false);
  assert.equal(shouldStartCleanBusinessProject({
    isPublicClientSetup: true,
    isStrongNewBrief: true,
    incomingBusinessName: "Mi Mundo 3D",
    existingBusinessName: "Mi Mundo 3D",
    hasCurrentSchema: true,
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
