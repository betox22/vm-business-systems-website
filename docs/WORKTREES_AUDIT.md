# Auditoría de worktrees de Git

Fecha de la inspección: 2026-09-11.

Alcance: inspección de solo lectura del repositorio `vm-business-systems-website`. No se ejecutaron `fetch`, `merge`, `checkout`, `stash`, `rm` ni operaciones de limpieza. Los conteos de archivos sin rastrear se obtuvieron con `git status --short --untracked-files=all`, por lo que incluyen individualmente los archivos contenidos en directorios sin rastrear.

## Mapa registrado

| carpeta | rama actual | limpio/sucio | archivos modificados | archivos sin rastrear | commit actual (corto) | commits detrás de origin/main | commits adelante de origin/main | fecha del último commit |
|---|---|---:|---:|---:|---|---:|---:|---|
| `C:/Users/alber/Projects/vm-business-systems-website` | `feature/vm-operations-general` | sucio | 6 | 1313 | `0b4f42d` | 14 | 0 | `2026-08-24T15:35:53-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-admin-panel` | `feature/kreaton-admin-dashboard` | sucio | 0 | 5 | `a05bb48` | 20 | 0 | `2026-08-24T10:19:53-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-cart-module` | `feature/shared-cart-module` | sucio | 0 | 4 | `c789259` | 13 | 0 | `2026-08-24T16:18:38-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-contact-form` | `feature/contact-form-leads` | limpio | 0 | 0 | `6de2b73` | 4 | 0 | `2026-09-04T13:55:53-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-cookie-auth` | `security-cookie-auth-frontend` | limpio | 0 | 0 | `6faeced` | 205 | 1 | `2026-07-25T13:23:48-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-google-hotfix` | `fix/magic-link-client-setup-redirect` | sucio | 6 | 4 | `6de2b73` | 4 | 0 | `2026-09-04T13:55:53-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-inline-coverage` | `feature/inline-editor-coverage` | sucio | 0 | 9 | `c35b1b6` | 33 | 0 | `2026-08-23T17:30:15-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-inline-editor` | `feature/inline-editor-poc` | sucio | 0 | 30 | `05689b9` | 34 | 0 | `2026-08-23T16:06:06-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-inline-shared-shell` | `feature/inline-editor-shared-shell` | limpio | 0 | 0 | `d9a2d64` | 30 | 0 | `2026-08-23T20:28:49-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-listokds-home` | `fix/listokds-home` | sucio | 3 | 2 | `8a88561` | 9 | 0 | `2026-09-01T20:17:48-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-luma-api` | `security-cookie-auth` | sucio | 0 | 1 | `3f74f79` | 428 | 1 | `2026-07-25T13:23:49-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-main-merge` | `main` | sucio | 41 | 2621 | `621400e` | 10 | 0 | `2026-09-01T15:35:39-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-micro-interactions` | `feature/shared-micro-interactions` | limpio | 0 | 0 | `4db69f0` | 12 | 0 | `2026-09-01T14:54:14-04:00` |
| `C:/Users/alber/Projects/vm-business-systems-website-stripe-integration` | `feature/legal-pages-consent` | limpio | 0 | 0 | `fb4964e` | 0 | 0 | `2026-09-11T16:22:28-04:00` |

## Salida literal de `git worktree list -v`

```text
C:/Users/alber/Projects/vm-business-systems-website                      0b4f42d [feature/vm-operations-general]
C:/Users/alber/Projects/vm-business-systems-website-admin-panel          a05bb48 [feature/kreaton-admin-dashboard]
C:/Users/alber/Projects/vm-business-systems-website-cart-module          c789259 [feature/shared-cart-module]
C:/Users/alber/Projects/vm-business-systems-website-contact-form         6de2b73 [feature/contact-form-leads]
C:/Users/alber/Projects/vm-business-systems-website-cookie-auth          6faeced [security-cookie-auth-frontend]
C:/Users/alber/Projects/vm-business-systems-website-google-hotfix        6de2b73 [fix/magic-link-client-setup-redirect]
C:/Users/alber/Projects/vm-business-systems-website-inline-coverage      c35b1b6 [feature/inline-editor-coverage]
C:/Users/alber/Projects/vm-business-systems-website-inline-editor        05689b9 [feature/inline-editor-poc]
C:/Users/alber/Projects/vm-business-systems-website-inline-shared-shell  d9a2d64 [feature/inline-editor-shared-shell]
C:/Users/alber/Projects/vm-business-systems-website-listokds-home        8a88561 [fix/listokds-home]
C:/Users/alber/Projects/vm-business-systems-website-luma-api             3f74f79 [security-cookie-auth]
C:/Users/alber/Projects/vm-business-systems-website-main-merge           621400e [main]
C:/Users/alber/Projects/vm-business-systems-website-micro-interactions   4db69f0 [feature/shared-micro-interactions]
C:/Users/alber/Projects/vm-business-systems-website-stripe-integration   fb4964e [feature/legal-pages-consent]
```

