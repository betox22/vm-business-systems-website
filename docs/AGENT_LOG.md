# Bitácora de agentes (Claude / Codex)

Cada sesión de trabajo agrega una entrada arriba (más reciente primero). No borres
entradas viejas — si algo queda obsoleto, táchalo o anota que ya no aplica.

Formato de entrada:

```
## YYYY-MM-DD — Agente (Claude/Codex) — título corto

**Hecho:** qué se completó.
**Pendiente / abierto:** qué falta o quedó a medias.
**Archivos tocados:** lista breve.
**Notas para el siguiente agente:** cualquier cosa que evite retrabajo o choques.
```

---

## 2026-08-12 — Codex — Barrera estructural contra contaminación cruzada del intake

**Hecho:** se agregó una validación determinística inmediatamente después de
`LyraIntakeEngine.run()` y antes de `apply_decision()` en `/api/luma/chat`.
La validación revisa `servicesProducts`, `industry`, `salesFlow`,
`businessDescription` y `generatedCopy`; elimina o limpia valores que
pertenecen a otro slot, baja su confianza y deja `fieldMeta.source` como
`needs_review`. Después recalcula el gate real de campos faltantes, sin una
segunda llamada al LLM. También se agregaron regresiones para los dos casos
históricos: sales-flow filtrado a rubro/productos y respuesta de logo filtrada
a productos/copy. La tarea de backlog **#48 queda resuelta por este cambio**;
era duplicado del incidente **#60**, ya cerrado de forma puntual.

**Pendiente / abierto:** observar los warnings
`Lyra intake cross-field validator repaired fields` en producción para ampliar
los patrones únicamente con evidencia real; no convertir esta barrera en un
segundo clasificador heurístico.

**Archivos tocados:** `backend/app/lyra_intake_engine.py`,
`backend/app/main.py`, `backend/tests/test_intake_gate.py`,
`docs/AGENT_LOG.md`.

**Notas para el siguiente agente:** esta barrera pertenece solo al intake
conversacional. No se modificaron el orchestrator, la generación, el frontend
ni el clasificador de plantillas. `generatedCopy` nunca es propiedad del
agente de intake: si aparece en su decisión, se descarta para que lo produzca
el pipeline normal de copy/site planning.

---

## 2026-08-11 — Claude — Landing real en usekreaton.com + Google OAuth propio + botón Google arreglado

**Hecho:** Tres cosas relacionadas, todas verificadas en vivo con curl:

1. `landing.html` (nuevo, raíz del repo): página de marketing real para
   KREATON -- antes de esto, `usekreaton.com` mandaba directo al gate de
   login de `/client/setup/` sin ningún contexto de marca. El Worker
   (`cloudflare/subdomain-proxy-worker.js`) ahora reescribe `/` del apex a
   `/landing.html` en vez de `/client/setup/` (`APEX_HOME_PATH`). Registrado
   en `scripts/stage-public-site.mjs` (allowlist estricta) para que
   realmente se publique.
2. Botón "Continuar con Google/Apple/email" en `client/setup/index.html`
   arreglado: el CSS (`.studio-auth-provider` en `ai-builder.css`) ya tenía
   un diseño completo tipo Wix con ícono a la izquierda, pero el HTML nunca
   le puso esa clase a los botones reales -- se renderizaban sin estilo,
   sin ícono de Google. El texto va en un `<span data-i18n="...">` interno,
   no en el `<button>`, porque `applyI18n()` hace
   `item.textContent = t(...)` sobre cualquier `[data-i18n]` y habría
   borrado el ícono SVG en cada cambio de idioma.
3. Google Cloud OAuth propio de KREATON: proyecto nuevo "Kreaton" en Google
   Cloud (cuenta newappcreathor@gmail.com), pantalla de consentimiento
   configurada con nombre "KREATON", cliente OAuth "KREATON web" creado con
   redirect URI `https://rzdidqclbvnqqlcaueoh.supabase.co/auth/v1/callback`.
   Client ID/Secret nuevos pegados en Supabase (proyecto `rzdidqclbvnqqlcaueoh`,
   org `vmbusinesssystems`, reemplazando un cliente Google viejo/genérico sin
   marca). Ver [[project_kreaton_google_oauth_setup]] en memoria -- incluye
   la decisión explícita de NO migrar Supabase a una cuenta separada (es
   infraestructura invisible, no "mezcla" como el incidente del dominio) y
   de diferir el add-on de dominio personalizado de Supabase ($10/mes,
   requiere plan Pro $25/mes).

Bug encontrado en el camino: Supabase `Authentication → URL Configuration`
tenía `Site URL = https://lyra.vmbusinesssystems.com` (subdominio viejo, ya
no forma parte de la arquitectura actual) y `usekreaton.com` no estaba en
`Redirect URLs` -- por eso, tras loguearse con Google, Supabase caía a su
URL de respaldo y el visitante terminaba en la raíz de `vmbusinesssystems.com`
con el `access_token` crudo pegado en el fragmento de la URL (esa página no
tiene el JS de `captureStudioAuthRedirect()` que lo captura y limpia).
Arreglado: `Site URL = https://usekreaton.com`, agregado
`https://usekreaton.com/**` y `https://*.usekreaton.com/**` a Redirect
URLs. Las entradas viejas (`lyra.vmbusinesssystems.com`,
`kreaton-lyra-api.onrender.com`, `luma-api.vmbusinesssystems.com`,
`vmbusinesssystems.com`, `www.vmbusinesssystems.com`) se dejaron intactas
a propósito -- son inofensivas, y tocar cosas no pedidas fue justo lo que
causó el incidente de la entrada de abajo.

También: el primer intento de desplegar el Worker con `/landing.html` falló
porque Beto pegó una versión vieja del código (con `/client/setup/`
todavía) -- confirmado leyendo el código real desplegado vía
`workers_get_worker_code` antes de asumir que era problema de cache.
Lección: con tantas versiones del Worker pegadas en la misma conversación,
verificar el código REALMENTE desplegado antes de diagnosticar nada más.

**Pendiente / abierto:**
- Task #31 (ya existía, sin tocar hoy): Beto no está conforme con que el
  flujo post-landing sea "chat guiado" -- lo compara con el dashboard de
  Wix. Es un rediseño de UX más grande, deliberadamente no abordado en esta
  sesión.
- Verificar en vivo con una cuenta real (no solo curl) que la pantalla de
  consentimiento de Google efectivamente dice "KREATON" ahora.

**Archivos tocados:** `landing.html` (nuevo), `client/setup/index.html`,
`cloudflare/subdomain-proxy-worker.js`, `scripts/stage-public-site.mjs`.
Cambios en Supabase (Auth Providers, URL Configuration) y Google Cloud
Console -- ninguno versionado en el repo, ver memoria del agente.

**Notas para el siguiente agente:** si Beto vuelve a preguntar por qué el
login "se ve raro" o "manda a un lugar random", lo primero es mirar
`Authentication → URL Configuration` en Supabase antes que nada en
Cloudflare -- ese fue el bug real dos veces en esta sesión.

---

## 2026-08-10 — Claude — KREATON servido en usekreaton.com apex vía Worker (no GitHub Pages)

**Hecho:** Extendí `cloudflare/subdomain-proxy-worker.js` (el mismo Worker
que ya proxea `*.usekreaton.com` para sitios generados, ver entrada de más
abajo) para que TAMBIÉN detecte el apex y `www` (`usekreaton.com`,
`www.usekreaton.com`) y reescriba `/` a `/client/setup/` (KREATON AI
Studio) en vez de `/site.html`. Sigue siendo un proxy puro sobre
`vmbusinesssystems.com` -- en ningún momento se tocó el custom domain de
GitHub Pages, así que `contact.html` y el resto de V&M Business Systems no
se movieron de ahí. Esto es la forma correcta de resolver lo que el
cutover completo (entrada de abajo) intentó resolver de forma equivocada.

También cambié `samesite="lax"` → `samesite="none"` en el cookie de sesión
(`backend/app/main.py`, `client_auth_session` y `client_auth_logout`). Con
la app ahora accesible desde `usekreaton.com` pero la API en
`luma-api.vmbusinesssystems.com`, esa llamada pasa a ser cross-site
(dominios registrables distintos), y `Lax` bloquea el envío del cookie ahí
-- habría roto el login silenciosamente solo para quien entra por
`usekreaton.com`, dejando `vmbusinesssystems.com` funcionando normal (bug
fácil de no notar si solo se prueba desde un dominio). `None` + `Secure`
(ya estaba `secure=True`) lo arregla sin tocar el `domain` del cookie ni
CORS (`CLIENT_ALLOWED_ORIGIN_REGEX` ya cubría `usekreaton.com`).

Commit: `f34aae0` (código) + `6b0c4ef` (docs). 39/39 tests backend pasan.

**Actualización misma sesión, más tarde el mismo día -- TODO desplegado y
verificado en vivo:**
- Push a `main` (bloqueado primero por credencial de Git corrupta en la
  máquina de Beto -- `SEC_E_NO_CREDENTIALS`, resuelto con
  `git credential-manager github logout` + relogin). `origin/main` en
  `6b0c4ef`, `pages.yml` en success, Render redesplegado.
- Worker `kreaton-subdomain-proxy`: código pegado y deployado a mano vía
  dashboard (Edit code → Deploy).
- Workers Routes en la zona `usekreaton.com`: agregadas `usekreaton.com/*`
  y `www.usekreaton.com/*` (además de la `*.usekreaton.com/*` que ya
  existía), las 3 apuntando al mismo worker.
- Los 4 `A` del apex + el `CNAME` de `www` pasados de "DNS only" a
  "Proxied". Nota para el siguiente agente: el toggle en el dashboard se
  reflejó al instante, pero la propagación pública (1.1.1.1, 8.8.8.8) tardó
  ~3-4 minutos en dejar de servir la respuesta vieja (IPs directas de
  GitHub Pages) -- si algo similar pasa de nuevo, es caché de resolvers
  públicos, no que el cambio no se haya guardado; confirmar en el dashboard
  primero, y si ahí ya dice "Proxied", solo hace falta esperar.
- Verificado en vivo con curl: `usekreaton.com/`, `www.usekreaton.com/` y
  un subdominio de prueba devuelven 200 con el contenido correcto
  (`x-proxied-by: kreaton-subdomain-worker` presente), y
  `vmbusinesssystems.com/` + `/contact.html` siguen en 200 sin cambios --
  confirmado que V&M Business Systems no se movió de su dominio.

**Pendiente / abierto (quedó para después, no bloqueante):**
- Falta probar en vivo el login completo entrando por `usekreaton.com`
  (con una cuenta real, no solo curl) para confirmar que el cookie de
  sesión con `SameSite=None` efectivamente se guarda y se envía en la
  llamada a `luma-api.vmbusinesssystems.com` desde ese origen.
- No decidido todavía: si `vmbusinesssystems.com/client/setup/` y
  `/ai-builder.html` deberían redirigir a sus equivalentes en
  `usekreaton.com` para evitar que existan dos "entradas" paralelas a la
  misma app con sesiones potencialmente confusas.

**Archivos tocados:** `cloudflare/subdomain-proxy-worker.js`,
`backend/app/main.py`.

**Notas para el siguiente agente:** Este es el patrón correcto para
"mover" cosas a usekreaton.com sin repetir el incidente de la entrada de
abajo: SIEMPRE vía este Worker (proxy), NUNCA vía el custom domain de
GitHub Pages. Si Beto pide mover algo más a usekreaton.com, es un cambio
de 3 líneas en este Worker (agregar el hostname/path al mapeo), no un
cambio de infraestructura.

