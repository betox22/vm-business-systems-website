# 03 - Run Commands

## Frontend / Static Site

Install dependencies:

```powershell
cd C:\Users\alber\Projects\vm-business-systems-website
npm install
```

Serve locally with a simple static server:

```powershell
npx http-server . -p 8091
```

Open:

```text
http://127.0.0.1:8091/start/
```

## Current FastAPI Backend

Install dependencies:

```powershell
cd C:\Users\alber\Projects\vm-business-systems-website\backend
python -m pip install -r requirements.txt
```

Run API:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Health check:

```text
http://127.0.0.1:8010/healthz
```

## Render Deployment

Render config:

```text
render.yaml
```

Current service:

```text
kreaton-lyra-api
```

Current health path:

```text
/healthz
```

## Laravel Marketplace Backend

Not created yet.

When approved, create it as a separate backend module or repository. Do not mix
Laravel runtime files into the current static site root without a deliberate
deployment plan.

Recommended future command:

```powershell
composer create-project laravel/laravel kreaton-marketplace-api
```

Then install Sanctum:

```powershell
composer require laravel/sanctum
php artisan sanctum:install
php artisan migrate
```

Do not run these until Phase 2 is approved and the backend location is chosen.
