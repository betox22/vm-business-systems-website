# 01 - Prerequisites

## Required Accounts

- GitHub account with access to the repo
- Render account for the current Python API
- Supabase account/project for current auth/storage/database pieces
- Cloudflare account for DNS/tunnels/custom domains
- Google Cloud project for Google OAuth login
- OpenAI platform account/API key for Lyra AI generation

## Required Local Tools

### Node.js

Used by:

- frontend package dependencies
- Playwright testing
- any future React/Next.js frontend

Check:

```powershell
node --version
npm --version
```

Install project dependencies:

```powershell
cd C:\Users\alber\Projects\vm-business-systems-website
npm install
```

### Python

Used by:

- current FastAPI backend in `backend/`

Check:

```powershell
python --version
```

Install backend dependencies:

```powershell
cd C:\Users\alber\Projects\vm-business-systems-website\backend
python -m pip install -r requirements.txt
```

Run current API locally:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

### PHP

Used by:

- future Laravel marketplace backend
- validating Laravel snippets

Portable PHP path on this machine:

```powershell
C:\Users\alber\Projects\.tools\php-8.5.8\php.exe -v
```

### Composer

Used by:

- installing Laravel and PHP packages

Portable Composer path on this machine:

```powershell
C:\Users\alber\Projects\.tools\composer\composer.cmd --version
```

### MySQL

Required when the Laravel backend is created.

Recommended:

- MySQL 8.x
- InnoDB
- utf8mb4

The Phase 1 SQL schema is here:

```text
templates/marketplace/mega-marketplace/phase-1/mysql-schema.sql
```