---

## 2026-08-10 — Claude — REVERTIDO: el cutover completo de dominio fue un error de alcance

**Hecho:** La entrada de abajo ("Cutover completo de dominio") se revirtió
por completo unas horas después de hacerse, a pedido explícito de Beto:
"vm business es una pagina y kreaton es otra ahora q carajo hacemos para
arreglarlo". Causa raíz del error: le pregunté (vía pregunta estructurada)
si la app completa debía pasar a la raíz de usekreaton.com y confirmó que
sí, pero no dejé claro en ese momento que `vmbusinesssystems.com` no es
solo "la app" -- este MISMO repo también sirve `contact.html` y otras
páginas generales de V&M Business Systems desde el mismo despliegue de
GitHub Pages. Como GitHub Pages solo permite UN dominio custom por repo,
mover "la app" a usekreaton.com movió TODO el sitio, incluyendo páginas que
Beto nunca quiso tocar. Confirmado en vivo: `vmbusinesssystems.com` devolvía
404 ("Site not found · GitHub Pages") mientras el cutover estuvo activo.

Revertido:
- GitHub → Settings → Pages → Custom domain: `usekreaton.com` →
  `vmbusinesssystems.com` (hecho a mano en el dashboard, no por push).
- `CNAME` (raíz del repo): vuelto a `vmbusinesssystems.com` -- esto era
  crítico revertir en el repo también, porque `pages.yml` copia este
  archivo en cada deploy y habría vuelto a cambiar el dominio en GitHub en
  el próximo push si se dejaba en `usekreaton.com`.
