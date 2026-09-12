# Auditoría de arquitectura LYRA — AI Website Designer

Auditoría de solo-lectura sobre el repositorio real (`vm-business-systems-website`), sin cambios de código. Todo lo que sigue está basado en archivos y clases que inspeccioné directamente — cada afirmación cita el archivo/clase real. Donde no pude confirmar algo con certeza, lo digo explícitamente en vez de asumir.

Repositorios/archivos principales auditados: `backend/app/orchestrator.py`, `backend/app/agents.py` (1177 líneas), `backend/app/ai_site_planner.py` (736 líneas), `backend/app/lyra_intake_engine.py` (1080 líneas), `backend/app/lyra_edit_engine.py`, `backend/app/main.py`, `backend/app/models.py`, `backend/app/db_models.py`, `backend/app/taxonomy.py`, `src/ai-builder/renderers.js` (2412 líneas), `src/ai-builder/index.js` (12554 líneas, revisado por secciones), `templates/TEMPLATE_PIPELINE.md`, y los manifiestos de `templates/`.

---

## TABLA RESUMEN

| # | System | Status | Confidence | Existing implementation | Missing |
|---|--------|--------|------------|--------------------------|---------|
| 1 | Business Intelligence | PARTIAL | Alta | `LyraIntakeEngine` (9 slots: name, description, niche, sales_flow, target_audience, brand_style, logo, location, contact_info) + `DetectedIntent` (businessModel, commerceMode, salesFlow, niche) | Sin customer intent explícito más allá de sales_flow, sin ticket/precio estimado, sin objeciones ni trust-factors modelados, sin distinción primary/secondary conversion goal |
| 2 | Information Architecture | PARTIAL | Alta | `AIWebGenerationResponse.pages: List[PageSchema]` (pageId/title/slug/sections) en `ai_site_planner.py` — sí arma múltiples páginas, no una sola | El LLM decide qué páginas incluir sin una capa explícita de "sitemap policy" por vertical; no hay lógica separada de user journey / conversion path distinta de la lista de páginas |
| 3 | Conversion Strategist | MISSING | Alta | `CopyProps.ctaPrimary/ctaSecondary` existen como campos de copy | No hay ninguna regla de jerarquía de CTA, ni verificación de "no más de un CTA compitiendo", ni estrategia de trust signals/social proof/objection handling como capa separada — el CTA es solo texto que el LLM llena, sin gobernanza |
| 4 | Art Direction Engine | PARTIAL | Alta | `palette_style` (4 buckets: elegante/organico/tecnologico/calido) en `ai_site_planner.py`, usado tanto para color como implícitamente para tono | Solo 1 eje de dirección visual (mood de color). No hay density, whitespace strategy, corner-radius philosophy, imagery/photography direction, motion personality como conceptos separados y estructurados |
| 5 | Color Intelligence Engine | IN PROGRESS | Alta | Dos sistemas hoy: (a) `ai_site_planner.py` LLM adivina `primary_color`/`secondary_color` hex sin verificación, (b) `ArtDirectorAgent` (agents.py:750) fallback con 3 casos hardcoded. **Ya en construcción esta sesión**: `color_theory.py` con HSL, armonía real y contraste WCAG (pendiente de aprobar el diff) | Antes de esta sesión: sin matemática de armonía, sin validación de contraste, sin estados hover/active/disabled, sin control de "no abusar del accent" |
| 6 | Typography Intelligence | MISSING | Alta | `DesignTokens.headingFont` / `bodyFont` (solo 2 nombres de fuente) en `ai_site_planner.py` | Sin type scale (H1-H6/body/small/caption/label/button), sin line-height/letter-spacing sistemático, sin lógica de pairing más allá de elegir 2 nombres de Google Font por mood |
| 7 | Design Tokens / Design System | PARTIAL | Alta | `DesignTokens` (background, surface, primary, secondary, accent, text, headingFont, bodyFont) — persiste dentro del `schema` generado y se reutiliza en ediciones vía `currentSchema` (`lyra_edit_engine.py`) | Sin spacing scale, radius scale, shadows/elevation, container widths, breakpoints, motion tokens, ni variantes de componente declaradas como sistema |
| 8 | Layout Composer | PARTIAL (B, camino a C) | Alta | Real composición por secciones: `SectionBlock` con `componentType` + `variant` + `purpose`, 16 tipos en `ALLOWED_SECTION_COMPONENT_TYPES` (Hero, MarketplaceHero, ProductGrid, CategoryRail, FeaturedProducts, Lookbook, TrustStrip, StoryBlock, FeatureSpotlight, Contact, FAQ, CTA, BookingServices, RestaurantMenu, ServiceAreas, ProofPanel) | El campo `variant` existe pero NO está restringido por un enum — el LLM escribe lo que quiere ahí, sin garantía de que "centered/split/editorial" se interprete consistentemente en el renderer. No son primitivas de bajo nivel, son componentes ya bastante opinionados |
| 9 | Vertical / Business Pattern Intelligence | PARTIAL-ALTA | Media-Alta | `TEMPLATE_CATALOG` con ~19 templates cubriendo marketplace, retail, moda, joyería/lujo, restaurante, booking, educación, productos digitales, real estate, salud/wellness, legal, b2b/SaaS, industrial, servicios locales/hogar, corporativo, lead-funnel (ver `StrategyAgent._select_template_id`, agents.py:650) | No confirmé "hotel" como vertical explícita. No verifiqué si cada template garantiza el set exacto de secciones que pediste (ej. SaaS: problem/solution/features/integrations/pricing/FAQ/signup) a nivel de sección individual — necesitaría auditoría archivo por archivo de cada manifest en `templates/` |
| 10 | Component Intelligence | PARTIAL | Media | El LLM elige componentType por sección dentro del prompt de `ai_site_planner.py`, condicionado por template/business type | Sin evidencia de que considere funnel-stage, volumen de contenido o dispositivo como inputs explícitos de la decisión — es responsabilidad implícita del LLM, no una capa con reglas propias |
| 11 | Responsive Design Intelligence | PARTIAL / INCIERTO | Media | El CSS de la app builder (`ai-builder.css`: 12 `@media`, `client-setup.css`: 16, `css/styles.css`: 18) sí es responsive de verdad | `src/ai-builder/renderers.js` (el código que arma el HTML del SITIO GENERADO para el cliente final) tiene **cero** `@media` propios — no pude confirmar si el sitio generado hereda breakpoints de una hoja de estilos compartida o si depende enteramente de utility classes sin verificación sistemática. Esto necesita una auditoría dedicada antes de tocar nada |
| 12 | Accessibility | PARTIAL | Media-Alta | `renderers.js` tiene 29 usos de `aria-`/`alt=`/`role=`/`:focus`/`tabindex` — hay prácticas reales, no inventadas | No hay ningún paso de validación de accesibilidad en el pipeline (`ValidationAgent` no revisa nada de esto) — es buena práctica dispersa, no una garantía sistemática |
| 13 | Visual Critic / Self-Review Loop | MISSING | Alta | `ReviewerAgent` (agents.py:974) SÍ existe y corre después del `ai_site_planner`, con un JSON schema estricto (`ReviewerVerdict`: passed/severity/issues) que puede disparar una corrección de estrategia | Es 100% textual — lee JSON de copy/catálogo/estrategia, nunca renderiza ni mira una captura de pantalla. Cero: screenshot capture, análisis visual, evaluación de jerarquía/whitespace/alineación/balance, detección de overflow o layout roto |
| 14 | Design Memory / Project Memory | PARTIAL | Media-Alta | Dentro de una misma generación, el estado (colores, tipografía, marca) fluye correctamente entre agentes (`orchestrator.py`). Las ediciones posteriores SÍ reciben el `currentSchema` completo (`lyra_edit_engine.py:77-87`) y lo usan como base | `db_models.GeneratedSite` no tiene columnas dedicadas para brand_identity/designTokens — vive dentro del blob de schema. No hay un "design system record" independiente que garantice que una página nueva generada después reutilice exactamente la misma paleta/tipografía sin pasarle el schema completo a mano |
| 15 | Structured AI Pipeline | EXISTS | Alta | `LyraOrchestrator.run()` (orchestrator.py:100-141) es un pipeline real por etapas: extractor → strategist → [art_director, copywriter, catalog en paralelo] → ai_site_planner (sobreescribe si hay API key) → validator → reviewer opcional con corrección. Cada etapa tiene su propio agente, su propio `AgentResult`, y hay manejo de fallos por agente (`_safe_run`) | Ninguno grave — esto es lo mejor construido de las 15 capas. Ver nota en DO NOT DUPLICATE |

