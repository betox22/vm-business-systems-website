# 04 - Services and URLs

## Current Public Site

Primary domain:

```text
vmbusinesssystems.com
```

## Current AI API

Render service URL:

```text
https://kreaton-lyra-api.onrender.com
```

Health check:

```text
https://kreaton-lyra-api.onrender.com/healthz
```

Frontend config file:

```text
luma-config.js
```

## Previous/Legacy API Route Notes

Older references to `luma-api.vmbusinesssystems.com` may exist in browser
history or DNS work. The current checked frontend config points to Render:

```text
https://kreaton-lyra-api.onrender.com
```

Before production, choose one stable API domain and update DNS plus frontend
config.

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
