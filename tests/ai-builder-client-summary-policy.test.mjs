import assert from "node:assert/strict";
import test from "node:test";

import { naturalBusinessSummary } from "../src/ai-builder/client-summary-policy.js";

test("client summary is a natural sentence and hides internal enum names", () => {
  const summary = naturalBusinessSummary({
    language: "es",
    businessName: "Bath All Day",
    industry: "handmade",
    salesFlow: "online_sales",
    offers: ["jabones artesanales", "velas aromaticas", "bombas de bano"],
  });
  assert.match(summary, /^Entendí que Bath All Day ofrece/);
  assert.match(summary, /vender en línea/);
  assert.doesNotMatch(summary, /online_sales| · /);
});