---

## CURRENT LYRA ARCHITECTURE

Esto es el pipeline real, confirmado leyendo `orchestrator.py` línea por línea:

```
USER MESSAGE (chat guiado, /api/luma/chat)
   → LyraIntakeEngine.run()  [LLM, tool-calling forzado, 9 slots + userQuestionResponse]
   → validate_and_repair_decision()  [determinístico, agregado hoy]
   → apply_decision()  [merge a ProjectState]

CUANDO canGenerate=true → GENERACIÓN (/ai/website-builder)
   → IntakeExtractionAgent   [regex fallback, SOLO si no vino del chat]
   → StrategyAgent           [regex scoring → elige 1 de ~19 templates]
   → (paralelo) ArtDirectorAgent + CopywriterAgent + CatalogAgent
        - ArtDirectorAgent: 3 buckets hardcoded (cyberpunk/lujo/default)
        - CopywriterAgent: 100% determinístico, if/elif por websiteType — CERO llamada a LLM
        - CatalogAgent: seed catalog semántico o servicios genéricos
   → OpenAISitePlanAgent (ai_site_planner.py)   [LLM, sobreescribe lo anterior si hay API key:
        produce pages[], sections[], DesignTokens, BrandIdentity, catalogItems]
   → ValidationAgent   [solo verifica 3 campos: businessName, businessDescription, websiteType]
   → ReviewerAgent (si run_review=true)   [LLM, JSON-only, puede forzar 1 corrección de template]
   → ProjectState final → build_schema_from_state() → WebsiteGenerationResponse
```

