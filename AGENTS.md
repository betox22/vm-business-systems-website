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

## Protocolo de calidad visual/diseño (obligatorio)

Beto ha pedido repetidamente un nivel de diseño "hiper pro" — profesional, moderno,
con animación/motion cuidado — y ese nivel no se está sosteniendo porque la
instrucción vivía solo en mensajes de chat sueltos, no en un archivo que el agente
lea siempre. A partir de ahora:

1. **Ningún trabajo visual (logo, rediseño, template, sección nueva, animación,
   identidad de marca) se marca como terminado sin evidencia visual real** — captura
   de pantalla o preview del resultado ya renderizado e implementado, no solo la
   pieza aislada (ej. no alcanza con mostrar el logo en PNG si la tarea era
   integrarlo al header; hay que mostrar el header real con el logo puesto).
2. **Para logos, identidad de marca o piezas de diseño nuevas**: proponer 2-3
   conceptos o una descripción clara del enfoque ANTES de implementar, y esperar
   aprobación explícita de Beto antes de tocar código. No implementar-y-mostrar
   como fait accompli.
3. **Barra de calidad para sitios generados por LYRA**: layout con jerarquía visual
   clara (no bloques genéricos ni espacio vacío sin propósito), tipografía con
   escala real (ya implementado vía Typography Intelligence, ver backend/app/
   typography_theory.py — no regresar a tamaños planos), motion/microinteracciones
   sutiles en hover/scroll donde sume (transiciones, profundidad con CSS
   transform/parallax), NO placeholders visibles en el resultado final ("Precio por
   confirmar", imágenes genéricas sin relación con el negocio del cliente — ver
   catalog-seed-policy.js y _reconcile_client_catalog en ai_site_planner.py, causa
   raíz de este problema específico).
4. **Selección de plantilla/módulo**: la IA debe elegir entre las secciones/plantillas
   reales disponibles (ver TEMPLATE_CATALOG en backend/app/agents.py y el registro
   de secciones reusables en ai_site_planner.py: QuoteRequestForm,
   CapabilitiesEquipment, PortfolioGallery, VideoShowcase, CourseOffering) según lo
   que el cliente realmente pidió, nunca forzando un template que no encaja solo
   porque coincide parcialmente en categoría.
5. Si "animación 3D" significa WebGL/Three.js real (escenas 3D interactivas) en vez
   de profundidad/motion vía CSS, aclarar con Beto antes de asumir — son esfuerzos
   de implementación y costo de rendimiento muy distintos.

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