## Carpeta no registrada

`C:/Users/alber/Projects/vm-business-systems-website-auth-validation-build` existe en disco, pero no aparece en `git worktree list -v`. No es un worktree enlazado/prunable: contiene un directorio `.git` propio, por lo que se comporta como una copia Git independiente. Su rama actual es `fix/client-auth-validation-limbo`; ocupa aproximadamente 250 MiB (262,035,944 bytes), contiene unos 5,590 archivos y, a nivel superior, conserva la estructura completa del proyecto (`backend`, `docs`, `tests`, `templates`, archivos HTML, JavaScript, CSS y configuración, entre otros).

---

# Segunda pasada: clasificación de contenido

Fecha de la inspección: 2026-09-11. Esta sección se añadió sin ejecutar `add`, `commit`, `rm`, `checkout`, `merge`, `stash` ni otras operaciones que alteren Git. Los conteos usan `git status --porcelain=v1 --untracked-files=all`. El propio `docs/WORKTREES_AUDIT.md`, creado durante la primera pasada, aparece ahora como archivo sin rastrear en la carpeta principal.

## Parte A — carpetas de alto riesgo

### `vm-business-systems-website` (sin sufijo)

Total observado: 1,320 entradas: 6 modificadas y 1,314 sin rastrear.

| grupo de primer nivel | cantidad |
|---|---:|
| copias `public-dist*.discard*` (11 directorios) | 1,166 |
| `output/` | 133 |
| `docs/` | 11 |
| raíz | 4 |
| `images/` | 2 |
| `backend/` | 1 |
| `css/` | 1 |
| `js/` | 1 |
| `tests/` | 1 |

Desglose relevante de segundo nivel:

| grupo | cantidad | clasificación aparente |
|---|---:|---|
| `output/playwright/` | 130 | evidencias/resultados de QA |
| `output/lyra-v2-qa/` | 3 | evidencias/resultados de QA |
| `docs/legal/` | 6 | documentación fuente potencialmente valiosa |
| `docs/design-concepts/` | 2 | prototipos/documentación potencialmente valiosa |
| `backend/tests/` | 1 | prueba fuente modificada |

Archivos de código, pruebas, documentación o activos potencialmente únicos — se excluyen aquí las copias `public-dist*.discard*` y los resultados bajo `output/`:

```text
 M backend/tests/test_luma_chat_response.py
 M css/corporate-premium.css
 M docs/AGENT_LOG.md
 M index.html
 M js/corporate-i18n.js
?? CODEX-PROMPT-legal-pages.md
?? client-setup-v2.css
?? copper-kettle-logo-test.png
?? docs/LYRA_ARCHITECTURE_AUDIT.md
?? docs/WORKTREES_AUDIT.md
?? docs/design-concepts/b2b-saas-concept.html
?? docs/design-concepts/mega-retail-store-concept.html
?? docs/legal/descargos-de-responsabilidad.md
?? docs/legal/disclaimers.md
?? docs/legal/politica-de-privacidad.md
?? docs/legal/privacy-policy.md
?? docs/legal/terminos-de-servicio.md
?? docs/legal/terms-of-service.md
?? images/example-marketplace.jpg
?? images/listokds-product-dashboard.png
?? tests/ai-builder-logo-intent-policy.test.mjs
```

Además hay un archivo rastreado modificado, `output/playwright/mega-retail-store-desktop.png`, que parece evidencia visual y no código fuente.

