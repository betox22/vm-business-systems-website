import assert from "node:assert/strict";
import test from "node:test";

import { extractContactInfo } from "../src/ai-builder/contact-info-policy.js";

test("ordinary Spanish text does not fabricate an Instagram handle", () => {
  assert.deepEqual(extractContactInfo("Elige tu estilo y luego seguimos con la tienda"), {});
});

test("Instagram requires a complete keyword or a standalone handle", () => {
  assert.equal(extractContactInfo("Instagram: phonehub.ve").instagram, "@phonehub.ve");
  assert.equal(extractContactInfo("Mi IG es @phonehub_ve").instagram, "@phonehub_ve");
  assert.equal(extractContactInfo("Escribenos por @phonehub.ve").instagram, "@phonehub.ve");
});

test("the at sign inside an email is not treated as Instagram", () => {
  assert.deepEqual(extractContactInfo("Contacto: ventas@phonehub.com"), {
    email: "ventas@phonehub.com",
  });
});
