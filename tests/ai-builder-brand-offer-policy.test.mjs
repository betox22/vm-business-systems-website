import assert from "node:assert/strict";
import test from "node:test";

import { extractBrandsCarried, splitBrandClause } from "../src/ai-builder/brand-offer-policy.js";

const PHONEHUB_BRIEF = "Quiero vender telefonos y accesorios, las marcas van a ser Xiaomi, Apple, Samsung y Oppo. El negocio se llama PhoneHub. Vendo en linea con envio a domicilio.";

test("brand clause is separated from the client offering text", () => {
  const result = splitBrandClause(PHONEHUB_BRIEF);
  assert.match(result.offerText, /telefonos y accesorios/i);
  assert.doesNotMatch(result.offerText, /Xiaomi|Apple|Samsung|Oppo/i);
  assert.deepEqual(result.brandsCarried, ["Xiaomi", "Apple", "Samsung", "Oppo"]);
});

test("brands are extracted as commercial context rather than catalog items", () => {
  assert.deepEqual(extractBrandsCarried(PHONEHUB_BRIEF), ["Xiaomi", "Apple", "Samsung", "Oppo"]);
});