Posibles ausencias en `.gitignore`: las copias `public-dist*.discard*/` y los directorios de evidencia `output/playwright/` y `output/lyra-v2-qa/` no están cubiertos por las reglas actuales. El `.gitignore` solo cubre `public-dist/`, no sus copias con sufijos. La conveniencia de ignorar todo `output/` debe evaluarse con cuidado porque el repositorio ya rastrea algunas evidencias dentro de esa carpeta.

### `vm-business-systems-website-main-merge`

Total observado: 2,662 entradas: 41 modificadas y 2,621 sin rastrear.

| grupo de primer nivel | cantidad |
|---|---:|
| `backend/` | 2,594 |
| `output/` | 27 |
| `src/` | 16 |
| `tests/` | 13 |
| raíz | 8 |
| `scripts/` | 2 |
| `client/` | 1 |
| `templates-preview/` | 1 |

Desglose relevante de segundo nivel:

| grupo | cantidad | clasificación aparente |
|---|---:|---|
| `backend/deps/` | 2,573 | dependencias Python vendorizadas/locales |
| `backend/app/` | 8 | código fuente modificado |
| `backend/tests/` | 9 | 8 pruebas modificadas y 1 nueva |
| `backend/.test-deps/` | 2 | dependencias de prueba |
| `backend/test_deps/` | 2 | dependencias de prueba |
| `src/ai-builder/` | 16 | 9 archivos modificados y 7 nuevos de código fuente |
| `tests/` | 13 | 6 archivos modificados y 7 nuevos de pruebas |
| `output/phonehub-premium-e2e/` | 9 | ejecución/evidencia de prueba |
| `output/phonehub-real/` | 9 | ejecución/evidencia de prueba |
| `output/premium-benchmark/` | 6 | evidencia visual |
| `output/mega-retail-live-validation/` | 3 | evidencia visual |

Archivos modificados de fuente real o pruebas:

```text
 M ai-builder.css
 M ai-builder.html
 M ai-builder.js
 M backend/app/agents.py
 M backend/app/ai_site_planner.py
 M backend/app/color_theory.py
 M backend/app/image_assets.py
 M backend/app/lyra_intake_engine.py
 M backend/app/main.py
 M backend/app/models.py
 M backend/app/orchestrator.py
 M backend/tests/test_catalog_reconciliation.py
 M backend/tests/test_color_theory.py
 M backend/tests/test_image_assets.py
 M backend/tests/test_luma_chat_response.py
 M backend/tests/test_planner_copy_strategy.py
 M backend/tests/test_public_site.py
 M backend/tests/test_site_plan_sections.py
 M backend/tests/test_website_builder_intake.py
 M client/setup/index.html
 M scripts/build-ai-builder.mjs
 M scripts/stage-public-site.mjs
 M shared-commerce-cart.js
 M site-viewer.js
 M site.html
 M src/ai-builder/auth.js
 M src/ai-builder/catalog-seed-policy.js
 M src/ai-builder/chat.js
 M src/ai-builder/color-provenance.js
 M src/ai-builder/construction-preview-policy.js
 M src/ai-builder/index.js
 M src/ai-builder/logo-intent-policy.js
 M src/ai-builder/renderers.js
 M src/ai-builder/state.js
 M templates-preview/live-preview.html
 M tests/ai-builder-catalog-seed-policy.test.mjs
 M tests/ai-builder-client-project-start-policy.test.mjs
 M tests/ai-builder-construction-preview-policy.test.mjs
 M tests/ai-builder-inline-edit-policy.test.mjs
 M tests/ai-builder-theme-policy.test.mjs
 M tests/shared-commerce-cart.test.mjs
```

Archivos nuevos potencialmente valiosos, excluyendo dependencias y resultados de ejecución:

```text
?? backend/tests/test_phonehub_content_fidelity.py
?? pnpm-lock.yaml
?? pnpm-workspace.yaml
?? src/ai-builder/brand-offer-policy.js
?? src/ai-builder/catalog-fidelity-policy.js
?? src/ai-builder/color-value-policy.js
?? src/ai-builder/contact-info-policy.js
?? src/ai-builder/guided-draft-storage-policy.js
?? src/ai-builder/language-policy.js
?? src/ai-builder/premium-product-policy.js
?? tests/ai-builder-brand-offer-policy.test.mjs
?? tests/ai-builder-catalog-fidelity-policy.test.mjs
?? tests/ai-builder-contact-info-policy.test.mjs
?? tests/ai-builder-guided-draft-storage-policy.test.mjs
?? tests/ai-builder-language-policy.test.mjs
?? tests/ai-builder-logo-intent-policy.test.mjs
?? tests/ai-builder-premium-product-policy.test.mjs
```

