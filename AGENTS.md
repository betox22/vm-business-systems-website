# AGENTS.md — VM Business Systems Website

Este archivo lo leen tanto Codex (CLI, automático al arrancar en esta carpeta) como
Claude (Cowork). Es el punto de entrada para que cualquiera de los dos agentes
retome el trabajo sin que Beto tenga que explicar contexto de nuevo.

## Qué es este proyecto

Sitio público de VM Business Systems + "Lyra", un AI website builder integrado
(`ai-builder.html` / `ai-builder.js` en el frontend, `backend/app/` en Python/FastAPI:
`lyra_intake_engine.py`, `orchestrator.py`, `ai_site_planner.py`, `agents.py`, etc.).

Estructura rápida:
- `index.html`, `services.html`, `solutions.html`, `plans.html`, `contact.html` — sitio público.
- `ai-builder.*`, `client/`, `client-portal*.*`, `seller-portal.*` — builder y portales.
- `backend/app/` — motor de intake/orquestación de Lyra (Python).
- `templates/`, `templates-preview/` — templates de sitios generados.
- `docs/` — documentación técnica (ver `commerce-engine-architecture.md`).
- `handoff/` — zips de handoffs manuales anteriores entre Claude/Codex/Gemini. Ya no
  deberían ser necesarios si este protocolo se sigue; se dejan como referencia histórica.

## Protocolo de coordinación (léelo antes de empezar)

1. **Antes de tocar código**, revisa en este orden:
   - `docs/AGENT_LOG.md` — qué se hizo en la última sesión y qué queda pendiente.
   - `git status` y `git diff` — el estado real del working tree puede tener cambios
     sin commitear de la otra herramienta. No asumas que el repo está limpio.
2. **Si vas a tocar un archivo que el log marca como "en progreso" por el otro agente**,
   avísale a Beto antes de sobrescribir en vez de asumir que está libre.
3. **Al terminar una sesión de trabajo**, actualiza `docs/AGENT_LOG.md` con:
   qué cambiaste, por qué, y qué queda pendiente o abierto (ver formato en ese archivo).
4. **Commits**: mensajes cortos en imperativo (`fix:`, `feat:`, `chore:` como ya se usa
   en el historial). No hace falta pedir permiso para commitear cambios locales, pero
   no hagas push ni reescribas historia sin que Beto lo pida.
5. **No borres ni "limpies" trabajo del otro agente** (código, comentarios, TODOs) sin
   dejar constancia en el log de por qué.

## Notas de estado conocidas

- Al 2026-07-18 hay ~18 archivos con cambios sin commitear (css/html grandes:
  `css/styles.css`, `client-portal.js`, etc.) que parecen una pasada de reformateo/
  reescritura masiva, no solo contenido. Antes de tocar esos archivos, correr
  `git diff <archivo>` para entender si es formato o lógica antes de asumir conflicto.
- Hay archivos temporales sueltos en la raíz (`.codex_tmp*`, `http-*.log`,
  `static-*.log`, `premium-api-*.log`) de sesiones previas de Codex probando con
  Playwright/servers locales. Son basura de trabajo, no borrarlos a ciegas por si
  alguno sigue en uso, pero no son parte del proyecto real.

## Cómo correr cosas localmente

Revisar `package.json` (Playwright, React) y `backend/` (Python, hay `.venv/` en la
raíz) antes de asumir el stack — no hay un único comando de arranque documentado
todavía. Si lo descubres, añádelo aquí.