Puntos clave que confirman que **no es un solo prompt gigante**: hay 8 agentes con responsabilidad separada, ejecución paralela real (`asyncio.gather`) para los 3 workers independientes, y un mecanismo de reintento/corrección post-review. Eso ya es una arquitectura de pipeline, no un LLM monolítico.

---

## TARGET ARCHITECTURE

Reutilizando al máximo lo que ya existe (no reemplazar el orquestador, extenderlo):

```
USER MESSAGE
   → LyraIntakeEngine  [YA EXISTE — solo ampliar slots: ticket aproximado, objeciones, trust factors]
   → BUSINESS STRATEGIST  [nuevo, liviano: consolida intent + conversion goals primary/secondary
                            sobre el intake ya extraído — no reemplaza LyraIntakeEngine]
   → INFORMATION ARCHITECT  [nuevo: antes de StrategyAgent, decide qué páginas + orden de secciones
                              por vertical, como policy explícita — hoy esto lo decide el LLM de
                              ai_site_planner implícitamente dentro del mismo prompt gigante de plan]
   → CONVERSION STRATEGIST  [nuevo, determinístico: valida jerarquía de CTA por sección ANTES de
                              devolver el plan — un guard, no un agente con LLM]
   → StrategyAgent  [YA EXISTE, sin tocar]
   → ART DIRECTOR (ampliado)  [ArtDirectorAgent existente + color_theory.py (en construcción) +
                                nuevos ejes: density, whitespace, shape language]
   → color_theory.py  [EN CONSTRUCCIÓN ESTA SESIÓN]
   → TYPOGRAPHY ENGINE  [nuevo, pequeño: type scale determinístico basado en headingFont/bodyFont
                          ya elegidos — no reemplaza la elección de fuente, la completa]
   → CopywriterAgent + CatalogAgent  [YA EXISTEN, sin tocar]
   → OpenAISitePlanAgent  [YA EXISTE — reducir su responsabilidad: deja de inventar hex y type
                            scale, se enfoca en estructura de páginas/secciones/copy]
   → ValidationAgent  [AMPLIAR: hoy solo valida 3 campos, debería validar contraste WCAG y
                        tokens completos]
   → ReviewerAgent (texto)  [YA EXISTE, sin tocar]
   → VISUAL CRITIC  [nuevo, el gap más grande: render → screenshot → vision model → corrección]
   → DESIGN MEMORY  [nuevo: persistir brand_identity/designTokens como registro propio, no solo
                      dentro del blob de schema]
```