Posibles ausencias en `.gitignore`: `backend/deps/`, `backend/.test-deps/`, `backend/test_deps/` y los cuatro subdirectorios observados bajo `output/` parecen dependencias o artefactos locales y no están cubiertos. Los archivos `pnpm-lock.yaml` y `pnpm-workspace.yaml` no se clasifican como basura: pueden ser configuración fuente intencional y requieren decisión humana.

## Parte B — worktrees con pocos archivos sucios

### `admin-panel`

```text
?? output/playwright/kreaton-admin-audit-mobile.png
?? output/playwright/kreaton-admin-clients-desktop.png
?? output/playwright/kreaton-admin-clients-mobile.png
?? output/playwright/kreaton-admin-login-desktop.png
?? output/playwright/kreaton-admin-templates-desktop.png
```

### `cart-module`

```text
?? output/playwright/shared-cart-fashion-desktop.png
?? output/playwright/shared-cart-premium-desktop.png
?? output/playwright/shared-cart-retail-desktop.png
?? output/playwright/shared-cart-visual-check.mjs
```

### `inline-coverage`

```text
?? output/playwright/inline-editor-coverage/b2b-desktop.png
?? output/playwright/inline-editor-coverage/b2b-direction-a-desktop.png
?? output/playwright/inline-editor-coverage/b2b-direction-a-mobile.png
?? output/playwright/inline-editor-coverage/b2b-mobile.png
?? output/playwright/inline-editor-coverage/capture.mjs
?? output/playwright/inline-editor-coverage/premium-desktop.png
?? output/playwright/inline-editor-coverage/premium-direction-a-desktop.png
?? output/playwright/inline-editor-coverage/premium-direction-a-mobile.png
?? output/playwright/inline-editor-coverage/premium-mobile.png
```

### `inline-editor`

```text
?? output/playwright/inline-editor-poc/b2b-after.png
?? output/playwright/inline-editor-poc/b2b-before.png
?? output/playwright/inline-editor-poc/b2b-during.png
?? output/playwright/inline-editor-poc/commercial-after.png
?? output/playwright/inline-editor-poc/commercial-before.png
?? output/playwright/inline-editor-poc/commercial-during.png
?? output/playwright/inline-editor-poc/stage2/b2b-after.png
?? output/playwright/inline-editor-poc/stage2/b2b-before.png
?? output/playwright/inline-editor-poc/stage2/b2b-during.png
?? output/playwright/inline-editor-poc/stage2/b2b-polished-after.png
?? output/playwright/inline-editor-poc/stage2/b2b-polished-before.png
?? output/playwright/inline-editor-poc/stage2/b2b-polished-during.png
?? output/playwright/inline-editor-poc/stage2/commercial-after.png
?? output/playwright/inline-editor-poc/stage2/commercial-before.png
?? output/playwright/inline-editor-poc/stage2/commercial-during.png
?? output/playwright/inline-editor-poc/stage2/commercial-polished-after.png
?? output/playwright/inline-editor-poc/stage2/commercial-polished-before.png
?? output/playwright/inline-editor-poc/stage2/commercial-polished-during.png
?? output/playwright/inline-editor-poc/stage2/validate.mjs
?? output/playwright/inline-editor-poc/wix-states/b2b-saas-editing.png
?? output/playwright/inline-editor-poc/wix-states/b2b-saas-empty.png
?? output/playwright/inline-editor-poc/wix-states/b2b-saas-hover.png
?? output/playwright/inline-editor-poc/wix-states/b2b-saas-keyboard-focus.png
?? output/playwright/inline-editor-poc/wix-states/b2b-saas-selected.png
?? output/playwright/inline-editor-poc/wix-states/premium-product-editing.png
?? output/playwright/inline-editor-poc/wix-states/premium-product-empty.png
?? output/playwright/inline-editor-poc/wix-states/premium-product-hover.png
?? output/playwright/inline-editor-poc/wix-states/premium-product-keyboard-focus.png
?? output/playwright/inline-editor-poc/wix-states/premium-product-selected.png
?? output/playwright/inline-editor-poc/wix-states/validate.mjs
```

