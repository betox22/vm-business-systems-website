import assert from "node:assert/strict";
import { MarketplaceApiClient, toQuery } from "./api-client-contract.mjs";

assert.equal(toQuery({}), "");
assert.equal(toQuery({ query: "lamp", page: 2 }), "?query=lamp&page=2");
assert.equal(toQuery({ query: "", page: null, sort: "featured" }), "?sort=featured");

const client = new MarketplaceApiClient({
  baseUrl: "https://example.test/",
  getToken: () => "token-123",
});

assert.equal(client.baseUrl, "https://example.test");

let captured;
globalThis.fetch = async (url, options) => {
  captured = { url, options };
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ ok: true }),
  };
};

await client.placeOrder({ items: [{ product_id: "1", quantity: 2 }] }, "idem-1");

assert.equal(captured.url, "https://example.test/api/v1/checkout/place-order");
assert.equal(captured.options.method, "POST");
assert.equal(captured.options.headers.Authorization, "Bearer token-123");
assert.equal(captured.options.headers["Idempotency-Key"], "idem-1");

assert.throws(() => client.placeOrder({ items: [] }), /idempotencyKey/);

console.log("api-client-contract tests passed");
