# 02 - Environment Variables

This file lists required environment variable names only.
Do not paste real values here.

## Current FastAPI Backend

Used by `backend/`.

```env
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_SITE_PLANNER_MODEL=
```

Optional/current deployment variables:

```env
PORT=
```

## Frontend Runtime

Current public API base is configured in:

```text
luma-config.js
```

Current value:

```js
window.LUMA_API_BASE_URL = "https://kreaton-lyra-api.onrender.com";
```

If API domain changes, update that file or replace it with a safer environment
injection strategy during the next frontend refactor.

## Supabase

Needed for auth/session/storage/database pieces already used by the product.

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Rules:

- `SUPABASE_ANON_KEY` can be public only if used correctly with RLS.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.

## Google OAuth

Needed for Google login.

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Rules:

- Client ID can be used by frontend auth providers when required.
- Client secret must stay server-side or inside provider dashboard config only.

## Cloudflare

Needed for DNS/custom domain automation later.

```env
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ZONE_ID=
```

Rules:

- Use scoped API tokens, not global API keys.
- Domain purchase automation should be added only when billing flow is ready.

## Future Laravel Backend

When the Laravel marketplace backend is created:

```env
APP_NAME=KREATON
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kreaton_marketplace
DB_USERNAME=
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=
SESSION_DOMAIN=

QUEUE_CONNECTION=database
CACHE_STORE=database
```

Payment variables will be added in a later phase after provider selection.
