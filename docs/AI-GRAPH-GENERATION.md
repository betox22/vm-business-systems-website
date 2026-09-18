# Sprint 2 - synthetic graph generation

Status: implemented on isolated branch kreaton-ai-graph-sprint2 and approved for
fast-forward publication after successful real OpenAI verification. Render flag unchanged.

## Provider and configuration

OpenAI, reusing agents.OpenAI, agents.OPENAI_REQUEST_TIMEOUT_SECONDS (20s) and
agents.create_sync_chat_completion_with_retry directly. No second provider, SDK,
HTTP loop or catalog-generation call. agents.py itself is unchanged.

Configuration: OPENAI_API_KEY and OPENAI_MODEL (existing default gpt-6-astra).
KREATON_AI_GRAPH_ENABLED remains off by default; nothing is changed in Render.
The request uses Chat Completions JSON-object output, fixed system instructions
and a user envelope with scenario/patterns/contract only. Strict graph validation
remains server-side, including rejecting a syntactically valid but invalid batch.

Retry behavior is inherited, not reimplemented: the helper attempts twice after
any SDK exception, with 0.5s backoff. The SDK also retries transient errors twice
by default. Tests observed six HTTP requests for persistent 429/5xx/timeouts and
two for 400/401. Invalid returned output/refusal is not retried or repaired.
Unlike catalog generation, exhaustion fails explicitly; no seed fallback.

## Route and shared persistence

POST /api/v1/sites/{site_id}/graph/generate, super_admin only. Request:

```json
{"scenario_id":"studio_goods","industry_tag":"product","language":"en","expected_version":0}
```

Allowed scenarios: studio_goods, outdoor_tools, quiet_objects. Tags: product,
commerce, luxury. Languages: en/es. All extra request fields are rejected;
there is no free-form prompt, reference URL, source site, upload or client intake.
Only a new graph destination is accepted. An existing destination returns 409.

Both entry points invoke the same Python service:
- site_graph_api.operations -> site_graph_service.persist_graph_batch
- site_graph_api.generate -> site_graph_generation.generate_graph
  -> site_graph_service.persist_graph_batch

There is no internal HTTP call or second INSERT/UPDATE algorithm. The service
retains compare-and-swap, primary-key race handling and atomic audit+graph commit.
Existing Sprint 1 tests were kept, changing only patch targets after extraction.

## Information boundary

The provider's user message contains exactly scenario, patterns, contract.
The scenario is a server-owned synthetic fixture; product names/facts are fixed.
The backend resolves get_seed_patterns in a separate autoflush-disabled session,
READ ONLY on PostgreSQL, closed before the provider call. DesignPattern validates
every returned object. No pattern match or corrupt pattern fails before the call.

The only preflight graph query selects the destination ID for existence, not its
blocks. No GeneratedSite, Product, Store or other client's content is included.
The provider never receives an ORM object, DB session, actor, destination ID,
cookie or backend auth token. The API key is only the provider auth header.
No agent tool executor exists that a model response could use to request data.

## Validation and rejection

The full JSON response is parsed with duplicate-key detection, then validated as
ProposedGraph -> OperationsRequest -> apply_operations -> SiteGraph. The generation
contract is intentionally narrower than Sprint 1's free JSON content: exactly
hero/grid/footer, default variant, nonempty bounded plain text, exact synthetic
product identities, no extra content fields. Optional fixed embeds remain inert.
This validates structure and declared identities, not arbitrary marketing truth
or guaranteed language quality; those still require reviewing the real output.

One invalid block rejects the entire batch with 422 invalid_generated_batch.
No prefix save, silent filtering, repair or fallback. Refusal/truncation/provider
failure returns a sanitized 502; missing key returns 503. Stale destination is 409.
Writes occur only after validation, through the shared service. A competing writer
cannot be overwritten. An audit failure rolls back the write.

Generation rejections reaching the handler are audited with a fixed reason code,
actor and target only. Raw prompt/output/provider error text is neither returned
nor added to audit metadata. Framework-level malformed HTTP/JSON or invalid path
errors are still handled by FastAPI, as before; they do not call the provider.

## Verified and pending

Python complete: 476 passed, 40 subtests passed, 31 warnings, exit 0.
Node complete: 231 passed, 0 failed, exit 0.
Graph suite: 85 passed (32 Sprint 1 + 53 new Sprint 2 cases).

New tests inspect the actual HTTP request built by the adapter using MockTransport,
seed private-content sentinels in local DB and spy on SQL before/during the call.
They verify the exact envelope, closed sessions, no private-table reads and no
private markers in the provider request. Another spy observes both routes calling
the same persistence function. Rejections, rollback and racing writers are covered.

Real provider verification: OpenAI HTTP 200, model gpt-6-astra, completion
chatcmpl-EPI9m5iubsg4UegXlpT5Pe2a2GBtJ, request
req_9c4c1de66c724ab1b4f8cb5351883383. Graph synthetic-openai-smoke persisted at
version 1, re-read from a separate process. Product names AND descriptions match
studio_goods exactly: A5 Notebook / Plain pages for notes.; Desk Ruler / A ruler
for desk work. No added products, prices, inventory, ratings or contacts.
Chrome screenshot shows the real saved graph on /api/admin/internal/graph-preview.
The initial harness preview returned 403 because its synthetic identity omitted
sites:read; only the external harness was corrected, then preview returned 200.
Authentication is synthetic QA admin and DB is isolated local SQLite, not a
production admin login or PostgreSQL runtime validation. Prior 429s remain in evidence.

Evidence: C:/Users/alber/Projects/kreaton-evidence/ai-graph-sprint2/.
