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

    const forwardHeaders = new Headers();
    for (const name of ["accept", "accept-language", "accept-encoding", "if-none-match", "if-modified-since", "user-agent"]) {
      const value = request.headers.get(name);
      if (value) forwardHeaders.set(name, value);
    }

    const method = request.method.toUpperCase();
    const isCacheableMethod = method === "GET" || method === "HEAD";

    const originRequest = new Request(originUrl.toString(), {
      method,
      headers: forwardHeaders,
      body: isCacheableMethod ? undefined : request.body,
      redirect: "follow",
    });

    const originResponse = await fetch(
      originRequest,
      isCacheableMethod ? { cf: { cacheTtl: 20, cacheEverything: true } } : undefined,
    );

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