---

## GAP ANALYSIS

**P0 — fundamental / bloqueador**
- Visual Critic / Self-Review Loop (#13): sin esto, ningún otro sistema de diseño que construyamos se puede verificar objetivamente. Es la base para confiar en cualquier mejora futura.
- Conversion Strategist (#3): hoy nada impide que un sitio generado tenga 2-3 CTAs compitiendo o cero jerarquía — esto afecta directamente la conversión, que es el objetivo de negocio de KREATON.

**P1 — alto impacto**
- Color Intelligence (#5): ya en construcción, continuar hasta cerrarlo.
- Typography Intelligence (#6): mismo patrón que color — bajo riesgo, alto impacto visual inmediato.
- Design Tokens extendidos (#7): spacing/radius/shadow — sin esto, cada sección puede tener espaciados inconsistentes aunque el color esté perfecto.

**P2 — mejora importante**
- Information Architecture como policy explícita (#2): reduce dependencia de que el LLM "adivine bien" qué páginas hacen falta cada vez.
- Design Memory como registro propio (#14): importante antes de escalar a más ediciones/páginas por sitio.
- Art Direction ampliado más allá de color (#4): density, whitespace, shape language.

**P3 — nice to have**
- Component Intelligence consciente de funnel-stage/dispositivo (#10).
- Ampliar Business Intelligence con ticket/precio/objeciones estructuradas (#1).
- Responsive Design Intelligence — auditoría dedicada primero (ver Technical Debt), luego decidir si hace falta trabajo real o ya está cubierto por una hoja de estilos que no localicé.

---

## DO NOT DUPLICATE

- **`LyraOrchestrator` (orchestrator.py) no se reemplaza.** Es un pipeline por etapas real, con paralelismo y manejo de fallos por agente. Cualquier sistema nuevo se inserta como una etapa más, no como un orquestador paralelo.
- **`LyraIntakeEngine` no se reemplaza** para capturar intención de negocio — ya hace tool-calling estructurado con slots tipados, fieldMeta con source/confidence, y (desde hoy) validación cruzada. Ampliar sus slots, no crear un segundo sistema de intake.
- **`SectionBlock`/`PageSchema`/`ALLOWED_SECTION_COMPONENT_TYPES` no se reemplazan.** Ya es composición real por secciones con schema Pydantic validado. Cualquier Layout Composer nuevo debe extender este vocabulario, no crear una segunda representación de "página".
- **`ReviewerAgent` no se reemplaza** para crítica de estrategia/copy/catálogo — el Visual Critic nuevo es un sistema DISTINTO (renderiza y mira píxeles), no un reemplazo de este (que lee JSON).
- **`DesignTokens` no se reemplaza** como forma de representar colores/fuentes — se extiende con más campos (spacing, radius, shadows), manteniendo el mismo modelo.
- **`currentSchema`/`lyra_edit_engine.py` no se tocan** para el flujo de edición — ya reciben y preservan el schema completo correctamente.

---

## TECHNICAL DEBT / RISKS

- **Dos sistemas de color desconectados** (ya identificado y en corrección esta sesión): `ai_site_planner.py` y `ArtDirectorAgent` pueden producir resultados distintos según si hay `OPENAI_API_KEY` o no.
- **`CopywriterAgent` no usa IA en absoluto** — es un lookup table if/elif por `websiteType` × idioma. Esto no es necesariamente malo (es rápido, gratis, determinístico), pero si Beto cree que "todo tiene IA", este es un punto donde la expectativa no coincide con la realidad: el copy real y bueno viene de `ai_site_planner`, este agente es solo el fallback/base.
- **`variant` en `SectionBlock` no está restringido por enum** — el LLM puede escribir cualquier string ahí. Si el renderer del frontend espera valores específicos ("centered", "split", etc.) y no coinciden, la sección puede caer a un default silencioso sin que nadie se entere. Riesgo de inconsistencia silenciosa.
- **`ValidationAgent` es extremadamente superficial** (3 campos: businessName, businessDescription, websiteType) — el nombre sugiere que valida mucho más de lo que realmente valida. Riesgo de falsa confianza en el nombre de la clase.
- **Decisiones de diseño hardcoded en 2 lugares distintos con listas de keywords que pueden desincronizarse**: `StrategyAgent._select_template_id` (agents.py) y la lógica de niche en `taxonomy.py` — ambos mapean texto a categorías con regex propios, sin una fuente única de verdad.
- **Dependencia total del LLM para type scale y espaciado**: hoy no existe ninguna capa determinística para esto (a diferencia del color, que ya estamos corrigiendo). Mismo riesgo de inconsistencia que tenía el color antes de hoy.
- **Responsive del sitio generado sin verificar**: no encontré `@media` en `renderers.js`. Puede ser que dependa de una hoja de estilos compartida que no localicé, o puede ser un gap real. Marcado como riesgo de "no sé" más que como bug confirmado — necesita auditoría dedicada antes de asumir nada.
- **Costo/latencia**: cada generación completa ya dispara mínimo 2 llamadas a LLM garantizadas (`LyraIntakeEngine` + `OpenAISitePlanAgent`) más una opcional (`ReviewerAgent`). Agregar un Visual Critic con modelo de visión sumaría una llamada más (cara) por generación — hay que diseñarlo para correr solo cuando haga falta (ej. no en cada micro-edición), no en cada turno.
- **Inconsistencia potencial del modelo**: `ai_site_planner` puede fallar validación Pydantic (colores no-hex, template inexistente, catalogStrategy que no matchea el template) y en ese caso todo su output se descarta silenciosamente, dejando los workers deterministas de abajo (`ArtDirectorAgent` genérico, `CopywriterAgent` genérico) como resultado final — el usuario no se entera de que recibió la versión "básica" en vez de la versión con IA completa.

---

## RECOMMENDED IMPLEMENTATION ORDER

**Fase 1 — Cerrar Color Intelligence (en curso)**
1. Objetivo: reemplazar los dos sistemas de color desconectados por `color_theory.py` con armonía HSL real y contraste WCAG, incluyendo paleta extendida (success/warning/error/info).
2. Sistemas afectados: #5 Color Intelligence, parcialmente #7 Design Tokens.
3. Archivos: `backend/app/ai_site_planner.py`, `backend/app/agents.py` (ArtDirectorAgent).
4. Nuevos módulos: `backend/app/color_theory.py`.
5. Dependencias: ninguna — ya está en progreso.
6. Riesgo: bajo — ya diseñado para no tocar frontend salvo que la auditoría lo requiera.
7. Verificación: tests de determinismo + contraste WCAG + ejemplos reales por niche/mood (ya definido en el prompt pendiente de aprobar).

**Fase 2 — Typography Intelligence (mismo patrón que color)**
1. Objetivo: type scale determinístico (H1-H6, body, small, caption, label, button) con line-height/letter-spacing, anclado a las 2 fuentes que ya elige `ai_site_planner`.
2. Sistemas afectados: #6.
3. Archivos: `backend/app/ai_site_planner.py` (extender `DesignTokens`).
4. Nuevos módulos: posible `backend/app/typography_scale.py`, o extender `color_theory.py` a `design_tokens.py` si tiene sentido consolidar.
5. Dependencias: Fase 1 (mismo patrón de "LLM elige intención, código calcula el resto").
6. Riesgo: bajo.
7. Verificación: tests de escala tipográfica (ratio consistente entre niveles), verificar que el frontend consuma los tokens nuevos sin romper nada (auditoría de `renderers.js` primero).

**Fase 3 — Conversion Strategist (P0, determinístico, sin LLM nuevo)**
1. Objetivo: guard que valide jerarquía de CTA (un primary CTA por página, secondary solo si no compite) antes de devolver el plan al usuario.
2. Sistemas afectados: #3.
3. Archivos: `backend/app/ai_site_planner.py` (post-procesamiento de `pages[].sections[]`), posiblemente `backend/app/orchestrator.py`.
4. Nuevos módulos: `backend/app/conversion_rules.py`.
5. Dependencias: ninguna directa, pero se beneficia de tener Fase 1-2 ya resueltas para no mezclar demasiados cambios de una vez.
6. Riesgo: medio — toca el contenido final que ve el cliente, requiere probar con varios verticales.
7. Verificación: tests con planes sintéticos que tengan 0, 1, 2 y 3 CTAs "primary" simulados, confirmar que el guard corrige a exactamente 1 jerarquía clara.

**Fase 4 — Visual Critic (P0, el más grande y el más valioso)**
1. Objetivo: cerrar el loop generate → render → screenshot → crítica → corrección.
2. Sistemas afectados: #13, refuerza #11 (responsive) y #12 (accesibilidad) al poder verse realmente.
3. Archivos: nuevo servicio, probablemente fuera de `backend/app/` (necesita un renderer headless — Playwright ya aparece en el repo para QA, ver `output/playwright/` mencionado en sesiones previas).
4. Nuevos módulos: `backend/app/visual_critic.py` + infraestructura de captura (Playwright).
5. Dependencias: Fases 1-3 completas, para que haya algo consistente que criticar.
6. Riesgo: alto — es lo más nuevo arquitectónicamente, más caro en costo/latencia, y el que más puede impactar el tiempo de generación. Debe diseñarse para correr de forma asíncrona o solo en la generación final, no en cada micro-edición del chat.
7. Verificación: correr sobre 5-10 generaciones reales de verticales distintas, confirmar que detecta problemas reales (overflow, contraste, CTA duplicado) sin falsos positivos que bloqueen generaciones válidas.

**Fase 5 — Information Architecture + Design Memory**
1. Objetivo: policy explícita de páginas por vertical + registro de diseño persistente independiente del blob de schema.
2. Sistemas afectados: #2, #14.
3. Archivos: `backend/app/ai_site_planner.py`, `backend/app/db_models.py` (nuevas columnas o tabla).
4. Nuevos módulos: posible `backend/app/information_architecture.py`.
5. Dependencias: Fases 1-2 (necesita tokens estables para poder "recordarlos" con sentido).
6. Riesgo: medio — toca el modelo de base de datos.
7. Verificación: generar sitio, agregar una página nueva después, confirmar que hereda exactamente la misma paleta/tipografía sin degradar.

---

## FINAL VERDICT

**1. ¿LYRA es un AI page generator o ya tiene arquitectura de AI designer?**
Es un punto intermedio real, no marketing vacío: tiene una arquitectura de pipeline por etapas genuina (8 agentes con responsabilidad separada, ejecución paralela, validación, y un mecanismo de revisión con corrección), lo cual ya la aleja de "un LLM que escupe HTML". Pero dentro de ese pipeline, las decisiones de diseño puro (color, tipografía, densidad, jerarquía de conversión) son todavía superficiales comparadas con lo que describís en tu lista. Es una arquitectura de AI designer en construcción, con los cimientos correctos ya puestos.

**2. ¿Qué porcentaje de la arquitectura objetivo está implementado?**
Aproximadamente 35-40%. El pipeline estructurado (#15) y la composición por secciones (#8) están genuinamente bien encaminados. Business Intelligence, IA de información, y Design Tokens están a mitad de camino. Conversion Strategy y Visual Critic están prácticamente en cero.

**3. ¿Los 3 gaps más importantes?**
- Visual Critic / Self-Review Loop — sin esto, no hay forma de verificar objetivamente si cualquier otra mejora funcionó.
- Conversion Strategist — afecta directamente el objetivo de negocio (que el sitio convierta), y hoy es prácticamente inexistente como capa de reglas.
- Design Tokens incompletos (spacing/radius/shadow/type scale) — es la base física de que todo lo demás se vea consistente, y hoy solo cubre color y 2 nombres de fuente.

**4. ¿Qué NO tocar porque ya está bien diseñado?**
`LyraOrchestrator`, `LyraIntakeEngine`, y la composición `SectionBlock`/`PageSchema`. Estas tres piezas tienen buena separación de responsabilidades, validación con Pydantic, y manejo de fallos — son una base sólida para construir encima, no para reemplazar.

**5. ¿Cuál es el siguiente paso exacto?**
Terminar Color Intelligence (ya en curso, aprobar el diff pendiente), seguir inmediatamente con Typography Intelligence por ser el mismo patrón de bajo riesgo, y recién después entrar a Conversion Strategist y Visual Critic — que son más grandes y se benefician de tener tokens estables primero para poder criticar algo consistente.
