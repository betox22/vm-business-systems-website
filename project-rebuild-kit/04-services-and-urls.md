# 04 - Services and URLs

## Current Public Site

Primary domain:

```text
usekreaton.com
```

(2026-08-10: full cutover from vmbusinesssystems.com to usekreaton.com --
see docs/AGENT_LOG.md same-day entry. vmbusinesssystems.com now redirects
to usekreaton.com instead of serving the app.)

## Current AI API

Custom domain (CNAME to the Render service below):

```text
https://api.usekreaton.com
```

Render service URL:

```text
https://kreaton-lyra-api.onrender.com
```

Health check:

```text
https://api.usekreaton.com/healthz
```

Frontend config file:

```text
luma-config.js
```

## Previous/Legacy API Route Notes

Older references to `luma-api.vmbusinesssystems.com` (and, before that,
`api.usekreaton.com`'s predecessor) may exist in browser history or DNS
work. The current frontend config (`luma-config.js`) points to
`https://api.usekreaton.com`, a custom domain CNAME'd to the Render service
above.

## Cloudflare

Used for:

- DNS
- tunnels
- future custom domains
- future domain routing per tenant

Do not automate domain purchase until billing and package checkout are ready.

## Supabase

Used for:

- login/session layer already explored
- storage/database pieces depending on current app flow

Before final production, decide whether Supabase remains part of the platform
or whether Laravel/MySQL owns auth and business data for the marketplace.
