import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("operations product price distinguishes quotes, missing prices and real prices", () => {
  const source = readFileSync(new URL("../operations/operations.js", import.meta.url), "utf8");
  const match = source.match(/if\(state.view==="products"\)columns=(\[.*?\]);if/);
  assert.ok(match, "Actual product columns must be found");
  const columns = vm.runInNewContext(match[1], { money: value => `USD ${value / 100}` });
  const render = columns.find(column => column.key === "priceCents").render;
  assert.equal(render({ quoteOnly: true, priceCents: null }), "Requiere cotización");
  assert.equal(render({ quoteOnly: true, priceCents: 2500 }), "Requiere cotización");
  assert.equal(render({ quoteOnly: false, priceCents: null }), "Precio no disponible");
  assert.equal(render({ quoteOnly: false, priceCents: 2500 }), "USD 25");
});
