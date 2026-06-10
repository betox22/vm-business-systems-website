# Luma AI Builder API

Backend FastAPI para el generador de paginas/tiendas de V&M Business Systems.

## Healthcheck

```bash
GET /health
```

Debe responder:

```json
{
  "status": "ok",
  "supabaseConfigured": true,
  "openaiConfigured": true
}
```

## Deploy en Render

1. Crear un repo GitHub nuevo solo para este backend.
2. Subir esta carpeta completa al repo.
3. En Render, crear un Blueprint usando `render.yaml`.
4. Configurar las variables secretas:

```env
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_API_TOKEN=
ADMIN_ALLOWED_EMAILS=
```

Opcionales para dominios reales:

```env
DOMAIN_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
DOMAIN_INCLUDED_MAX_USD=20
```

5. Verificar `https://TU-BACKEND/health`.
6. Cambiar `luma-config.js` en el repo del dominio:

```js
window.LUMA_API_BASE_URL = "https://TU-BACKEND";
```

7. Publicar el dominio.

## Local

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8010
```

## Seguridad

No subir `.env`, logs, base SQLite local ni llaves. Este repo solo debe tener `.env.example`.

El admin acepta dos formas de acceso:

- Login Supabase por `POST /api/auth/login`, autorizado si el email esta en
  `ADMIN_ALLOWED_EMAILS` o si el usuario existe en `business_members` con rol
  `owner`, `admin` o `staff`.
- `ADMIN_API_TOKEN` como respaldo tecnico para operaciones internas.
