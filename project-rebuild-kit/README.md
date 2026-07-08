# KREATON Project Rebuild Kit

This folder documents what is needed to rebuild and run the project if the PC
fails, the repo is moved, or the platform is migrated to another machine.

It intentionally does not contain secrets.

## Project Pieces

The current project has three layers:

1. Static/client frontend
   - Root HTML/CSS/JS files
   - Client start/setup flow
   - Admin/builder screens
   - Template renderer

2. Current AI API
   - Python/FastAPI backend in `backend/`
   - Render service name: `kreaton-lyra-api`
   - Public API base currently configured in `luma-config.js`

3. Future marketplace backend
   - Laravel + MySQL architecture
   - Mega Marketplace template contracts under `templates/marketplace/mega-marketplace/`
   - Phase 1 and Phase 2 are documented, not yet connected as a live Laravel app

## Minimum Local Toolchain

- Git
- Node.js and npm
- Python 3.11+
- PHP CLI
- Composer
- MySQL 8.x when the Laravel backend is created

## Local Installed Tool Paths

On this machine, portable tools were installed under:

- PHP: `C:\Users\alber\Projects\.tools\php-8.5.8\php.exe`
- Composer: `C:\Users\alber\Projects\.tools\composer\composer.cmd`

These are outside this repo but inside `C:\Users\alber\Projects`.

## Rebuild Order

1. Clone the repository.
2. Install Node dependencies.
3. Install Python dependencies for the current FastAPI backend.
4. Configure environment variables in Render/local `.env`.
5. Verify frontend can be served locally.
6. Verify FastAPI `/healthz`.
7. Only after marketplace architecture is approved, create the Laravel backend.

## Important Rule

Never store real API keys, OAuth secrets, database passwords, payment keys, or
service-role keys in this folder or in git.

Use `.env`, Render environment variables, Supabase dashboard, Cloudflare
dashboard, Google Cloud console, and payment provider dashboards for secrets.