- `luma-config.js`: `LUMA_API_BASE_URL` vuelto a
  `https://luma-api.vmbusinesssystems.com`. **Este era el rompimiento más
  grave**: quedó apuntando a `https://api.usekreaton.com`, que nunca se
  llegó a configurar en Render (el paso 3 del plan original, "Render
  custom domain", no se había hecho todavía) -- o sea que durante toda la
  ventana del cutover, el login y la generación de sitios reales estaban
  rotos en producción aunque el sitio cargara.
- `backend/app/main.py`: cookie de sesión httpOnly vuelta a
  `domain=".vmbusinesssystems.com"`, `root_redirect()` (`GET /`) vuelto a
  `https://vmbusinesssystems.com/`.
- `cloudflare/subdomain-proxy-worker.js`: `ORIGIN_HOST` vuelto a
  `vmbusinesssystems.com`, ya que ese Worker vuelve a servir sitios
  generados desde el origin real de siempre.
- Tests: 39/39 pasan tras el revert.

**Lo que SÍ se queda como estaba (no es parte de lo revertido):**
usekreaton.com sigue siendo el dominio real para sitios generados de
clientes (`bathallday-abc123.usekreaton.com`, vía `persist_generated_site`
+ el Worker de subdominios) -- esa era la tarea original (#64-68) antes de
que la conversación escalara a "movamos todo el sitio", y sigue siendo
correcta y deseada. `CLIENT_ALLOWED_ORIGIN_REGEX` en `main.py` tampoco se
tocó, sigue cubriendo `*.usekreaton.com` para eso.

**Pendiente / abierto:**
- El DNS de usekreaton.com en Cloudflare quedó con los 4 registros `A` de
  apex + `www` CNAME apuntando a GitHub Pages (del cutover revertido) --
  ya no sirven para nada útil (GitHub ya no reconoce ese dominio como
  custom domain), pero tampoco rompen nada dejándolos ahí. Candidato a
  limpieza, no urgente.
- El Worker `kreaton-subdomain-proxy` y el registro wildcard `A * →
  192.0.2.1` (proxied) en usekreaton.com SÍ son parte del plan original y
  quedaron bien configurados -- pendiente confirmar en vivo que un sitio
  generado real resuelve correctamente en su subdominio.
- Antes de volver a proponer separar KREATON de V&M Business Systems en
  dominios distintos, la forma correcta es dividir el DESPLIEGUE (repo o
  pipeline de Pages separado para cada uno), no solo cambiar el custom
  domain de un repo que sirve a ambos. Es una decisión de arquitectura más
  grande, para otra conversación con calma, no algo para asumir a partir
  de una confirmación ambigua.

**Archivos tocados:** `CNAME`, `luma-config.js`, `backend/app/main.py`,
`cloudflare/subdomain-proxy-worker.js`, más el cambio manual (no versionado
en git) en GitHub → Settings → Pages.

**Notas para el siguiente agente:** si Beto vuelve a pedir "mover todo a
usekreaton.com" en el futuro, primero preguntar explícitamente qué pasa con
`contact.html` y las demás páginas generales de V&M Business Systems --
NO asumir que "la app" y "el repo completo" son lo mismo. Este incidente
pasó exactamente por esa ambigüedad.

---

## 2026-08-10 — Claude — Cutover completo de dominio: vmbusinesssystems.com → usekreaton.com

**Hecho:** Beto pidió sacar el servicio COMPLETO de vmbusinesssystems.com a
usekreaton.com ("no quiero errores ni mezclas"), no solo los subdominios de
sitios generados (ver la entrada de abajo, que fue el paso previo). Decisión
confirmada con Beto: apex `usekreaton.com` = la app real (reemplaza
vmbusinesssystems.com), `api.usekreaton.com` = backend (reemplaza
luma-api.vmbusinesssystems.com), vmbusinesssystems.com queda como redirect
(no se apaga del todo, por si hay links/marcadores viejos).

Cambios:
- `CNAME` (raíz del repo, lo que GitHub Pages lee para el custom domain):
  `vmbusinesssystems.com` → `usekreaton.com`.
- `luma-config.js`: `LUMA_API_BASE_URL` → `https://api.usekreaton.com`.
- `backend/app/main.py`:
  - `CLIENT_ALLOWED_ORIGINS`: se queda temporalmente con las entradas de
    vmbusinesssystems.com como red de seguridad durante la transición
    (sacarlas una vez Beto confirme que el redirect está 100% andando y
    nada llama a la API desde ese origin). `CLIENT_ALLOWED_ORIGIN_REGEX` ya
    cubre usekreaton.com apex + cualquier subdominio, no hizo falta tocarlo.
  - **Hallazgo importante que casi se pasa por alto:** la cookie de sesión
    httpOnly (`/api/client/auth/session`, `/api/client/auth/logout`) estaba
    con `domain=".vmbusinesssystems.com"` hardcodeado. Si el frontend se
    muda de dominio y esto no se actualiza, el login real de clientes se
    rompe en silencio (el browser nunca manda la cookie de vuelta, sin
    ningún error visible). Actualizado a `.usekreaton.com`.
  - `root_redirect()` (`GET /`, el fallback para el "Site URL" de Supabase
    OAuth) apuntaba a `https://vmbusinesssystems.com/` → actualizado a
    `https://usekreaton.com/`.
- `cloudflare/subdomain-proxy-worker.js`: `ORIGIN_HOST` → `usekreaton.com`
  (antes apuntaba a vmbusinesssystems.com como origin). Se eliminó el
  branch especial que devolvía un placeholder "coming soon" para el apex —
  ya no aplica: el apex ahora es la app real servida directo por GitHub
  Pages, este Worker solo intercepta `*.usekreaton.com/*` (subdominios),
  nunca el apex, así que no hay riesgo de loop.
- `admin.js`: placeholder de texto del input de dominio actualizado.
- `project-rebuild-kit/04-services-and-urls.md`,
  `scripts/playwright-live-smoke.js`: referencias de dominio actualizadas.
- Tests: 39/39 pasan (`backend/tests/`).

**Pendiente / abierto (decisiones de Beto, no tocado a propósito):**
- `contact.html` tiene ~13 direcciones de correo reales en
  `@vmbusinesssystems.com` (info@, ventas@, soporte@, etc.). NO se tocaron
  — cambiarlas requiere que Beto tenga esas casillas creadas en
  `@usekreaton.com` primero (es un paso de proveedor de correo, no de
  código). Si no existen todavía, cambiar el texto rompería el contacto
  real.
- `js/client-portal.js` y `js/client-portal-access.js` apuntan a
  `api.vmbusinesssystems.com` y `app.vmbusinesssystems.com` — investigado
  con DNS: esos hosts resuelven a una IP de DigitalOcean
  (`134.209.34.148`) y a una IP de Firebase Hosting (`199.36.158.100`)
  respectivamente, ninguna de las dos es parte del stack actual (Render +
  GitHub Pages). Son casi seguro remanentes de un prototipo anterior a
  LYRA/ai-builder que nunca se limpiaron del todo (`client-portal.html` /
  `client-portal-preview.html` siguen en el allowlist de
  `stage-public-site.mjs`, o sea que SÍ se sirven en producción aunque
  apunten a infraestructura muerta). No se tocó para no mezclar esta
  migración de dominio con una limpieza de código muerto — queda como
  candidato a tarea aparte.
- Infraestructura todavía sin ejecutar (requiere dashboard/API de
  Cloudflare + Render, no se puede hacer solo con código): DNS de
  usekreaton.com (CNAME apex + www a GitHub Pages, wildcard `*` para el
  Worker), Worker desplegado, dominio custom `api.usekreaton.com` agregado
  en Render, y el redirect de vmbusinesssystems.com → usekreaton.com en
  Cloudflare.

**Archivos tocados:** `CNAME`, `luma-config.js`, `backend/app/main.py`,
`cloudflare/subdomain-proxy-worker.js`, `admin.js`,
`project-rebuild-kit/04-services-and-urls.md`,
`scripts/playwright-live-smoke.js`.

**Notas para el siguiente agente:** si `contact.html` o `client-portal.js`
se tocan en el futuro, no asumas que es parte de "terminar" esta migración
de dominio — son decisiones de negocio/limpieza separadas, anotadas arriba
a propósito. Antes de dar por completo el cutover, confirmar que Beto
efectivamente configuró el DNS + Render + redirect (esto es infraestructura
externa, `git log` no lo va a mostrar).

---

## 2026-08-10 — Claude — usekreaton.com como dominio real de sitios generados

**Hecho:** Beto compró `usekreaton.com` (Cloudflare Registrar). Reemplacé el
placeholder `vmstores.com` (nunca existió, no resolvía a nada) por ese dominio
real en todo el backend:
- `backend/app/main.py`: las 3 rutas que generan `public_url`
  (`_get_or_create_store`, `persist_generated_site` x2) ahora usan
  `.usekreaton.com`. Agregué `CLIENT_ALLOWED_ORIGIN_REGEX` a `CORSMiddleware`
  (`^https://([a-z0-9-]+\.)*usekreaton\.com$`) porque cada sitio generado tiene
  su propio subdominio — una lista fija de `allow_origins` no alcanza, y
  `allow_credentials=True` + `allow_origins=["*"]` sigue prohibido por los
  navegadores, así que `allow_origin_regex` es la única forma correcta.
- `backend/app/domains.py`: `DomainSource` pasó de `"vmstores"` a `"kreaton"`,
  todos los chequeos de sufijo `.vmstores.com` → `.usekreaton.com`, y el string
  de cara al usuario `"V&M subdominios"` → `"KREATON"`.
- `backend/app/db_models.py`: defaults de `DomainReservation.source`/
  `.registrar` `"vmstores"` → `"kreaton"` (no lo lee nada crítico, es fallback).
- Tests actualizados (`test_domains.py`, `test_public_site.py`,
  `test_commerce_products.py`) — 19/19 pasan.
- Nuevo `cloudflare/subdomain-proxy-worker.js`: Worker que resuelve el
  problema real de fondo — GitHub Pages solo permite UN dominio custom por
  repo, no puede servir `*.usekreaton.com` directo. El Worker intercepta
  `*.usekreaton.com/*`, reenvía cada request al origin de GitHub Pages
  (`vmbusinesssystems.com`) preservando el hostname real en el browser
  (`window.location.hostname`), y `/` resuelve a `/site.html`. Así
  `site-viewer.js` sigue funcionando sin cambios: lee el hostname real y
  llama `GET /public/resolve-site?host=<subdominio>` contra
  `luma-api.vmbusinesssystems.com`.

**Pendiente / abierto:**
- El Worker está en el repo pero **no desplegado todavía** — requiere acceso
  al dashboard de Cloudflare de Beto (crear el Worker, bindear la ruta
  `*.usekreaton.com/*`, y agregar el registro DNS comodín `*` proxied). Son
  pasos manuales que le quedan pendientes a Beto; instrucciones dadas aparte
  en el chat.
- `domains.py` (búsqueda/reserva de dominio custom) sigue sin integración real
  de registrador (`Registrar API` es un placeholder) y sin frontend que lo
  consuma — solo el dominio incluido (`usekreaton.com`) es real ahora mismo.
- Sin pago real: `reserve_domain()` marca `purchase_status="active"` sin
  cobrar nada — deliberadamente diferido, no es parte de este cambio.

**Archivos tocados:** `backend/app/main.py`, `backend/app/domains.py`,
`backend/app/db_models.py`, `backend/tests/test_domains.py`,
`backend/tests/test_public_site.py`, `backend/tests/test_commerce_products.py`,
`cloudflare/subdomain-proxy-worker.js` (nuevo).

**Notas para el siguiente agente:** si `usekreaton.com` alguna vez deja de ser
el dominio incluido (por ejemplo si Beto compra `kreaton.com` más adelante y
quiere migrar), el único lugar donde el sufijo está hardcodeado es
`domains.py` (`normalize_domain_input`, `domain_base`,
`build_domain_candidates`, `domain_price_for`, `check_domain_availability`) +
`main.py` (`persist_generated_site`, `_get_or_create_store`,
`CLIENT_ALLOWED_ORIGIN_REGEX`) — no hay una constante única todavía, así que
hay que tocar los dos archivos a mano.

---

## 2026-07-20 — Codex — Carrusel 3D para selector de plantillas

**Hecho:** Mejoré el selector visual de plantillas en `ai-builder` con un
efecto coverflow/3D aplicado a las tarjetas existentes. No se copiaron assets ni
código del prototipo externo; se mantuvieron los datos actuales de
`TemplateRouter` / `templates/all-templates.json`.
- `ai-builder.js`: el carrusel calcula la tarjeta activa según el centro del
  scroll y escribe variables CSS por tarjeta (`rotate`, `scale`, `depth`,
  `opacity`). También permite centrar tarjetas con click/Enter/Espacio.
- `ai-builder.js`: el botón `Preview` ahora selecciona directamente el `choice`
  renderizado, para que opciones provenientes de `TemplateRouter` sin metadata
  duplicada en `templatePreviewMeta()` también funcionen.
- `ai-builder.js`: el carrusel del editor principal dejó de renderizar los
  paths legacy de stock (`apple_2.png`, `services_2.png`, etc.) como `<img>`;
  ahora usa el mismo mini-preview DOM por template que la superficie pública,
  con paleta propia por `templateId`.
- `ai-builder.css`: agregué las clases `template-coverflow-track/card` con
  `perspective`, `rotateY`, escala, transición suave, ajuste móvil y
  `prefers-reduced-motion`.
- `ai-builder.html` y `client/setup/index.html`: el toggle Desktop/Mobile quedó
  como botones de solo ícono con `aria-label`/`title`.
- Panel de Lyra: agregadas las secciones "Mejoras sugeridas" y "Cambios
  recientes"; el contenido se actualiza desde `currentSchema`,
  `revision_history`, `design_review` y el estado del editor.

**Pendiente / abierto:** No se hizo push. Las capturas de aprobación se tomaron
con Playwright/Edge porque el in-app browser bloqueó localhost.

**Verificado:** `node --check ai-builder.js` OK y `git diff --check` sin
errores. QA visual en `http://127.0.0.1:8139/ai-builder.html` y
`http://127.0.0.1:8139/client/setup/index.html` con Edge headless: carrusel
coverflow activo en ambas superficies, 0 imágenes `<img>` stock dentro del
carrusel renderizado, mini-previews DOM por tarjeta, toggles Desktop/Mobile sin
texto visible y panel Lyra con mensaje, checklist, "Mejoras sugeridas" y
"Cambios recientes". Vista móvil 390x844 sin overflow horizontal.

**Archivos tocados:** `ai-builder.js`, `ai-builder.css`, `ai-builder.html`,
`client/setup/index.html`, `docs/AGENT_LOG.md`.

---

## 2026-07-20 — Claude — Limpieza: código muerto de commerce.py + archivos sueltos

**Hecho (segunda pasada, misma sesión):**
- Confirmé que `templates/templateRegistry.js` y `templateRegistry.ts` eran
  código muerto idéntico entre sí (ninguna importada por nada) -- el sistema
  real (`template-router.js`, cargado en `ai-builder.html`) lee
  `templates/all-templates.json` directamente. Las borré ambas.
- `handoff/` (paquetes de contexto de una sola vez armados para dar a Claude y
  a Gemini acceso a un prototipo que no podían abrir por URL -- ver
  `handoff/claude-ai-site-builder/HANDOFF_FOR_CLAUDE.md` para el detalle
  completo) sigue en disco (51MB, capturas + zips), pero ya no está trackeado
  en git (`git rm -r --cached handoff` + agregado a `.gitignore`). No se borró
  el contenido, solo se sacó del repo.

**Hecho:**
- `backend/app/commerce.py`: quité `BUSINESSES`, `PRODUCTS`, `ORDERS`,
  `reserved_quantity()`, `available_stock()` y `deduct_inventory_for_order()` —
  quedaron huérfanos después de que Fase 1/Fase 2 conectaron todo a la DB
  real. `cart_response()` ya no tiene la rama en memoria; `session` pasó a ser
  obligatorio (todos los call sites ya lo pasaban). `BUSINESS_ID` se mantiene
  porque `/customer/me` y `/customer/addresses` (fuera de alcance de Fase 1/2)
  todavía lo usan como placeholder.
- Borré ~70 archivos `.err.log`/`.out.log` de servidores de prueba locales
  (estaban trackeados en git desde un commit viejo "chore: commit pending
  project artifacts") y 3 scripts de depuración `.codex_tmp_*.js` que también
  quedaron commiteados por accidente ese mismo día. Ese commit también había
  metido copias completas de `backend/app/*.py` dentro de `.codex_tmp/` y
  `.codex_tmp_salesflow_fix/` — también fuera.
- Agregué `*.err.log`, `*.out.log`, `.codex_tmp*` y `.pytest_cache/` al
  `.gitignore` para que esto no vuelva a pasar.
- Borré (solo local, nunca estuvieron en git) ~50MB de perfiles de Edge de
  pruebas de automatización de navegador dentro de
  `templates/marketplace/mega-marketplace/phase-5/visual-prototype/` y
  `output/edge-test-profile` — ya estaban en `.gitignore` desde antes, pero
  seguían ocupando espacio en disco.

**Pendiente / abierto:**
- Sigue sin explicación un puñado de archivos modificados en el working tree
  que no tocamos nosotros: `client-portal-preview.html`, `client-portal.html`,
  `client.css`, `client/setup/index.html`, `contact.html`,
  `css/interactive.css`, `css/styles.css`, `index.html`, `js/*.js`,
  `plans.html`, `services.html`, `site.html`, `solutions.html`,
  `src/components/NixieAvatarController.css`. No sé si son cambios reales a
  medias o efecto secundario de alguna herramienta local -- antes de tocarlos
  hay que revisar el diff de cada uno con calma.
- Quedaron dos carpetas `.codex_tmp/` y `.codex_tmp_salesflow_fix/` vacías
  (todo su contenido tracked ya se borró) excepto por una subcarpeta
  `.pytest_cache/` interna que el entorno de Claude no pudo ni leer
  (permiso denegado incluso para `stat`) -- no estaba tracked en git así que
  no bloquea nada, pero alguien con acceso normal al filesystem debería
  poder borrar esas dos carpetas vacías a mano.
- `templates/templateRegistry.js` y `templateRegistry.ts` conviven en la
  misma carpeta -- probablemente uno es el que corre de verdad y el otro es
  un resto de una migración a TypeScript sin terminar. No confirmado cuál.
- No se hizo commit/push de nada de esto (mismo problema de índice de git
  corrupto en el sandbox de Claude que ya está documentado en entradas
  anteriores) -- queda para Codex.

**Archivos tocados:** `backend/app/commerce.py`, `.gitignore`, borrado de
~70 archivos de log + 3 scripts `.codex_tmp_*.js` + contenido de
`.codex_tmp/` y `.codex_tmp_salesflow_fix/` + carpetas de perfil de Edge
(no trackeadas).

---

## 2026-07-20 — Codex — Storefront real + orders reales sin Stripe live

**Hecho:** Se empujó primero el fix ya revisado de login/modal en `main`:
commit `80d811e` (`fix: improve client login modal`). Después se migró el
paso 1 de commerce:
- `assert_business()` ahora valida tiendas reales en `stores`.
- El storefront público (`home`, `categories`, `featured-products`, `products`,
  `product_detail`, `related`) lee `Store`/`Product` reales con
  `db_product_to_api()` en vez de `BUSINESSES`/`PRODUCTS` en memoria.
- El carrito sigue en memoria, pero agrega/actualiza/cotiza validando contra
  filas reales de `products` por `store_id + product_id`.
- Checkout/manual order crean filas reales en `orders`, buscan o crean
  `customers` por `store_id + email`, guardan snapshots JSON y descuentan
  `products.inventory` en la misma operación.
- `owner_orders`, `owner_payments`, `owner_shipping`,
  `owner_update_order_status`, `owner_update_payment_methods`,
  `owner_update_shipping` y `owner_audit_log` ahora usan
  `Authorization: Bearer <token>` con `require_store_owner()`.
- El dashboard del owner ya calcula ventas, órdenes abiertas y pagos pendientes
  desde `orders`.
- Si un owner cambia una orden a `cancelled`, `refunded` o `failed`, el backend
  restaura una sola vez el inventario descontado y marca `inventory_restocked`
  para evitar doble suma en cambios repetidos de status.

**Pendiente / abierto:** Stripe/pagos en vivo siguen fuera de alcance. Payment
methods siguen como configuración en memoria hasta definir persistencia de
métodos/conectores. El carrito tampoco se persiste, por decisión explícita de
esta fase.

**Archivos tocados:** `backend/app/commerce.py`, `backend/app/db.py`,
`backend/app/db_models.py`, `backend/tests/test_commerce_products.py`,
`docs/AGENT_LOG.md`.

**Verificado:** `py_compile` OK, import de app completa OK y
`PYTHONPATH=backend .venv\Scripts\python.exe -m pytest backend\tests` -> 19
tests OK.

---

## 2026-07-20 — Codex — Store owner products connected to real account stores

**Hecho:** Fase 1 del backend de tienda conectada a cuentas reales para
productos:
- `backend/app/commerce.py` ahora valida `Authorization: Bearer <token>` en
  `GET /api/v1/store-owner/{business_id}/dashboard`,
  `GET /api/v1/store-owner/{business_id}/products`,
  `POST /api/v1/store-owner/{business_id}/products` y
  `PATCH /api/v1/store-owner/{business_id}/products/{product_id}`.
- La autorización verifica que `stores.id == business_id` pertenezca al usuario
  autenticado por `owner_user_id`, con fallback por `owner_email`, igual que el
  patrón de proyectos del cliente.
- Los productos del owner ya no leen/escriben el dict en memoria `PRODUCTS`;
  ahora usan la tabla real `products` vía SQLAlchemy y `Depends(get_session)`.
- Se agregó conversión `price` dólares ↔ `price_cents` y `stock` ↔ `inventory`
  para mantener compatible el contrato actual del frontend.
- El dashboard ya calcula `lowStock` desde la tabla real `products`.

**Pendiente / abierto — Fase 2:**
- `salesToday`, `openOrders` y `pendingPayments` quedan en `0` temporalmente
  porque `ORDERS`, carts, checkout y payments siguen en memoria por diseño de
  esta fase. Migrarlos requiere revisar dinero real, estados de pago y reserva
  de inventario por separado.
- El storefront público, carts, customer endpoints, payments, shipping y audit
  log siguen usando las estructuras demo en memoria para no romper el flujo que
  ya funcionaba.
- La tabla `products` actual solo tiene campos base (`name`, `category`,
  `price_cents`, `inventory`, `status`). Si se quiere persistir descripción,
  SKU, imagen, badges o specs desde el panel visual, hace falta una migración
  aditiva posterior.

**Archivos tocados:** `backend/app/commerce.py`, `docs/AGENT_LOG.md`.

---

## 2026-07-19 — Claude — Review del trabajo de Codex (multi-proyecto) + bug real encontrado: Google seguía escondido

**Contexto:** Beto le pasó a Codex el prompt de multi-proyecto (ver entrada
de abajo, "Storage real..." no, la de "Responsive del builder... + login
real con Google"). Codex reportó que ya lo implementó todo, pero Beto seguía
viendo la pantalla de login pidiendo solo el correo, sin opción de Google.

**Review del trabajo de Codex (backend) -- sólido, sigue el plan:**
- `backend/app/main.py`: `_project_owner_filter()` (filtra por
  `owner_user_id` O `owner_email`, con fallback razonable),
  `_get_or_create_store()`, `persist_generated_site()` (crea una fila nueva
  en `GeneratedSite` si no hay id, actualiza si sí lo hay -- exactamente la
  semántica de `saveGeneratedSite()` del prototipo de Codex original),
  `GET /api/client/projects` (lista por dueño) y
  `GET /api/client/projects/{project_id}` (detalle + schema guardado). Todo
  bien escrito, sigue el patrón que se le pidió.
- `persist_generated_site()` ya está conectado al flujo real de generación
  (línea ~862, se llama sólo si hay `auth_user`).

**El problema real -- no es de Codex, es un bug preexistente que nadie había
detectado porque antes Google ni siquiera funcionaba:**
- `ai-builder.js` no tiene NINGÚN código que llame a
  `/api/client/projects` ni pinte una lista de páginas -- Codex hizo el
  backend completo pero no tocó el frontend en absoluto. Por eso "se ve
  todo igual": el backend ya soporta varios proyectos, pero no hay UI que
  lo muestre.
- Y por separado, encontré la razón real de por qué Google no aparece:
  cuatro sitios distintos en `ai-builder.js` (el gate de auth se abre desde
  varios puntos: `initClientIntakeSessionGate`, `lockClientWorkspace`,
  `captureClientAuthResetIntent`, y `openStudioAuthGate` mismo) tenían
  `studioGoogleAuthButton.hidden = isPublicClientSetup` (o `= true` directo
  en un caso) -- es decir, para el flujo público de cliente (`ai-builder.html`
  con `data-context="client-setup"`, que es exactamente donde entra
  cualquier cliente real) el botón de Google se escondía siempre, dejando
  sólo el de email visible. Esto es código viejo, de antes de esta sesión
  -- nadie lo notó porque hasta hace un rato Google tampoco funcionaba (el
  link apuntaba a un endpoint que no existía), así que esconder un botón
  roto no se notaba. Ahora que Google sí funciona, este era el bloqueador
  real.

**Fix (`ai-builder.js`, 4 sitios):** Google ya no se esconde para clientes
públicos (`studioGoogleAuthButton.hidden = false` siempre). Apple se queda
escondido para clientes públicos hasta que Beto lo habilite en Supabase
(mostrarlo hoy sería un callejón sin salida).

**Pendiente / abierto:**
- **El panel de "mis páginas" sigue sin existir en el frontend.** El
  backend de Codex ya está listo para consumirse
  (`GET /api/client/projects`), pero hace falta: (a) pantalla/lista que
  llame ese endpoint después del login, (b) botones "continuar" (carga
  `GET /api/client/projects/{id}` y restaura el schema) / "nueva página",
  (c) mandar `generatedSiteId` en el request de generación cuando el
  cliente está editando un proyecto existente (hoy `persist_generated_site`
  ya sabe recibirlo, pero nada en el frontend lo envía todavía). Es la
  única pieza que falta para que el multi-proyecto sea usable de verdad.
- No probado en navegador real (mismo límite de siempre en este entorno) --
  Beto debería confirmar que el botón de Google ya aparece antes de seguir
  con el panel de proyectos.

**Archivos tocados esta entrada:** `ai-builder.js` (fix de visibilidad de
Google, 4 sitios). El trabajo de Codex tocó `backend/app/main.py`,
`backend/app/db_models.py`, y otros -- ver su propia entrada en esta
bitácora si la agregó.

**Notas para el siguiente agente:** antes de construir el panel de "mis
páginas", confirma con Beto que ya puede ver y usar el botón de Google en
el navegador real -- este fix no se verificó visualmente.

---

## 2026-07-19 — Codex — Panel "Mis páginas" y persistencia multi-proyecto por cliente

**Hecho:** se integró el flujo para que un cliente autenticado con Supabase/Google pueda tener varias páginas generadas bajo la misma cuenta. El backend ahora valida el bearer token, lista proyectos del usuario, devuelve detalle de cada proyecto y guarda/actualiza cada generación en `GeneratedSite` con `owner_user_id`/`owner_email`. El frontend ahora intenta restaurar sesión real por token antes que un borrador local, muestra un panel "Mis páginas" cuando hay varios proyectos, permite continuar un proyecto existente o crear uno nuevo sin borrar la autenticación, y envía `generatedSiteId/projectId` + Authorization al generar.

**Pendiente / abierto:** `client_intake_sessions` sigue en memoria del proceso Render; sirve para continuidad corta, pero debe moverse a DB si queremos persistencia real entre deploys/restarts. El panel no reemplaza todavía un dashboard completo de cliente con edición/publicación avanzada.

**Archivos tocados:** `ai-builder.js`, `ai-builder.css`, `backend/app/main.py`, `backend/app/models.py`, `backend/app/db.py`, `backend/app/db_models.py`, `backend/app/client_auth.py`.

**Notas para el siguiente agente:** no usar `git add .`: el repo tiene muchos logs/previews sin trackear. Stagear solo los archivos funcionales. Si se prueba en producción, verificar `GET /api/client/projects` con token válido y confirmar que `/ai/website-builder` retorna `generatedSiteId`.

## 2026-07-19 — Claude — Responsive del builder de Lyra + login real con Google (Supabase Auth)

**Contexto:** Beto reportó dos problemas nuevos en la misma sesión: (1) el
chat de Lyra no se adapta a NINGÚN dispositivo que no sea desktop -- probó en
tablet y "se monta todo, los botones se mueven"; (2) un "gran gran problema":
el sistema no distingue si la cuenta es diferente, simplemente jala lo mismo,
y si un cliente quiere trabajar en varias páginas a la vez no hay forma de
saber dónde está "porque no crea cuentas realmente". Pidió arreglar ambos, y
para cuentas específicamente pidió login real con Google/Apple "como
cualquier otro servicio en línea".

**1) Responsive -- causa raíz encontrada:**
`ai-builder.css` tiene breakpoints en 640/760/1040/1100px, pero el chrome del
builder (`.guided-shell`, con un rail de pasos de `200px` fijo, y
`.guided-header`/`.guided-header-actions` con varios botones + un `<select>`
de 180px en una sola fila sin `flex-wrap`) **nunca se ajustaba en ningún
breakpoint** -- ni el rail fijo ni el header se tocaban hasta los 760px
(tamaño de teléfono), dejando un hueco total entre ~761px y desktop (todo el
rango real de tablets) sin ningún ajuste, y en tablet/desktop chico el rail
de 200px + botones sin wrap simplemente se superponían.

**Fix (`ai-builder.css`):**
- `flex-wrap: wrap` agregado a `.guided-header` y `.guided-header-actions`
  como red de seguridad a CUALQUIER ancho -- nunca más deberían montarse
  botones, en el peor caso bajan a una segunda fila.
- Nuevo `@media (max-width: 1024px)` (línea ~233), acotado sólo a los
  selectores `guided-*` del chrome del builder (no se tocó el bloque de
  760px existente, que es compartido con componentes no relacionados,
  incluyendo plantillas de sitios ya generados -- ampliarlo hubiera sido
  mucho más riesgoso). Convierte `.guided-shell` de `200px + 1fr` en
  columnas a una sola columna con el rail arriba en fila horizontal
  angosta (scroll horizontal, sólo números, sin las etiquetas de texto de
  cada paso vía `.grs-label { display:none }`).
- **No verificado visualmente en navegador real** -- lo confirmé leyendo el
  archivo real (no la copia stale del sandbox de bash, ver notas de
  sesiones anteriores) y razonando sobre las reglas CSS, pero no hay forma
  de levantar el sitio real desde este entorno para tomar screenshots.
  Pedirle a Beto o a Codex que lo pruebe en tablet real antes de darlo por
  cerrado.

**2) Cuentas -- causa raíz encontrada (más profunda de lo esperado):**
- `continueWithEmailAuth()` en `ai-builder.js` (línea ~13671) sólo valida
  que el texto tenga forma de email -- cero contraseña, cero código de
  verificación, cero magic link. Cualquiera que escriba el mismo correo
  entra directo a lo que sea que haya guardado ahí. No es un bug, es que
  nunca se construyó autenticación real.
- `Store.owner_email` en `backend/app/db_models.py` tenía
  `UniqueConstraint("owner_email")` -- un correo sólo podía tener UNA
  tienda/proyecto para siempre, aunque la autenticación fuera real.
- `client_intake_sessions` en `main.py` sigue siendo un diccionario de
  Python en memoria (se pierde completo en cada redeploy de Render).
- Los botones de Google/Apple en el auth gate ya existían en el HTML pero
  apuntaban a `window.LUMA_GOOGLE_AUTH_URL`/`LUMA_APPLE_AUTH_URL`, que
  nunca se definían en ningún lado -- siempre caían al fallback
  `/api/client/auth/oauth/{provider}`, un endpoint que no existe en el
  backend. Login con Google/Apple estaba 100% roto.
- Revisé el dashboard de Supabase directamente: **Google ya está habilitado
  y configurado** (Client ID + Secret ya cargados, probablemente por
  Codex). Apple está deshabilitado -- requiere que Beto se inscriba en
  Apple Developer Program (cuenta/pago propio) y genere sus credenciales;
  eso no lo puede hacer un agente.

**Fix implementado (Google ahora, Apple queda pendiente de que Beto haga su
setup en Apple Developer):**
- `backend/app/client_auth.py` (nuevo): `fetch_supabase_user(access_token)`
  -- en vez de verificar el JWT localmente (necesitaría manejar
  JWKS/rotación de llaves), hace proxy a `GET {SUPABASE_URL}/auth/v1/user`
  de Supabase con el token del cliente. Ventaja sobre verificar
  localmente: también respeta sesiones cerradas/revocadas, no sólo la
  firma.
- `backend/app/main.py`: nuevo `GET /api/client/auth/me` -- el frontend ya
  lo llamaba (`fetchClientAuthUser()`), simplemente no existía. Ahora
  responde 401 si el token es inválido/expiró, 503 si Supabase no está
  configurado, o el usuario real (id, email, userMetadata) si es válido.
- `ai-builder.js`: nueva constante `SUPABASE_AUTH_URL` (URL pública del
  proyecto Supabase, incluida en el JS -- mismo nivel de confianza que la
  key `anon`, no es secreto). `continueWithStudioAuth(provider)` reescrito
  para construir directamente
  `${SUPABASE_AUTH_URL}?provider=google&redirect_to=...` en vez de
  depender de globals que nunca se definían. El flujo de vuelta
  (`captureStudioAuthRedirect()`, que ya sabía leer `access_token`/
  `refresh_token` del hash de la URL) no necesitó cambios -- ya esperaba
  exactamente ese formato, señal de que esto se diseñó para Supabase desde
  el inicio y sólo faltaba conectar los cables.
- `backend/app/db_models.py`: quitado `UniqueConstraint("owner_email")` de
  `Store`, agregada columna `owner_user_id` (nullable, indexada) para
  guardar el id real de Supabase (`user.id`) y usarlo como identidad de
  ahora en adelante en vez del email. Cambio seguro/aditivo: nada lee de
  esta tabla todavía (ver docstring del módulo).

**Pendiente / abierto -- la pieza más grande que falta:**
- **Selector de proyectos ("mis páginas")**: no existe ningún UI para que
  un cliente vea sus proyectos existentes y elija continuar uno o empezar
  otro. Hoy, aunque el login ya sea real, el flujo de intake sigue
  resumiendo "el" único borrador asociado -- falta: (a) endpoints
  backend para listar/crear `Store`/`GeneratedSite` por `owner_user_id`,
  (b) migrar `client_intake_sessions` de memoria a la base de datos real
  (SQLAlchemy, ya existe la capa) para que sobreviva redeploys y soporte
  varios proyectos en paralelo, (c) una pantalla o panel nuevo en
  `ai-builder.js`/`ai-builder.html` para elegir/crear proyecto. Es
  trabajo de UI + backend considerable, no se tocó esta sesión por su
  tamaño -- recomiendo que sea su propia sesión dedicada.
- Apple login: código ya compatible (mismo `SUPABASE_AUTH_URL` con
  `provider=apple`), sólo falta que Beto habilite el provider en Supabase
  con sus credenciales de Apple Developer.
- El fix responsive no se vio en navegador real, sólo se razonó sobre el
  CSS -- falta confirmación visual en dispositivo real.

**Archivos tocados:** `ai-builder.css`, `ai-builder.js`,
`backend/app/client_auth.py` (nuevo), `backend/app/main.py`,
`backend/app/db_models.py`.

**Notas para el siguiente agente:** si retomas el selector de proyectos,
empieza por decidir la forma del endpoint (`GET /api/client/projects?
ownerId=`, `POST /api/client/projects`) y cómo se relaciona con
`client_intake_sessions` -- probablemente conviene fusionarlos en una sola
tabla en vez de mantener dos sistemas de sesión paralelos (el dict en
memoria y las tablas SQLAlchemy).

---

## 2026-07-19 — Claude — Storage real: endpoint de subida de assets + cliente de Supabase Storage

**Contexto:** Beto notó que `GET /api/ai-status` devuelve
`storageConfigured: false` y preguntó por qué. Investigación (sin tocar
código, según pidió) confirmó dos huecos, no uno: (1) `storage_is_configured()`
en `backend/app/main.py` ya buscaba `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
pero nunca se instanciaba ningún cliente real; (2) el frontend
(`ai-builder.js::uploadAssetFile`) ya llama a
`POST /api/admin/assets/upload` esperando `{url}` de vuelta, pero ese
endpoint no existía en el backend en absoluto. Como resultado, toda foto/logo
que el cliente sube cae en el fallback silencioso a base64 embebido
(`fileToOptimizedDataUrl`) -- nunca llega a storage persistente.

**Fix implementado (Beto ya tenía el proyecto de Supabase creado, solo
faltaba conectar el backend):**
- `backend/app/storage.py` (nuevo): cliente sync contra la API REST de
  Supabase Storage (`POST /storage/v1/object/{bucket}/{path}` con
  `Authorization: Bearer <service_role_key>`), sin agregar el SDK completo
  de Supabase -- solo `httpx`. Incluye `parse_data_url()` (decodifica el
  `data:` URL en base64 que ya arma el frontend) y
  `upload_asset_to_supabase()` (sube el archivo a
  `{businessId}/{siteId}/{assetType}/<uuid>-<fileName>` y devuelve la URL
  pública `.../object/public/{bucket}/{path}`).
- `backend/app/models.py`: nuevos `AssetUploadRequest` / `AssetUploadResponse`
  con exactamente los campos que el frontend ya envía
  (`businessId, siteId, assetType, fileName, contentType, dataUrl, label`).
- `backend/app/main.py`: nuevo `POST /api/admin/assets/upload`. Si Supabase
  no está configurado responde 503 (para que el frontend caiga a su
  fallback existente en vez de mostrar una URL rota); si `dataUrl` es
  inválido, 400; si Supabase rechaza la subida, 502 con el detalle. Sin capa
  de auth nueva -- ningún endpoint de este backend valida el header
  `x-admin-token` que manda el frontend todavía (gap pre-existente, no
  introducido acá).
- `backend/requirements.txt`: se agregó `httpx>=0.27,<1`.
- Cero cambios en `ai-builder.js` -- el frontend ya estaba listo para esto
  desde antes, solo le faltaba que el endpoint existiera.

**Pendiente / abierto:**
- **Beto tiene que hacer esto en Supabase y en Render (yo no puedo crear
  cuentas ni tocar variables de entorno por él):**
  1. En el dashboard de Supabase → Storage → crear un bucket. Nombre
     sugerido: `site-assets` (si usa otro nombre, hay que setear
     `SUPABASE_STORAGE_BUCKET` en Render). Marcarlo como **público** (Public
     bucket) para que las URLs `.../object/public/...` sirvan directo sin
     firmar cada request.
  2. En Supabase → Settings → API: copiar `Project URL` y la
     `service_role` key (NO la `anon` key -- esa no tiene permiso de
     escritura).
  3. En Render → el servicio del backend → Environment: agregar
     `SUPABASE_URL` (el Project URL) y `SUPABASE_SERVICE_ROLE_KEY` (la
     service role key). Con eso `storageConfigured` pasa a `true` solo, sin
     tocar código.
  4. Deploy/redeploy en Render para que tome las variables nuevas.
- No se implementó el caso `assetType === "video"`: el frontend ya trata
  video aparte (no cae a base64 si falla), pero el endpoint nuevo sí acepta
  cualquier `assetType` sin distinción especial -- debería funcionar igual,
  no se probó específicamente con archivos de video.
- No hay límite de tamaño de archivo en el endpoint nuevo (el frontend sí
  limita video a 12MB antes de intentar, pero fotos/logos no tienen tope
  explícito del lado backend).
- Catálogo de imágenes semilla (`image_assets.py`, seed products) sigue
  usando URLs externas de Unsplash -- esto NO se tocó. Este cambio solo
  resuelve el pipeline de subida real de fotos/logos que el cliente sube él
  mismo, no las imágenes placeholder que Lyra genera para productos de
  muestra. Serían dos proyectos separados si se quiere una librería propia
  también para las imágenes semilla.
- No se implementó autenticación real en `/api/admin/assets/upload` ni en
  ningún otro endpoint `/api/admin/*` -- sigue siendo el mismo gap ya
  documentado antes (junto con `/api/client/auth/me` y
  `/api/client/auth/oauth/{provider}`, que tampoco existen).

**Archivos tocados:** `backend/app/storage.py` (nuevo),
`backend/app/models.py`, `backend/app/main.py`, `backend/requirements.txt`.

**Notas para el siguiente agente:** no se corrió `generate_ai_seed_catalog`
ni este endpoint contra credenciales reales de Supabase (no disponibles en
este sandbox) -- verificado por lectura de código e inspección de la forma
exacta del request/response, no por prueba end-to-end. Cuando Beto conecte
las variables en Render, vale la pena confirmar en el navegador que subir
una foto de cliente real efectivamente devuelve una URL de Supabase (no un
`data:` URL) y que `GET /api/ai-status` muestra `storageConfigured: true`.

---

## 2026-07-19 — Claude — Clasificación de nicho abierta (backend): reemplaza catálogo "default" ciego por generación vía IA

**Contexto:** Beto reportó que Lyra sigue mostrando nombres e imágenes de
producto "súper random" que no tienen nada que ver con lo que el cliente
describe (ej. si dice "accesorios de barco" o "pesca" o "deportes
extremos"). Pidió entender por qué y arreglarlo de raíz, no con otro parche
más.

**Causa raíz encontrada:** `infer_seed_profile()` en `backend/app/taxonomy.py`
es un clasificador por regex con solo ~9 categorías reconocidas (jewelry,
fashion, coffee, auto, tech, beauty, home, restaurant, marketplace).
Cualquier negocio que no encaje ahí (barcos, pesca, deportes extremos,
literalmente cualquier nicho no anticipado) cae en `"default"`, que en
`backend/app/agents.py::semantic_seed_catalog()` devuelve un catálogo
hardcodeado sin relación alguna con el negocio real (bolso tote, bandeja de
escritorio, etc.). Esto es un fallback determinista (`CatalogAgent`, usado
cuando `OpenAISitePlanAgent` -- el planificador real con IA -- no está
disponible o falla), pero como cualquier nicho fuera de esas 9 categorías
cae aquí, en la práctica se activa muy seguido para negocios "raros".

**Fix implementado (`backend/app/agents.py`):**
- Nueva función `generate_ai_seed_catalog(context, language, count)`: le
  pide directamente al modelo (cliente SYNC de OpenAI, `gpt-4o-mini` por
  defecto, `OPENAI_SEED_CATALOG_MODEL`/`OPENAI_MODEL` configurables) un
  catálogo de muestra realista para el nicho exacto que describió el
  cliente -- sin restringirlo a una lista cerrada. Devuelve `None` (nunca
  lanza excepción) si no hay `OPENAI_API_KEY`, el paquete `openai` no está
  disponible, o la llamada falla por cualquier razón -- en ese caso el
  llamador cae al catálogo estático de siempre, cero cambio de
  comportamiento.
- `semantic_seed_catalog()`: cuando `infer_seed_profile()` devuelve
  `"default"`, ahora intenta primero `generate_ai_seed_catalog()`. Si
  devuelve contenido, se usa (nombres, categorías, descripciones y
  keywords de imagen específicos del nicho real). Si no, cae al catálogo
  estático `default` de siempre. Los demás perfiles (auto, jewelry,
  fashion, etc.) no se tocaron -- siguen exactamente igual.
- **Decisión de diseño importante:** se usa el cliente SYNC de OpenAI
  (`OpenAI`, no `AsyncOpenAI`) y la función se queda como `def` normal, no
  `async def`, aunque se llama desde código async (`CatalogAgent.run`).
  Intenté inicialmente hacerla async, pero `semantic_seed_catalog()` se
  llama desde varios lugares en `agents.py`/`ai_site_planner.py`/`main.py`
  que NO son todos async -- encadenar async por toda esa cadena de
  llamadas es una cirugía mucho más grande y arriesgada que aceptar una
  llamada bloqueante ocasional (con timeout de 12s) en el único camino
  donde de verdad se necesita (nicho no reconocido, la mayoría de
  requests nunca llegan aquí). Documentado en el docstring de la función
  para que el siguiente agente no la "arregle" haciéndola async sin ver
  este contexto.

**Verificación:** no se pudo ejecutar la suite de tests contra el archivo
real por el problema ya documentado de contenido obsoleto/truncado que
sirve el sandbox de bash para archivos editados (esta vez incluso afectó
archivos que NUNCA fueron editados, como `taxonomy.py`/`image_assets.py`,
al copiarlos -- parece ser un problema más amplio de sincronización del
mount, no solo de `Edit`). Se armó un entorno de prueba aislado con el
contenido verificado por el host (Read tool) y se confirmó: (1) categorías
ya reconocidas (auto, marketplace) generan exactamente el mismo resultado
que antes -- cero regresión; (2) un nicho no reconocido ("accesorios de
pesca y embarcaciones") sin `OPENAI_API_KEY` cae de forma segura al
catálogo estático, sin crashear; (3) `generate_ai_seed_catalog()` sin API
key devuelve `None` limpiamente. No se pudo probar la llamada real a
OpenAI (no hay API key en el sandbox) -- eso solo se puede confirmar en
producción o con una key de prueba.

**Pendiente / abierto:**
- Confirmar con una key real de OpenAI en un entorno de prueba que el
  catálogo generado por IA realmente sale bien formado end-to-end (schema,
  precios, imágenes).
- La imagen del producto sigue usando la tabla fija de keywords
  (`image_assets.py::stable_seed_image_url`) aunque el nombre/categoría ya
  sea correcto vía IA -- si el `imageSearchQuery` generado no matchea
  ningún regex de esa tabla, la FOTO sigue siendo el fallback genérico
  aunque el NOMBRE del producto ya sea correcto. No se tocó esta parte.

**Archivos tocados:** `backend/app/agents.py` (imports, nueva función
`generate_ai_seed_catalog`, rama `elif profile == "default"` en
`semantic_seed_catalog`).

---

## 2026-07-19 — Claude — Frontend: preview en vivo del chat ya no rellena con catálogo random cuando el nicho no matchea

**Contexto:** seguimiento directo de la entrada anterior. El backend ya no
usa un catálogo genérico desconectado para nichos no reconocidos, pero el
preview EN VIVO del chat (lo que Beto ve mientras conversa con Lyra, antes
de generar el sitio) corre por su cuenta en `ai-builder.js` y tiene su
propio clasificador duplicado (`inferSemanticSeedProfile`,
`SEMANTIC_SEED_PRODUCT_LIBRARY`) con las mismas ~9 categorías cerradas y el
mismo fallback genérico (bolso tote, bandeja de escritorio) para cualquier
nicho no reconocido. Esto es probablemente lo más visible de "random"
porque se ve en tiempo real, antes de generar nada.

**Fix implementado (bajo riesgo, quirúrgico -- NO se tocó la lógica de
merge/reemplazo existente, que es más frágil y corre en cada mensaje del
chat):**
- Nueva función `buildContextDerivedSeedProducts(contextText, language)`
  en `ai-builder.js` (justo después de `buildSemanticSeedProducts`): si el
  cliente ya mencionó productos/servicios reales en la conversación
  (`guidedState.servicesProducts`, vía `meaningfulOfferItems()` -- ya
  existente, usado en otro lugar del archivo), construye los items de
  catálogo directamente con ESAS PALABRAS, en vez de la librería genérica.
  Si todavía no hay nada (conversación vacía), devuelve `null`.
- En `ensureSemanticSeedContent()`: cuando `inferSemanticSeedProfile()`
  devuelve `"default"` (nicho no reconocido), ahora intenta primero
  `buildContextDerivedSeedProducts()`; si devuelve `null` (nada dicho
  todavía), cae al comportamiento de siempre
  (`buildSemanticSeedProducts("default", language)`). Los demás perfiles
  (auto, jewelry, fashion, etc.) no se tocaron.

**Lo que esto NO arregla (documentado para no repetir el error de creer
que ya quedó 100% resuelto):** `mergeSemanticSeedCatalog()` tiene una
lógica de reemplazo (`needsReplacement = existing.length < 4 || ...`) que,
cuando hay MENOS de 4 items reales ya en el catálogo (típico al inicio de
la conversación), reemplaza el arreglo COMPLETO por la librería semilla --
incluso si esos pocos items eran 100% reales, dichos por el cliente. Con
este fix, al menos el contenido de reemplazo ahora sale de las palabras
del cliente cuando el nicho es "default" y hay algo que usar -- pero no se
tocó esa lógica de reemplazo en sí (es más riesgosa, corre en cada mensaje
del chat en producción, y tocarla requiere más tiempo de prueba del que
había en esta sesión). Si Beto reporta que items reales que YA escribió
desaparecen o se mezclan con genéricos, ese es el próximo punto a mirar.

**Verificación:** revisión manual línea por línea del diff (no hay forma
de correr JS del navegador en este entorno). Cambio aislado y aditivo:
solo se toca la rama `profileKey === "default"`, todo lo demás sigue
exactamente igual. Pendiente que Beto lo pruebe en vivo.

**Archivos tocados:** `ai-builder.js` (nueva función
`buildContextDerivedSeedProducts`, una línea modificada en
`ensureSemanticSeedContent` para usarla condicionalmente).

**Notas para el siguiente agente:** si Beto reporta que el catálogo sigue
viéndose random DESPUÉS de este fix, preguntar primero si lo vio durante
el chat en vivo (antes de generar) o en el sitio ya generado -- si es lo
primero, revisar la lógica de reemplazo de `mergeSemanticSeedCatalog()`
mencionada arriba (`existing.length < 4` descarta items reales), no este
fix del backend.

---

## 2026-07-18 — Claude — Root cause real de la fuga de cuenta (el fix anterior no repintaba la pantalla)

**Reporte de Beto:** después de varias rondas de "fixes" ya aplicados, el chat
de Lyra seguía diciendo que ya tenía datos suyos guardados al usar otra
cuenta, mostraba una plantilla que no reconocía, y nombres/imágenes "súper
random". Frustración explícita por repetición del mismo síntoma.

**Investigación:** se hizo una auditoría forense completa de
`ai-builder.js` (localStorage, cada función de restauración de sesión,
orden de arranque, backend). Hallazgos, de mayor a menor impacto:

1. **Causa raíz confirmada (arreglada):** `resetGuidedStateForNewAccount()`
   (el fix de la sesión anterior) limpiaba correctamente `guidedState`,
   `currentSchema` y las claves de `localStorage`, pero **nunca repintaba la
   pantalla** -- no tocaba `guidedChat.innerHTML` (transcript del chat), no
   llamaba `applyGuidedStateToForm()`/`renderGuidedSummary()`, no limpiaba
   el título del sitio. El botón manual "Cambiar cuenta"
   (`switchClientAccount()`) sí repintaba a mano justo después, por eso
   *ese* camino parecía funcionar en pruebas puntuales. Pero el camino
   automático -- dentro de `createOrResumeClientIntakeSession()`, que se
   dispara cada vez que se detecta un email distinto al último usado -- solo
   repinta la pantalla *después* de que un round-trip de red a
   `/api/client/intake-session` termine con éxito (`hydrateClientIntakeSession()`).
   Si esa petición es lenta (cold start de Render) o falla, la pantalla se
   queda congelada mostrando el negocio/plantilla/chat de la cuenta
   anterior indefinidamente -- exactamente el síntoma reportado.
   **Fix:** `resetGuidedStateForNewAccount()` ahora repinta de inmediato:
   limpia el título, llama `applyGuidedStateToForm()`, `renderGuidedSummary()`
   y `resetAssistantConversation()` (esta última limpia el transcript del
   chat, que antes NUNCA se limpiaba -- por eso mensajes/plantillas de la
   cuenta anterior se quedaban mezclados con la nueva, viéndose como algo
   "random" que salía de la nada). También ahora limpia
   `lumaPendingClientEmail`/`lumaClientAccessToken`/`lumaClientRefreshToken`
   (antes solo los limpiaba el botón manual, dejando una credencial vieja
   capaz de reautenticar la identidad equivocada en la próxima carga).

2. **Hallazgo separado, no arreglado (requiere decisión de Beto):** los
   botones de login "Google"/"Apple" en el flujo de cliente llaman a
   `/api/client/auth/me` y `/api/client/auth/oauth/{provider}` -- ninguno
   de los dos existe en `backend/app/main.py` ni en ningún otro archivo del
   backend (`grep` completo, cero resultados). Esto significa que ese login
   siempre falla en producción de forma silenciosa (se captura el error y
   se reabre el gate de login). El mecanismo que SÍ funciona es el login
   por email simple contra `/api/client/intake-session` (existe, funciona,
   está correctamente indexado por email en el dict `client_intake_sessions`).
   Pendiente: decidir si el login OAuth se implementa de verdad en el
   backend, o si se ocultan esos botones mientras tanto para no prometer
   algo que no funciona.

3. **Hallazgo separado, no arreglado (requiere decisión de Beto):** "nombres
   e imágenes random" tiene una causa DISTINTA a la fuga de cuenta:
   `ensureSemanticSeedContent()`/`buildSemanticSeedProducts()`
   (`ai-builder.js` ~7863-7930) rellena catálogos con productos inventados
   (ej. "CyberLamp Ambient Desk Light") y fotos de stock de Unsplash
   elegidas por coincidencia de palabras clave (regex), cuando la
   clasificación del negocio es ambigua o los datos reales llegan tarde.
   También hay un nombre de negocio hardcodeado de respaldo:
   `"Kreaton Store"` (línea ~7921). Esto puede pasar incluso en una sola
   cuenta bien aislada. Pendiente: decidir si se apaga/reduce este relleno
   automático ahora que genera confusión, o si se deja como está pero se
   avisa más claramente al usuario cuando el catálogo es "de muestra".

**Archivos tocados:** `ai-builder.js` (función `resetGuidedStateForNewAccount`,
líneas ~3097-3138).

**Notas para el siguiente agente:** si el síntoma de "datos de otra cuenta"
vuelve a aparecer DESPUÉS de este fix, no asumir que es el mismo bug --
revisar primero si es uno de los dos hallazgos pendientes de arriba (login
OAuth roto, o el relleno de contenido de muestra). No repetir el patrón de
parchar sin repintar: cualquier función que resetee `guidedState` debe
también repintar `guidedChat`, el formulario y el resumen en el mismo
lugar, no confiar en que un caller posterior lo haga.

---

## 2026-07-18 — Claude — Unificación de color de marca (azul/turquesa) + corrección de nombre "Luma"→"Lyra"

**Contexto:** Beto notó que el landing usa azul `#2563eb` + turquesa `#14b8a6`
("los colores que yo quiero"), pero cada herramienta interna había derivado a
un verde/teal distinto por accidente: `admin.css` y `seller-portal.css`
(`#008060`), `client.css` (`#0d9488`), `ai-builder.css` (`#0e7c66`). Antes de
tocar código se hizo una discusión estratégica de marca (sin tools, solo
texto) sobre si el azul del landing era realmente la identidad correcta a
largo plazo, dado que la personalidad/nombre del asistente de IA también
podía cambiar. Beto compartió una hoja de diseño de personaje ("Nixie") con
una paleta ya definida — "Quantum Spectrum Integrated": Cosmic Indigo Deep,
Cobalt Pulse, Ultraviolet Quantum, Plasma Cyan Bright, Core Gold/Platinum
(reservado para alerta) — y aclaró: el nombre visible del asistente sigue
siendo **Lyra** (Nixie era el nombre de investigación/diseño, descartado
porque ya lo usa otra empresa; el diseño visual y la paleta sí se
conservan). Se decidió separar dos cosas: el cromo del sitio (nav, botones,
formularios en todas las superficies) se ancla al azul/turquesa del landing;
el espectro "Nixie/Lyra" queda reservado para futuros acentos específicos de
Lyra (avatar, header de chat, chips de modo) — NO implementado aún en UI real,
solo declarado como variables CSS listas para usar.

**Hecho:**
- Unificados `--primary`/`--primary-soft`/`--primary-dark` a `#2563eb` /
  `#eff6ff` / `#1d4ed8` en `admin.css`, `seller-portal.css`, `client.css`,
  `ai-builder.css` (antes cada uno tenía su propio verde). `client.css`
  conserva `--accent: #f59e0b` (ámbar, usado para un badge, no relacionado
  con el drift de marca). `css/styles.css` (landing) no se tocó — es la
  fuente de verdad.
- Se agregaron variables `--lyra-indigo` (#1e1b4b), `--lyra-cobalt`
  (#2f4cdd), `--lyra-violet` (#7c3aed), `--lyra-cyan` (#22d3ee), `--lyra-gold`
  (#e8b84b) en `ai-builder.css` — declaradas pero NO aplicadas a ningún
  elemento todavía. Son estimaciones visuales de la hoja de diseño de
  personaje, no valores hex oficiales confirmados por Beto.
- Corregidos dos `box-shadow` con verde viejo hardcodeado (`rgba(14, 124,
  102, ...)`) en `.assistant-avatar[data-state="speaking"|"success"]` que
  quedaron huérfanos tras el cambio de `--primary` (no usaban `var()`) →
  ahora usan `color-mix(in srgb, var(--primary) N%, transparent)`.
- Corregido el texto visible "Luma" → "Lyra" (alt de imágenes, botones,
  headings, subtítulos) en `ai-builder.html`, `client/portal/index.html`,
  `client/start/index.html`, `client-portal-preview.html`, y el duplicado
  histórico en `handoff/claude-ai-site-builder/source/ai-builder.html`.
  `client/setup/index.html` y `start/index.html` ya decían "LYRA"
  correctamente. **No se tocaron** identificadores internos (funciones,
  IDs, clases, localStorage keys, `LUMA_AGENT_URL`, rutas `/api/luma/...`,
  el regex de sanitización `.replace(/\bLuma\b/g, "LYRA")` en `ai-builder.js`
  línea ~16993) — renombrar esos es un refactor aparte, más riesgoso, sin
  beneficio visible para el usuario.
- **No tocado deliberadamente:** `client-setup.css` (sin sistema de
  variables, sigue pendiente para una segunda pasada) y `.rendered-site`
  (paleta por defecto de los sitios que Lyra genera para clientes — es una
  decisión de producto distinta, no del cromo de V&M).

**Pendiente / abierto:**
- Aplicar el espectro Lyra (`--lyra-*`) a UI real (avatar, header de chat,
  posibles chips de modo) — requiere mockup visual previo antes de tocar
  código, seguiendo el patrón establecido con Beto.
- Confirmar hex oficiales del espectro si existen en algún archivo de diseño
  (Beto autorizó usar los estimados por ahora).
- `client-setup.css`: pendiente de unificación (no tiene variables CSS,
  necesita más cuidado que los otros 4 archivos).
- Verificación visual en navegador real por Beto (igual que el resto de
  cambios de esta sesión).

**Archivos tocados:** `admin.css`, `seller-portal.css`, `client.css`,
`ai-builder.css`, `ai-builder.html`, `client/portal/index.html`,
`client/start/index.html`, `client-portal-preview.html`,
`handoff/claude-ai-site-builder/source/ai-builder.html`.

**Notas para el siguiente agente:** el cambio de color es puramente de
variables CSS (bajo riesgo, cascada automática vía `var()`/`color-mix()`).
El rename de texto fue quirúrgico — sólo copy visible, cero identificadores
internos tocados. Si se retoma el tema del espectro Lyra, mockup primero.

---

## 2026-07-18 — Claude — Chat de Lyra en ai-builder.html: de modal flotante a pantalla completa

**Reporte de Beto:** el chat de Lyra "abre en el medio, feo" en `ai-builder.html`
-- no se ve tan pro como el flujo del segundo proyecto (Codex, ver entries de
arriba sobre `esto-es-lo-que-trabajamos-el`), que es una app de pantalla
completa (sidebar de pasos + stage principal), sin sensación de popup.

**Causa:** `.guided-panel`/`.guided-shell` en `ai-builder.css` (reglas base)
renderizaban el chat como un modal centrado clásico: `position:fixed` +
fondo oscuro semitransparente (`rgba(15,23,42,.45)`) + tarjeta con
`border-radius`, `box-shadow` y ancho tope de `1120px` -- un lightbox sobre
la página de Quick Form que queda detrás. `client/setup/index.html` (el flujo
de cliente) YA tenía el fix correcto vía `.public-client-setup .guided-panel`
/`.guided-shell` en `client-setup.css`: sin scrim, sin tarjeta, `100vw x
100vh`, sin bordes redondeados ni sombra. Ese override nunca se portó a
`ai-builder.html` porque no usa la clase `.public-client-setup`.

**Fix:** se editaron las reglas BASE de `.guided-panel`/`.guided-shell` en
`ai-builder.css` (no un override con prefijo, ya que este archivo solo lo usa
`ai-builder.html`) para igualar el tratamiento de `client-setup.css`: fondo
sólido en vez de scrim oscuro, sin padding, tarjeta a `100% / 100vh`, sin
`border-radius` ni `box-shadow`. `.guided-header` no necesitó cambios, ya
tenía su propio padding/blur y se ve bien de borde a borde.

**Verificado:** comparación visual antes/después mostrada a Beto (mockup, no
la app real -- mismo límite de siempre, sin navegador del usuario desde
aquí). Pendiente que lo vea en `ai-builder.html` real.

**Archivos tocados:** `ai-builder.css`.

---

## 2026-07-18 — Claude — Bug real encontrado y arreglado: fuga de datos entre cuentas en client/setup

**Reporte de Beto (con captura):** en `client/setup/index.html`, al usar otra
cuenta (otro email), Lyra "ya tenía su info" de antes, mezclaba respuestas en
inglés a media conversación en español, y decía "tengo suficiente contexto
para generar" pero seguía preguntando cosas (ej. logo) después.

**Causa raíz (una sola, para los tres síntomas):** `GUIDED_DRAFT_STORAGE_KEY`
(`"lumaGuidedDraft"` en `localStorage`) es una clave única por navegador, NO
por cuenta/email. `createOrResumeClientIntakeSession()` tomaba lo que hubiera
en memoria (`guidedState`, incluyendo `selectedLanguage`) y lo mandaba al
backend como si fuera el draft del email que se estaba autenticando en ese
momento — sin comparar si ese draft realmente pertenecía a ese email. Con eso:
- Un email nuevo/distinto heredaba nombre de negocio, colores, catálogo, etc.
  de la cuenta anterior probada en el mismo navegador → "ya tiene mi info".
- `selectedLanguage` restaurado del draft viejo pisaba el idioma real de la
  conversación en curso, de forma asíncrona (la restauración de sesión
  resuelve un momento después de que el usuario ya empezó a chatear) → los
  primeros mensajes en español, luego cambia a inglés a medio camino.
- La restauración también reinyectaba pasos del guided-flow (ej. logo) que ya
  se habían respondido localmente, dando la sensación de "dice que está listo
  y sigue preguntando lo mismo".
- `switchClientAccount()` ya limpiaba tokens y la sesión de cliente, pero
  **explícitamente conservaba** este draft (el texto del `confirm()` incluso
  lo prometía como "feature") — esa era la fuga más directa y reproducible.

**Fix (`ai-builder.js`):**
- Nueva función `resetGuidedStateForNewAccount()`: resetea `guidedState` a
  `createEmptyGuidedState(selectedLanguage)` (conserva el idioma de la
  conversación viva, no el guardado), limpia `currentSchema`,
  `currentRequestId`, `restoredGuidedDraftInfo`, y borra `lumaGuidedDraft` de
  `localStorage`.
- `createOrResumeClientIntakeSession()`: antes de armar el draft a enviar,
  compara el email que se está autenticando contra `lumaPendingClientEmail`
  (el último email conocido). Si difieren, llama a
  `resetGuidedStateForNewAccount()` primero — así nunca se manda data de una
  cuenta hacia otra.
- `switchClientAccount()`: ahora sí llama a `resetGuidedStateForNewAccount()`
  (antes no lo hacía) y re-renderiza el form/summary. Se corrigió el texto
  del `confirm()` en los 4 idiomas — ya no promete conservar el borrador.

**No verificado en navegador real** (mismo límite de siempre: este entorno no
tiene acceso al Chrome del usuario). Pendiente que Beto pruebe exactamente el
escenario de la captura: cuenta A con negocio X, cambiar a cuenta B con otro
email, confirmar que B arranca limpio, en el idioma correcto, sin repetir
preguntas ya respondidas.

**Pendiente / abierto:** si después de este fix todavía aparece el mismo
patrón (idioma que cambia solo, o preguntas repetidas) SIN que haya cambio de
cuenta de por medio, el problema es distinto al diagnosticado aquí y hay que
investigar por separado el guided-step engine (`missingGuidedSteps` /
`normalizeGuidedStepForCurrentState` en `ai-builder.js`) en vez de la capa de
sesión/cuenta.

**Archivos tocados:** `ai-builder.js`.

---

## 2026-07-18 — Codex (vía Beto) — Revisión de los cambios de Claude

**Feedback de Codex, relayado por Beto (sin acceso directo a Codex en esta
sesión):** le gustó la parte visual (galería de plantillas + panel de build
plan). Sobre `backend/app/domains.py` (búsqueda/reserva de dominio): por
ahora debe quedar fuera de uso real porque (a) falta integrar una API de
registrador real — esto ya estaba anotado como pendiente en el entry de
persistencia de abajo — y (b) "aún hay varios fallos", sin detalle específico
dado por Codex todavía.

**Decisión con Beto:** no se desregistra el router ni se borra el módulo.
Como nunca se conectó a ningún frontend (ver entry de persistencia), ningún
usuario lo ve ni lo puede activar por accidente — así que "dejarlo fuera" ya
es el estado real, no requirió cambio de código. Se deja tal cual hasta que
alguien (Codex o Claude) tenga los fallos específicos para poder arreglarlos,
o hasta que se decida integrar una API de registrador real.

**Pendiente / abierto:** si Codex identifica los fallos concretos más
adelante, anotarlos aquí antes de que cualquier agente vuelva a tocar
`domains.py`, para no repetir el mismo problema.

---

## 2026-07-18 — Claude — Galería de plantillas en vivo + panel "LYRA's build plan" en ai-builder

**Contexto:** Beto pidió replicar, en el flujo de Lyra, dos cosas que le gustaron
del prototipo de Codex: el picker de plantillas con preview en vivo y la
pantalla de transparencia antes de generar. Antes de escribir nada nuevo se
investigó `ai-builder.js`/`.html`/`.css` (ver hallazgos abajo) — varias piezas
ya existían y solo faltaba conectarlas o pulirlas, no reconstruirlas.

**Hecho:**
- `ai-builder.js`: nuevas funciones `templateAccentPalette(catalogType)` y
  `templateLivePreviewMarkup(choice)`. Reemplazan el `<img>` estático dentro de
  cada `.template-board-image` (en `renderCanvasTemplateCarousel`) por un
  mini-render en vivo (mini nav/hero/cards) coloreado según la familia de la
  plantilla. Motivo: varias entradas de `TEMPLATE_PREVIEW_CHOICES` comparten la
  misma foto de stock (ej. `services_2.png` en corporate/lead-funnel/restaurant),
  haciendo que plantillas distintas se vean idénticas en el picker.
- `ai-builder.css`: CSS nuevo para `.template-live-preview`/`.tlp-*`.
- Se descubrió que el panel de transparencia ("LYRA's build plan",
  `renderGuidedBriefReview()` -> `#guidedBriefReview`) YA estaba implementado
  y estilizado, pero solo vivía en `client/setup/index.html` (flujo de
  cliente). En `ai-builder.html` el contenedor no existía, así que la función
  hacía `return` en silencio y nunca pintaba nada.
- Se agregó `<div id="guidedBriefReview" class="guided-brief-review">` en
  `ai-builder.html` (dentro de `.summary-panel`, junto a `summary-head`) y se
  portaron los estilos `.ai-build-*` de `client-setup.css` (con prefijo
  `.public-client-setup`) a `ai-builder.css` sin ese prefijo, ya que
  `ai-builder.html` no usa esa clase envolvente. No se tocó
  `renderGuidedBriefReview()` en sí — ya funcionaba, solo le faltaba su
  contenedor en este HTML.

**Verificado:** revisión visual de ambas piezas con datos de muestra
(mini-preview de 5 plantillas con paletas distintas; panel de build plan con
contenido de ejemplo tipo "Legal / Professional"). No se pudo levantar
`ai-builder.html` en un navegador real desde este entorno (sandbox sin acceso
al Chrome del usuario en localhost), así que la verificación fue de
markup/CSS, no de click-through real en la app. **Pendiente:** que Beto o
Codex lo abran en el navegador real y confirmen que el picker y el panel se
ven/comportan bien en contexto (no solo aislados).

**Pendiente / abierto:**
- Mecanismo 4 del plan original (overlay de progreso con fases reales durante
  la generación) no se construyó — requiere que el backend exponga fases de
  la generación (intake gate / orchestrator / catálogo) en vez de un timer
  simulado. Ver la conversación con Beto para el razonamiento completo.
- **Nada de esto está commiteado ni pusheado todavía.** Se decidió con Beto
  que él le pide a Codex que revise los cambios en la carpeta local primero
  (Codex corre en el mismo folder, así que ya los puede ver sin git de por
  medio) y solo después de esa revisión se hace `git add/commit/push`. Ver
  nota técnica abajo sobre por qué el commit no se hizo desde este agente.

**Archivos tocados:** `ai-builder.js`, `ai-builder.css`, `ai-builder.html`.

**Nota técnica para el siguiente agente:** el entorno de shell de Claude
(usado para correr git/tests) tuvo una vista desincronizada de algunos
archivos del working tree respecto al disco real durante esta sesión —
confirmado comparando `git hash-object` contra el blob de HEAD para
`backend/app/main.py`, `ai-builder.js` y `backend/requirements.txt`: en
algunos casos el hash coincidía con HEAD (es decir, parecía "sin cambios")
aunque el archivo real en disco sí tenía los cambios. Por eso no se corrió
`git commit` desde ese entorno — el riesgo era generar un commit incompleto
sin darse cuenta. Si vuelve a pasar: no confiar en `git status`/`git diff`
corridos desde ese shell sin cruzarlos contra una lectura directa del archivo
(por ejemplo con la herramienta de lectura de archivos del host, no la de
shell) antes de commitear.

---

## 2026-07-18 — Claude — Persistencia SQLAlchemy + búsqueda/reserva de dominios

**Contexto:** Beto tiene otro prototipo (Codex, stack Next.js/Drizzle/Cloudflare,
en `C:\Users\alber\Documents\Codex\2026-07-16\esto-es-lo-que-trabajamos-el`) con
un modelo de datos más sólido (stores/products/customers/orders/generated_sites/
domain_reservations) y una feature de búsqueda/disponibilidad de dominio que este
proyecto no tenía. Ese prototipo corre sobre infraestructura de OpenAI (ChatGPT
"Sites", auth SIWC vía headers inyectados por su proxy) y no es portable tal cual
a este sitio (Render + estático). Se adaptó lo que sí sirve: el modelo de datos y
la lógica de disponibilidad de dominio, reescritos en Python/SQLAlchemy/FastAPI.

**Hecho:**
- `backend/app/db.py` — engine/session SQLAlchemy. `DATABASE_URL` configurable
  (default: `sqlite:///./backend/lyra.db`). `init_db()` corre en el startup event
  de FastAPI (`main.py`) y crea las tablas si no existen.
- `backend/app/db_models.py` — tablas `Store`, `Product`, `Customer`, `Order`,
  `CustomerNotification`, `TeamMember`, `Setting`, `GeneratedSite`,
  `DomainReservation`, adaptadas del `db/schema.ts` (Drizzle) del prototipo de
  Codex. snake_case, ids tipo `prefix_hexid` (mismo estilo que ya usa
  `commerce.py`, ej. `ord_...`, `prod_...`).
- `backend/app/domains.py` — nuevo router `/api/v1/domains` con:
  - `GET /search?domain=&ownerEmail=` — genera candidatos (`.com`, `.store`,
    `.us`, subdominio `.vmstores.com`, etc.), heurística de disponibilidad
    (lista fija de dominios "tomados" + conflictos contra `GeneratedSite`,
    `Store`, `DomainReservation` existentes) y precio por TLD con markup premium
    para dominios cortos o con keywords (`premium`, `prime`, `lux`, `ai`).
    Portado 1:1 de `checkDomainSearch`/`checkDomainAvailability` del prototipo TS.
  - `POST /reservations` — reserva un dominio disponible, persiste en
    `DomainReservation`.
  - `GET /reservations?ownerEmail=` — lista reservas de un owner.
  - **Importante:** sigue sin haber integración real con un registrador de
    dominios (el prototipo de Codex tampoco la tenía — era la misma heurística
    con una lista de dominios tomados hardcodeada). Esto es un punto de partida
    funcional, no una compra de dominio real todavía.
- Wireado en `main.py` (`app.include_router(domains_router)` + startup event).
- `backend/requirements.txt` — agregado `sqlalchemy>=2.0,<3`.
- `backend/tests/test_domains.py` — 10 tests (slugify, normalización de dominio,
  precios por TLD, detección de premium, conflictos de reserva entre stores).

**Verificado:** los 14 tests del backend pasan (`python -m unittest discover -s
tests`). Se levantó la app completa con `TestClient` (con `init_db()` corriendo
vía el startup event) y se probó `/healthz`, `/api/v1/domains/search`,
`/api/v1/domains/reservations` (POST y GET) de punta a punta contra una DB
SQLite real — funciona.

**Pendiente / abierto — siguiente fase:**
- `commerce.py` (916 líneas) sigue 100% en memoria (`PRODUCTS`, `ORDERS`,
  `CARTS`, etc. como dicts a nivel de módulo) — se pierde todo al reiniciar el
  server. Ya tiene lógica de negocio sólida (estados de orden, reserva de
  inventario, Stripe, audit log, shipping) que **no** hay que reescribir, solo
  conectar a las tablas nuevas (`Product`, `Order`, `Customer` de
  `db_models.py`). No lo toqué en esta sesión por riesgo: es el flujo de compra
  que ya funciona y migrarlo a DB a medias podría romper el checkout en vivo.
  Antes de tocarlo: mapear cada dict global a su tabla, migrar función por
  función (`cart_response`, `create_order_from_cart`,
  `deduct_inventory_for_order`, los endpoints de `store-owner`), y correr contra
  los mismos tests/flujos manuales que ya existen.
- Render (free plan) no garantiza disco persistente — el archivo SQLite se
  puede perder en un redeploy. Suficiente por ahora (sigue siendo mejor que
  memoria pura), pero si el negocio empieza a depender de esto, mover
  `DATABASE_URL` a un Postgres administrado (no requiere cambiar código de
  `db.py` hacia arriba).
- La búsqueda de dominios no está conectada a ningún flujo de frontend todavía
  (`ai-builder.js`, `client/setup`) — es backend puro, listo para consumir.
- Faltan endpoints de `Store`/`GeneratedSite` (crear/leer) — `domains.py` los
  usa para chequear conflictos pero nada los está poblando todavía. Es lo que
  seguiría de la migración de `commerce.py`.

**Archivos tocados:** `backend/app/db.py` (nuevo), `backend/app/db_models.py`
(nuevo), `backend/app/domains.py` (nuevo), `backend/app/main.py` (wiring),
`backend/requirements.txt`, `backend/tests/test_domains.py` (nuevo).

**Notas para el siguiente agente:** `@app.on_event("startup")` solo corre bajo
`TestClient` si se usa como context manager (`with TestClient(app) as client:`).
En producción con uvicorn corre normal, no es un bug, solo una trampa al
escribir tests.

---

## 2026-07-18 — Claude — Setup del protocolo de coordinación

**Hecho:** Creado `AGENTS.md` (raíz) con overview del proyecto y protocolo de
coordinación, y esta bitácora (`docs/AGENT_LOG.md`). Objetivo: que Beto no tenga que
pasar zips de handoff manualmente entre Claude y Codex — ambos agentes leen estos dos
archivos al empezar.

**Pendiente / abierto:**
- Hay ~18 archivos con cambios sin commitear desde antes de hoy (ver `git diff --stat`):
  reescritura grande en `css/styles.css`, `client-portal.js`, `contact.html`, etc.
  No se tocaron ni investigaron a fondo — quien los toque primero debería revisar si
  es formateo o cambio funcional y dejarlo anotado aquí.
- No hay comando único documentado para levantar el proyecto local (frontend estático
  + backend Python). Falta documentarlo en `AGENTS.md` cuando alguien lo confirme.

**Archivos tocados:** `AGENTS.md` (nuevo), `docs/AGENT_LOG.md` (nuevo).

**Notas para el siguiente agente:** Antes de asumir que el working tree está limpio,
correr `git status`. Este repo tiene trabajo de sesiones previas de Codex sin
commitear.