### `listokds-home`

```text
 M css/corporate-premium.css
 M index.html
 M tests/listokds-home-integration.test.mjs
?? images/listokds-glass-tag-product.png
?? preview-listokds-review.html
```

### `google-hotfix`

```text
 M ai-builder.html
 M ai-builder.js
 M client/setup/index.html
 M src/ai-builder/auth.js
 M src/ai-builder/supabase-magic-link.js
 M tests/ai-builder-supabase-magic-link.test.mjs
?? .pytest-tmp-auth-merge/test_admin_audit_event_survive0/admin-audit-restart.db
?? .pytest-tmp-auth-merge/test_admin_audit_event_survivecurrent
?? .pytest-tmp-auth-merge/test_template_override_survive0/runtime-overrides.db
?? .pytest-tmp-auth-merge/test_template_override_survivecurrent
```

### `luma-api`

```text
?? CLAUDE.md
```

## Parte C — commits divergentes

`git cherry -v origin/main HEAD` marcó ambos commits con `+`: sus parches exactos no existen literalmente en `origin/main`. Sin embargo, la inspección del contenido actual de `origin/main` muestra implementaciones equivalentes posteriores.

### `cookie-auth` — `security-cookie-auth-frontend`

```text
6faecedebff0590a0939605e16fd6d052e5968cc|2026-07-25T13:23:48-04:00|security: use httpOnly client auth cookies in frontend
```

El commit modifica únicamente `ai-builder.js` y `seller-portal.js` (168 inserciones, 37 eliminaciones). Migra tokens del navegador a `/api/client/auth/session`, usa `credentials: "include"`, añade cierre de sesión y encabezado CSRF. El `origin/main` actual ya contiene `/api/client/auth/session` y solicitudes con `credentials: "include"` en ambos archivos, además de la implementación modular en `src/ai-builder/auth.js`. Conclusión de solo lectura: el parche no es idéntico, pero su objetivo principal parece ya aplicado de otra forma/refactorizado en `main`.

### `luma-api` — `security-cookie-auth`

```text
3f74f797fc0ba4f0907f152971788a99a3383d3f|2026-07-25T13:23:49-04:00|security: issue httpOnly client auth cookie
```

El commit modifica `app/main.py` y `app/schemas.py` (121 inserciones, 7 eliminaciones): crea la cookie `luma_client_session`, endpoints de sesión/logout, lectura cookie/Bearer y protección CSRF. El backend de `origin/main` vive ahora bajo `backend/app/`; `backend/app/main.py` contiene `luma_client_session`, `POST /api/client/auth/session` y autenticación que acepta esa cookie. Conclusión de solo lectura: el parche exacto tampoco está integrado literalmente, pero la funcionalidad principal parece haber sido trasladada e implementada en la arquitectura actual de `main`.

## Parte D — carpeta no registrada `auth-validation-build`

Estado:

```text
## fix/client-auth-validation-limbo...origin/fix/client-auth-validation-limbo
 M ai-builder.css
 M ai-builder.html
 M client/setup/index.html
 M package.json
 M src/ai-builder/auth.js
 M src/ai-builder/state.js
?? src/ai-builder/client-auth-validation-policy.js
```

Último commit:

```text
1fed825b28082e8e7b2a81ba8776e1429d4bd238|2026-09-02T10:07:32-04:00|fix: complete Google OAuth resume after account selection
```

El remoto `origin` está configurado como una ruta local, tanto para fetch como para push:

```text
origin  C:/Users/alber/Projects/vm-business-systems-website-google-hotfix (fetch)
origin  C:/Users/alber/Projects/vm-business-systems-website-google-hotfix (push)
```

Comparación `git rev-list --left-right --count HEAD...origin/main`:

```text
2  0
```

Interpretación: esta copia independiente está 2 commits adelante y 0 detrás de la referencia `origin/main` que conoce localmente. No se ejecutó `fetch`, por lo que esa referencia conserva la antigüedad que ya tenía la copia.
