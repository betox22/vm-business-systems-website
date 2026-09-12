import assert from "node:assert/strict";
import test from "node:test";

import { detectSubstantialBriefLanguage, resolveBriefLanguage } from "../src/ai-builder/language-policy.js";

const SPANISH_PHONEHUB = "Quiero vender telefonos y accesorios, las marcas van a ser Xiaomi, Apple, Samsung y Oppo. El negocio se llama PhoneHub. Vendo en linea con envio a domicilio.";

test("a substantial Spanish brief beats an English browser default", () => {
  assert.equal(detectSubstantialBriefLanguage(SPANISH_PHONEHUB), "es");
  assert.equal(resolveBriefLanguage({ brief: SPANISH_PHONEHUB, browserLanguage: "en" }), "es");
});

test("an explicit manual language always beats text and browser detection", () => {
  assert.equal(resolveBriefLanguage({ manualLanguage: "en", brief: SPANISH_PHONEHUB, browserLanguage: "es" }), "en");
});
