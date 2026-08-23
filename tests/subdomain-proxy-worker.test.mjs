import assert from "node:assert/strict";
import test from "node:test";

import worker from "../cloudflare/subdomain-proxy-worker.js";

test("allows only the internal project-card viewer to be framed", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("ok", {
    headers: { "X-Frame-Options": "DENY" },
  });

  try {
    const embedded = await worker.fetch(new Request("https://usekreaton.com/site.html?site_id=site-1&embed=project-card"));
    assert.equal(embedded.headers.get("X-Frame-Options"), null);
    assert.equal(
      embedded.headers.get("Content-Security-Policy"),
      "frame-ancestors 'self' https://usekreaton.com https://www.usekreaton.com",
    );

    const standalone = await worker.fetch(new Request("https://usekreaton.com/site.html?site_id=site-1"));
    assert.equal(standalone.headers.get("X-Frame-Options"), "DENY");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
