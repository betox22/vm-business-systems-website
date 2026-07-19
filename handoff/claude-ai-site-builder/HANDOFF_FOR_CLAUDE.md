# Handoff para Claude: V&M AI Site Builder prototype

## Contexto

Claude no puede abrir la URL del prototipo porque responde `401 Unauthorized`
desde fuera de la sesion de Codex/ChatGPT. Usa este paquete como fuente de
revision en vez del link.

URL original, solo como referencia:

https://vm-ai-site-generator-prototype.realorialab.chatgpt.site/

El prototipo mostrado en las capturas es un wizard interactivo para generar un
sitio inicial. El ejemplo usa el negocio `Crazy Box`, una tienda online de
productos curiosos, accesorios, hogar, carro, ropa y articulos de anime con
envios globales.

## Que revisar

Quiero que compares este prototipo con la arquitectura y experiencia que
propondrias para KREATON/V&M y respondas:

- Que partes conviene aprovechar.
- Que partes conviene rehacer.
- Que riesgos ves en UX, arquitectura, mantenimiento y escalabilidad.
- Que flujo seria mejor para pasar de intake a seleccion de template a
  generacion real.
- Que haria falta para convertir esto de demo visual a producto usable.

## Capturas incluidas

Las capturas estan en `screenshots/`:

- `01-business-setup.png`: paso 1, configuracion del negocio.
- `02-template-selection.png`: paso 2, seleccion visual de plantilla.
- `03-generation-plan.png`: paso 3, resumen y plan de generacion.
- `04-review-desktop.png`: revision del sitio generado en escritorio.
- `05-review-mobile-preview.png`: revision del sitio generado en vista movil.
- `06-final-result.png`: mismo resultado final desde el boton del sidebar.

## Archivos fuente incluidos

Los archivos copiados estan en `source/`:

- `ai-builder.html`: estructura principal del builder local existente.
- `ai-builder.css`: estilos del builder.
- `ai-builder.js`: logica principal del intake/generacion.
- `site-viewer.js`: render/visor de sitios generados.
- `template-router.js`: seleccion/ruteo de templates.
- `package.json`: dependencias del proyecto.
- `backend-app/main.py`: API FastAPI principal.
- `backend-app/models.py`: modelos de request/response.
- `backend-app/orchestrator.py`: orquestacion de generacion.
- `backend-app/lyra_intake_engine.py`: motor de intake.
- `templates/README.md`: notas de arquitectura de templates.
- `templates/template-runtime-registry.json`: templates ejecutables.
- `templates/ai-generator-system-prompt.txt`: prompt del generador.

## Puntos tecnicos importantes

En `ai-builder.js`, estas funciones son claves para la revision:

- `reviewAndGenerateFromGuided()`: coordina guardado del guided intake y llama
  a generacion.
- `saveGuidedClientRequest()`: persiste el intake guiado antes de generar.
- `generateWebsite()`: envia el payload al endpoint de generacion.
- `collectPayload()`: arma el payload final desde formulario/guided state.
- `guidedStateForApi()` y `guidedSessionDraftForApi()`: serializan el estado.
- `handleServerNeedsMoreInfo()`: muestra cuando backend pide mas informacion.
- `CLIENT_INTAKE_AUTOSAVE_DELAY_MS`: autosave actual configurado en 3200 ms.

Hay una decision pendiente conocida: `salesFlow`/`salesMode` no debe
arreglarse con heuristicas inventadas sin confirmar el contrato correcto del
backend. Si revisas esto, prioriza confirmar transporte y schema antes de
proponer normalizaciones.

## Observaciones del prototipo visual

- El flujo visual es fuerte: sidebar de progreso, cards limpias, preview
  desktop/mobile y score de revision.
- La seleccion de templates comunica bien direccion visual, pero aun parece
  demo: las miniaturas son abstracciones, no previews reales del template.
- El resultado generado muestra buena direccion de ecommerce premium, pero la
  revision deberia separar mejor "preview del sitio" de "checklist/diagnostico".
- El prototipo dice explicitamente que no publica ni modifica el proyecto real.

## Prompt sugerido

Puedes pegar esto en Claude junto con los archivos/capturas:

```text
No puedes abrir la URL porque da 401. Usa las capturas y archivos incluidos.

Revisa el prototipo V&M AI Site Builder y comparalo con la arquitectura que
propondrias para KREATON/V&M.

Evalua:
- UX del wizard de intake
- seleccion de templates
- flujo de generacion
- preview desktop/mobile
- arquitectura frontend/backend
- sistema de templates
- que aprovechar
- que rehacer
- riesgos y proximos pasos

Se directo y prioriza recomendaciones accionables.
```
