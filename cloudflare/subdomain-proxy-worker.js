// Cloudflare Worker: makes usekreaton.com the real home of the KREATON app,
// AND reverse-proxies every *.usekreaton.com subdomain to the site-viewer
// page for that generated site -- both by proxying content from GitHub
// Pages (vmbusinesssystems.com) without ever touching GitHub Pages' own
// custom-domain setting.
//
// Two things this Worker does, both via the same proxy mechanism:
//
// 1. Generated client sites: every generated site gets a public_url like
//    "bathallday-a1b2c3.usekreaton.com" (see backend/app/main.py's
//    persist_generated_site). Requests to any *.usekreaton.com subdomain
//    get "/" rewritten to "/site.html" (the generated-site viewer page).
//
// 2. The KREATON marketing landing: requests to the bare apex
//    (usekreaton.com) or www get "/" rewritten to "/landing.html" -- a real
//    marketing page explaining what KREATON does, with a CTA into
//    "/client/setup/" (KREATON AI Studio, the actual product tool). Before
//    2026-08-11 this rewrote straight to "/client/setup/", which throws an
//    unexplained Google/Apple sign-in gate at a visitor who has no idea
//    what KREATON is yet -- landing.html fixes that without touching
//    GitHub Pages' custom domain.
//
// Why a Worker instead of just pointing GitHub Pages' custom domain at
// usekreaton.com: GitHub Pages only supports ONE custom domain per repo,
// and this repo ALSO serves vmbusinesssystems.com's general company pages
// (contact.html etc.) from the very same deployment. Changing GitHub
// Pages' custom domain moves EVERYTHING, not just the app -- that's
// exactly what happened and got reverted earlier the same day (see
// docs/AGENT_LOG.md). This Worker gets the same visible result (KREATON
// genuinely lives at usekreaton.com, real subdomains work) without ever
// touching GitHub Pages' settings, so vmbusinesssystems.com keeps serving
// its own pages under its own domain the whole time, completely
// unaffected by anything this Worker does.
//
// Critically, this is a proxy, not a redirect: the browser's address bar
// and window.location.hostname stay as the real usekreaton.com host (apex
// or subdomain). For generated sites that matters because site-viewer.js
// reads window.location.hostname to know which site to load via
// GET /public/resolve-site?host=<hostname>. For the app itself it matters
// because backend/app/main.py's session cookie is scoped to
// ".usekreaton.com" -- login only works if the page really is served from
// that origin, not redirected away from it.
//
// Deploy: Cloudflare dashboard -> the usekreaton.com account -> Workers &
// Pages -> the existing "kreaton-subdomain-proxy" worker -> Edit code ->
// paste this file -> Deploy -> make sure it's bound to BOTH routes:
// "*.usekreaton.com/*" (subdomains, generated sites) AND "usekreaton.com/*"
// + "www.usekreaton.com/*" (the apex, the app itself) on the usekreaton.com
// zone (Workers Routes, not Pages). All three need a proxied (orange-cloud)
// DNS record in that zone -- see the setup instructions Beto has alongside
// this file. No environment variables or secrets needed.

const ORIGIN_HOST = "vmbusinesssystems.com";
const APEX_HOSTS = new Set(["usekreaton.com", "www.usekreaton.com"]);
const APEX_HOME_PATH = "/landing.html";
const SUBDOMAIN_HOME_PATH = "/site.html";

export default {
  async fetch(request) {
    const incomingHostname = new URL(request.url).hostname;
    const isApexRequest = APEX_HOSTS.has(incomingHostname);

    const originUrl = new URL(request.url);
    originUrl.hostname = ORIGIN_HOST;
    originUrl.port = "";
    if (originUrl.pathname === "/" || originUrl.pathname === "") {
      originUrl.pathname = isApexRequest ? APEX_HOME_PATH : SUBDOMAIN_HOME_PATH;
    }

    // Only forward the headers a public static origin actually needs to do
    // caching/negotiation correctly. The origin (GitHub Pages, unauthenticated
    // static files) has no use for the visitor's cookies, Authorization, or
    // Cloudflare's own cf-* edge metadata -- the real API calls (auth, site
    // data) go straight from the browser to luma-api.vmbusinesssystems.com,
    // never through this proxy, so there's nothing here that needs those.
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
    const isEmbeddedProjectCard = originUrl.pathname === SUBDOMAIN_HOME_PATH
      && originUrl.searchParams.get("embed") === "project-card";
    if (isEmbeddedProjectCard) {
      response.headers.delete("X-Frame-Options");
      response.headers.set(
        "Content-Security-Policy",
        "frame-ancestors 'self' https://usekreaton.com https://www.usekreaton.com",
      );
    }
    return response;
  },
};
