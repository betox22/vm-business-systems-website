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
