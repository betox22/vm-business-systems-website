// Cloudflare Worker: reverse-proxies every *.usekreaton.com subdomain to the
// real site-viewer page hosted on GitHub Pages (usekreaton.com itself, as of
// the 2026-08-10 full domain cutover -- see docs/AGENT_LOG.md).
//
// Why this exists: every generated site gets a public_url like
// "bathallday-a1b2c3.usekreaton.com" (see backend/app/main.py's
// persist_generated_site). GitHub Pages' "custom domain" feature only
// supports ONE fixed domain per repo -- it cannot serve an unbounded number
// of client subdomains (bathallday.usekreaton.com, joescafe.usekreaton.com,
// ...) directly. This Worker is the piece that makes that actually work: it
// sits in front of the *.usekreaton.com wildcard DNS record, and for any
// request to any subdomain, fetches the matching path from the ORIGIN
// (usekreaton.com apex, GitHub Pages) and returns it unchanged -- except the
// root path "/" resolves to "/site.html" (the generated-site viewer page),
// matching what a normal visitor typing the subdomain expects to see.
//
// Note this Worker is only bound to the route "*.usekreaton.com/*" (see
// deploy notes below), which requires at least one subdomain label -- it
// does NOT match the bare apex "usekreaton.com". The apex is the real
// KREATON app itself, served directly by GitHub Pages with no Worker in
// front of it at all, so there's no risk of this Worker's fetch() to the
// apex looping back into itself.
//
// Critically, this is a proxy, not a redirect: the browser's address bar and
// window.location.hostname stay as the real subdomain (e.g.
// "bathallday.usekreaton.com"). That matters because site-viewer.js reads
// window.location.hostname to know which generated site to load via
// GET /public/resolve-site?host=<hostname> against the LYRA API
// (api.usekreaton.com, see luma-config.js). If this were a redirect
// instead, the browser would end up on the apex and resolve-site would
// receive the wrong host.
//
// Deploy: Cloudflare dashboard -> the usekreaton.com account -> Workers &
// Pages -> Create Worker -> paste this file -> deploy -> bind it to the
// route "*.usekreaton.com/*" on the usekreaton.com zone (Workers Routes,
// not Pages). Requires a proxied (orange-cloud) wildcard DNS record for
// "*" in that zone -- see the DNS step in the setup instructions Beto has
// alongside this file. No environment variables or secrets needed.

const ORIGIN_HOST = "usekreaton.com";

export default {
  async fetch(request) {
    const originUrl = new URL(request.url);
    originUrl.hostname = ORIGIN_HOST;
    originUrl.port = "";
    if (originUrl.pathname === "/" || originUrl.pathname === "") {
      originUrl.pathname = "/site.html";
    }

    // Only forward the headers a public static origin actually needs to do
    // caching/negotiation correctly. The origin (GitHub Pages, unauthenticated
    // static files) has no use for the visitor's cookies, Authorization, or
    // Cloudflare's own cf-* edge metadata -- the real API calls (auth, site
    // data) go straight from the browser to api.usekreaton.com, never
    // through this proxy, so there's nothing here that needs those.
    const forwardHeaders = new Headers();
    for (const name of ["accept", "accept-language", "accept-encoding", "if-none-match", "if-modified-since", "user-agent"]) {
      const value = request.headers.get(name);
      if (value) forwardHeaders.set(name, value);
    }

    const method = request.method.toUpperCase();
    const isCacheableMethod = method === "GET" || method === "HEAD";

    // Note: no manual `Host` header here. Cloudflare Workers treats it as a
    // guarded/forbidden header (same as browser fetch()) -- setting it via
    // headers.set() is silently ignored. The correct way to redirect the
    // request to a different host is exactly what's above: change
    // originUrl.hostname before building the Request. fetch() sends the
    // right Host automatically from that URL.
    const originRequest = new Request(originUrl.toString(), {
      method,
      headers: forwardHeaders,
      body: isCacheableMethod ? undefined : request.body,
      redirect: "follow",
    });

    // Only let Cloudflare cache actual static-asset reads. This origin isn't
    // built to handle non-GET/HEAD traffic at all, so there's no reason to
    // ask the cache layer to do anything with those requests.
    const originResponse = await fetch(
      originRequest,
      isCacheableMethod ? { cf: { cacheTtl: 300, cacheEverything: true } } : undefined,
    );

    // Pass the origin's response straight through. site.html, site-viewer.js,
    // luma-config.js and ai-builder.css are all static, public, and identical
    // for every subdomain -- the per-tenant part happens client-side via the
    // resolve-site API call, not at this proxy layer.
    const response = new Response(originResponse.body, originResponse);
    response.headers.set("X-Proxied-By", "kreaton-subdomain-worker");
    return response;
  },
};
