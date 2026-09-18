# AI graph skeleton, contract v1

Status: isolated experiment, disabled by default. No release authorized.

## Scope

No LLM calls, visual editing UI, customer-site ingestion, public renderer replacement,
commerce execution, Stripe, checkout or cart changes. Those are future sprints.
The preview is a contract verification renderer, not a proposed storefront design.

## Storage and activation

Set `KREATON_AI_GRAPH_ENABLED=1` only in an isolated environment and restart.
Startup uses the existing create-all mechanism, with separate GraphBase metadata:
`site_graphs` and `design_reference_patterns`. PostgreSQL uses JSONB and a native
text array; SQLite uses JSON. Both tables are new; no existing rows are migrated.
On PostgreSQL, only these new tables receive RLS and revocation of public/anon/
authenticated privileges. The backend creation role owns them. PostgreSQL execution
is not verified in this delivery; SQL type compilation is tested locally.

Bootstrap inserts the three supplied patterns using conflict-ignore, so repeated
startup does not overwrite them. Disable the flag and restart to remove the routes;
tables remain preserved. Do not drop tables to roll back activation.

`site_id` is the new graph's opaque primary key, deliberately not a foreign key to
GeneratedSite in this ingestion-free skeleton. Creating a graph does not create or
modify a customer project. A future tenant/ingestion contract must explicitly map
these identities before any customer can use this API.

`version` is the optimistic revision, not the format version. The JSON contracts
in `schemas/*-v1.json` specify format `schema_version=1`. Timestamps are epoch
seconds, matching existing backend conventions.

## Operations

`POST /api/v1/sites/{site_id}/graph/operations` accepts `expected_version` and a
nonempty `operations` list (maximum 100). Only the existing `super_admin` identity
can mutate graphs. Use the existing admin Bearer token at this route: the current
admin cookie is scoped to `/api/admin` and is not normally sent to `/api/v1`.
No cookie or session configuration was changed.

An absent graph starts at expected_version 0. A successful batch increments once.
Existing graphs use SQL compare-and-swap; concurrent creation uses the primary key
constraint. A stale write returns 409; invalid operations return 422; missing or
invalid auth returns 401, insufficient privileges 403.

Add inserts at `block.order_index`; move uses the destination index in the resulting
list. Remove deletes by block_id. Content update replaces the complete content
object, not a shallow patch. Variant update changes only layout_variant. Every
intermediate state is validated, IDs must be unique, and indices remain contiguous.
Audit and mutation commit atomically through the existing audit helper; audit
metadata excludes content and includes only revision and operation count.

Hero/grid/footer content is intentionally free JSON. The minimum renderer reads
hero headline/subheadline, grid heading/items[].name/description, and footer text;
other content remains stored, not interpreted as markup. Variants are retained as
contract data; this renderer does not implement visual variants yet.

Fixed embeds accept only `{"module":"shared-commerce-cart"}` or
`{"module":"storefront-checkout"}` respectively. They cannot contain generated
HTML or alternate module references and never execute during preview.

## Abstract design references

Exactly editorial_minimal, bold_commerce and luxury_quiet are bootstrapped. Their
descriptions contain only the supplied concepts, with ASCII transliteration.
Retrieval tags are minimal technical labels: product, commerce, luxury respectively;
these are not an industry taxonomy or claims of semantic matching. Unknown tags
return an empty list. Future embeddings are explicitly marked in the lookup.

Closed vocabularies and extra-forbid validate every descriptor, name and tag: URLs,
HTML, images, real site identifiers, or extra fields cannot be stored through this
contract. Expanding the design vocabulary requires a reviewed schema revision.

## Protected preview

`GET /api/admin/internal/graph-preview?site_id=...` reuses existing admin auth and
sites:read permission. Support may preview but not mutate. Cookie authentication
works at this path without changing its current scope. Reads are audited.

HTML is escaped; no scripts or remote resources load. Cart/checkout are labeled
references only. A route-specific CSP permits only the hash of its fixed CSS.
The global security middleware retains its existing policy for all other routes.
Cache-Control is no-store; robots are forbidden; the route is hidden from OpenAPI.
It is absent entirely when the feature flag is off. Publication allowlists remain
unchanged. No current template JS is loaded because it would initialize unrelated
public rendering/commerce; the verification shell has minimal local CSS only.

## Evidence and limits

Evidence: `C:/Users/alber/Projects/kreaton-evidence/ai-graph/`.
Python: 423 passed, 40 subtests passed, 31 warnings, exit 0 (32 new graph tests).
Node: 231 passed, 0 failed, exit 0. Initial sandbox-only esbuild read failure is
retained separately; the full final suite passed with access to existing deps.

Browser QA uses a synthetic Supabase response and real admin resolver, real graph
endpoint, real local SQLite persistence and real audit. The graph remained after a
server restart. It is NOT production-auth or PostgreSQL runtime evidence. The QA
harness and SQLite database live outside the repo/publication tree.
