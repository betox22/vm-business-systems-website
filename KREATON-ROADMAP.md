# KREATON / LYRA: estado real y hoja de ruta

Ultima actualizacion: 2026-09-13

## Veredicto ejecutivo

KREATON no es un prototipo vacio. Tiene autenticacion, persistencia, generacion con OpenAI, almacenamiento de imagenes, plantillas, edicion de texto, administracion, carrito y APIs comerciales reales. El backend de produccion esta activo en el commit `f93bd52c2ce6f5450f42bfd63edc8c8d88eb0692`; `/healthz` responde correctamente y `/api/ai-status` confirma OpenAI, planner, almacenamiento y Unsplash configurados.

Sin embargo, el producto todavia no cumple de forma consistente la promesa principal: convertir la intencion real de cualquier negocio en un sitio profesional y fiel. El caso BuildRight Hardware demuestra un fallo estructural, no cosmetico. El negocio se clasifico como `industrial_supplier`, pero otra capa independiente reinterpretó la frase "home improvement" como decoracion del hogar, omitio la llamada de IA y publico un catalogo estatico de lamparas, velas, mantas, macetas, marcos y difusores.

Por tanto, el estado comercial honesto es: **beta funcional con componentes reales, pero no lista para generacion autonoma sin revision humana**. La prioridad no debe ser sumar mas plantillas. Debe ser garantizar fidelidad de catalogo, imagenes y hechos antes de publicar.

## Incidente BuildRight Hardware

### Causa exacta

1. `backend/app/taxonomy.py`, `infer_seed_profile()` (lineas 198-222), solo reconoce unos pocos perfiles por regex. No existe un perfil para `industrial_supplier`, ferreteria, herramientas, electricidad, plomeria, seguridad industrial o marina.
2. La regla de `home` (lineas 218-219) acepta la palabra inglesa `home`. La descripcion "hardware and home improvement store" queda clasificada como perfil semilla `home`, aunque la clasificacion principal haya sido `industrial_supplier`.
3. `backend/app/agents.py`, `semantic_seed_catalog()` (lineas 539-579), solo llama a `generate_ai_seed_catalog()` cuando el perfil es exactamente `default`. Al recibir `home`, evita OpenAI y toma directamente `SEED_PRODUCT_LIBRARY["home"]`.
4. `backend/app/agents.py` (lineas 405-412) contiene literalmente los seis productos observados en BuildRight: Nordic Table Lamp, Aromatic Candle Set, Soft Knit Throw Blanket, Ceramic Planter Set, Minimalist Photo Frame Set y Ceramic Aroma Diffuser.
5. `CatalogAgent.run()` (lineas 1250-1295) ejecuta ese catalogo determinista antes del planner. `LyraOrchestrator.run()` (`backend/app/orchestrator.py`, lineas 141-155) corre Art Director, Copywriter y CatalogAgent en paralelo, y despues intenta el planner de OpenAI.
6. `ensure_plan_seed_catalog_with_source()` (`backend/app/ai_site_planner.py`, lineas 1638-1748) vuelve a invocar el mismo catalogo semilla y puede sustituir o completar el resultado del planner. Ademas, todavia puede heredar del seed precio, rating y badge. Esto crea dos autoridades distintas para el catalogo y permite que el fallback deshaga una decision correcta del planner.

### Resultado de reproducciones

Se ejecuto `CatalogAgent` con el codigo actual, primero sin OpenAI y luego con la llamada real habilitada:

| Negocio | Sin OpenAI | Con OpenAI real | Evaluacion |
| --- | --- | --- | --- |
| BuildRight Hardware | Catalogo `home` estatico | El mismo catalogo `home`; OpenAI no se llama | Incorrecto y bloqueante |
| Casa Brava Restaurant | Menu estatico de restaurante | El mismo menu estatico | Tematicamente cercano, pero inventado y no especifico |
| Barberia Central | Catalogo generico de tote/tray/pouch | Cortes, fade, barba, afeitado y combos | Relevante cuando alcanza OpenAI |
| MotorPro Garage | Catalogo generico de tote/tray/pouch | Cambios de aceite, frenos, diagnostico y bateria | Relevante cuando alcanza OpenAI |
| Harbor Parts | Catalogo generico de tote/tray/pouch | Helice, bomba de achique, bateria marina, luces e impulsor | Relevante cuando alcanza OpenAI |

La evidencia descarta que "la IA nunca se llama". Se llama solo para rubros que el regex deja en `default`. Los rubros que chocan con una categoria estatica quedan atrapados en un catalogo prefabricado, aunque el planner conozca la industria correcta.

### Gap adicional de integridad

`generate_ai_seed_catalog()` exige hoy `price: float > 0` y luego fabrica `price_type="fixed"`, USD, ratings y badges (`backend/app/agents.py`, lineas 428-535). Ese contrato contradice la regla mas reciente del planner: si el cliente no dio un precio, debe quedar `quote_only` o "Precio por confirmar". Incluso el camino de IA relevante puede producir hechos comerciales no declarados.

El test `backend/tests/test_real_ai_catalog.py` no detecto BuildRight porque mockea OpenAI y prueba rubros que caen en `default`. Tambien afirma explicitamente que hardware sin API key debe usar el seed generico. No cubre la colision `home improvement` -> `home`, ni compara la clasificacion principal con el perfil semilla.

## Inventario de producto

### Verificado hoy en produccion

- Backend `kreaton-lyra-api` saludable y sirviendo `main` en `f93bd52c...`.
- OpenAI, planner AI, almacenamiento y Unsplash reportan configuracion activa mediante `/api/ai-status`.
- `usekreaton.com/client/setup/` y `usekreaton.com/admin/` responden por la superficie publica.
- El fallo BuildRight es reproducible en el codigo actual incluso con OpenAI real, porque el camino incorrecto evita la llamada.

### Construido y respaldado por tests, pero no revalidado hoy de punta a punta en produccion

- Auth de cliente y admin, sesiones, roles y recuperacion de proyectos: rutas en `backend/app/main.py` y politicas frontend.
- Persistencia de ediciones del dueno: `PUT /api/client/sites/{site_id}` verifica propiedad y persiste `GeneratedSite.generated_config`; cobertura en `backend/tests/test_client_site_update.py` y `tests/ai-builder-client-site-save.test.mjs`.
- Edicion quirurgica por chat: `/api/luma/edit`, motor backend y politicas frontend con pruebas de aislamiento de cambios.
- Generacion y revision de logo por IA con fallo no bloqueante: `backend/app/logo_generation.py` y `backend/tests/test_logo_generation.py`.
- Directorio administrativo, eliminacion transversal, overrides de plantillas y auditoria append-only: `backend/app/main.py`, `backend/app/admin_audit.py`, `backend/app/template_runtime.py` y sus suites.
- Carrito compartido en todas las plantillas comerciales, aislamiento por negocio/sitio y CTA `quote_only`: `shared-commerce-cart.js` y `tests/shared-commerce-cart.test.mjs`.
- Backend comercial con productos, inventario, ordenes, clientes, soporte, Stripe Checkout/Connect y webhooks: `backend/app/commerce.py` y `backend/tests/test_commerce_products.py` / `test_stripe_billing.py`.
- Motor de movimiento con GSAP, reducido por accesibilidad y compatible con inline edit: piloto solo en `mega-retail-store` y `b2b-saas-enterprise-pro`.
- Suite actual: backend `215 passed`, `26 subtests passed`; frontend `185 passed`.

### Parcial o con brecha funcional

- **Catalogo:** la capa semilla puede contradecir industria, ofertas y planner. Es el riesgo principal de calidad y veracidad.
- **Checkout publico:** el backend comercial existe, pero el carrito del sitio publico llama `openLeadModal()` al pulsar checkout (`site-viewer.js`, configuracion de `createSharedCommerceCart`). No esta conectado de punta a punta a `/api/v1/checkout/create-session`. No debe venderse aun como checkout completo de autoservicio.
- **Edicion:** hay cobertura amplia de texto inline y persistencia del schema. No equivale a un CMS completo para editar con la misma facilidad precios, inventario, imagenes, variantes, navegacion y estructura en las ocho plantillas activas.
- **Imagenes:** Unsplash esta configurado y hay roles/queries de imagen, pero la relevancia depende del catalogo. Un catalogo equivocado produce fotos coherentes con el dato equivocado, no con el negocio real.
- **Diseño:** Mega Retail, B2B SaaS y Premium Product tienen trabajo dedicado. El nivel no es uniforme entre todas las familias. Las microinteracciones compartidas solo estan habilitadas en dos plantillas.
- **Copy:** el planner tiene reglas AIDA/PAS y prohibiciones de copy generico, pero no existe aun un benchmark de produccion que mida especificidad, hechos inventados y calidad por rubro de manera sistematica.
- **Plantillas dinamicas:** se pueden activar/desactivar sin deploy y conservar sitios existentes. El numero exacto activo hoy no se verifico en esta auditoria mediante una sesion admin.
- **Pagos:** existen implementacion y tests con dobles de Stripe. No se ejecuto hoy una compra real, webhook real, reembolso ni payout de comercio en produccion.
- **Dominios, publicacion y miniaturas:** existen rutas y UI, pero no se hizo hoy una matriz real de publicacion, dominio y cache para todas las plantillas activas.

### Simulado, temporal o no demostrado

- Los seeds estaticos son contenido de demostracion, no catalogos obtenidos del cliente.
- Ratings, badges y precios generados por `generate_ai_seed_catalog()` son sinteticos. No deben publicarse como hechos.
- Los tests de Stripe validan contratos con mocks; no prueban movimiento real de dinero.
- Los tests de OpenAI con cliente mock prueban estructura, no relevancia semantica del modelo real.
- Las capturas y previews prueban renderizado, no conversion, accesibilidad completa ni mantenibilidad por parte de un cliente real.

### No iniciado o no cerrado

- Una unica autoridad de catalogo que preserve ofertas declaradas, separe marcas y complete solo cuando corresponde.
- Evaluacion automatica de relevancia catalogo-negocio antes de publicar.
- Remediacion de sitios antiguos que ya tengan productos, precios, modelos, ratings o badges inventados.
- CMS visual completo para catalogo, imagenes, variantes, inventario y estructura posterior a la entrega.
- Checkout publico conectado de punta a punta al backend comercial y verificado con transaccion real.
- Benchmark visual y de contenido contra referencias profesionales por viewport y rubro.
- Auditoria actual de RLS y privilegios en la base de produccion. El archivo `supabase/enable_rls.sql` solo habilita RLS en 16 tablas y deliberadamente no crea politicas. La afirmacion anterior de que RLS estaba "resuelto" no debe considerarse evidencia. El proyecto Supabase de KREATON no estuvo disponible en la conexion usada para esta auditoria, por lo que el estado vivo sigue sin verificar.
- Pruebas de recuperacion ante desastre, restauracion de backup, rotacion de secretos y objetivos operativos de disponibilidad.

## Comparacion con el estandar objetivo

La referencia compartida muestra el tipo de resultado que KREATON quiere vender: direccion de arte coherente, jerarquia fuerte, movimiento con intencion, imagenes especificas y una experiencia completa. La brecha no se cierra agregando mas CSS o mas plantillas.

| Dimension | Estandar objetivo | KREATON hoy |
| --- | --- | --- |
| Fidelidad al negocio | Productos, servicios y hechos trazables al brief | Puede sustituir la intencion por seeds de otra categoria |
| Direccion de arte | Sistema visual coherente con contenido y activos reales | Algunas plantillas son fuertes; calidad desigual y dependiente del fallback |
| Imagenes | Fotos especificas por producto, categoria y rol editorial | Unsplash funciona, pero la query hereda errores del catalogo y puede repetir visuales |
| Movimiento | Transiciones utiles y consistentes en todo el sitio | Motor real, piloto en dos plantillas |
| Edicion | Todo el contenido comercial mantenible por el dueno | Texto y schema parcial; catalogo/medios/estructura no son un CMS completo |
| Comercio | Carrito, checkout, pago, inventario y orden conectados | Backend real y carrito real, pero el checkout publico termina en lead modal |
| Control de calidad | No publica datos inventados ni contenido cruzado | Hay validaciones, pero el fallback puede introducir precios, ratings, badges y productos |
| Operacion | Seguridad, auditoria, backups y observabilidad verificables | Admin/auditoria construidos; RLS y recuperacion siguen sin cierre actual |

## Plan priorizado

### P0. Integridad de catalogo e intencion

1. Eliminar la seleccion de perfil por coincidencia amplia sobre texto concatenado. `home` no puede ganar por aparecer en "home improvement".
2. Crear un `CatalogIntent` estructurado y unico: industria primaria, ofertas declaradas, marcas, tipo de venta, categorias permitidas y categorias prohibidas.
3. Hacer que el planner sea la autoridad. El fallback determinista solo debe preservar ofertas del cliente o devolver items `quote_only`; nunca sustituir un catalogo coherente por seeds.
4. Cambiar `AISeedCatalogItem.price` a opcional. Prohibir precios, modelos, ratings, stock, descuentos y badges no declarados.
5. Registrar por item `content_origin`, hechos fuente y motivo de inclusion. Si no se puede justificar un item con el brief, no se publica.
6. Agregar un gate de relevancia antes de persistir: industria y ofertas deben tener cobertura semantica en el catalogo; ante baja confianza, LYRA pregunta en vez de inventar.
7. Construir una matriz de al menos 30 rubros con colisiones adversariales: hardware/home improvement, marina, barberia, mecanica, restaurante, legal, salud, educacion, moda y negocios mixtos.

**Criterio de salida:** BuildRight produce herramientas, electricidad, plomeria, tornilleria o seguridad industrial, cero decoracion; los 30 casos no muestran productos de otro rubro; cero hechos comerciales inventados.

### P1. Imagenes coherentes y activos reales

1. Generar queries distintas para `hero_editorial`, `product_packshot`, `category_lifestyle` y `detail_texture` desde el `CatalogIntent` validado.
2. Prioridad estricta: fotos del cliente, busqueda por producto real, banco curado, fallback neutral. Nunca reutilizar una imagen no relacionada para llenar espacio.
3. Detectar duplicados perceptuales y placeholders antes de publicar.
4. Mostrar procedencia de imagen en admin y permitir reemplazo rapido.

**Criterio de salida:** cada imagen corresponde al producto/seccion, no hay repeticion visible indebida y el admin puede explicar de donde salio.

### P2. Edicion posterior a la entrega

1. Completar editor estructurado de catalogo: nombre, descripcion, precio/consulta, imagen, categoria, variantes, stock y visibilidad.
2. Completar reemplazo/subida de imagenes y logo con persistencia real.
3. Anadir historial de cambios y rollback por sitio.
4. Ejecutar matriz real de las plantillas activas: editar, recargar, abrir en otro navegador y confirmar dato desde PostgreSQL.

**Criterio de salida:** un dueno puede mantener su sitio sin soporte de KREATON y sin editar JSON.

### P3. Comercio completo

1. Conectar `shared-commerce-cart.js` a las rutas reales de carrito y `/api/v1/checkout/create-session`.
2. Verificar Stripe Connect por tienda, webhook, inventario, confirmacion, fallo, cancelacion, reembolso y payout.
3. Separar claramente `quote_only` de compra directa en UI y ordenes.

**Criterio de salida:** compra real de prueba desde sitio publicado hasta orden pagada y visible para el dueno.

### P4. Calidad visual sistematica

1. Congelar el numero de plantillas activas hasta que cada una pase un benchmark comun.
2. Definir golden briefs por rubro y capturas desktop/mobile comparables.
3. Exigir jerarquia, ritmo, variedad de secciones, assets relevantes, accesibilidad y ausencia de overflow.
4. Expandir el motor de movimiento solo despues de pasar contenido e imagenes.

**Criterio de salida:** todas las plantillas ofrecidas cumplen el mismo minimo profesional, no solo las dos o tres mas trabajadas.

### P5. Seguridad y operacion

1. Auditar en produccion RLS, grants de `anon`/`authenticated`, rol de `DATABASE_URL`, policies y Storage.
2. Crear politicas owner-only donde corresponda y rutas privadas para operaciones administrativas.
3. Probar backups/restauracion, rotacion de secretos, logs de fallback y alertas por catalogo `seed_fallback`.
4. Definir disponibilidad y cold-start aceptables para login y generacion.

**Criterio de salida:** evidencia SQL actual, prueba negativa entre tenants, restauracion demostrada y alertas operativas activas.

## Pendientes nuevos por definir

### Idioma del sitio generado vs. idioma de la conversacion con LYRA

**Prioridad:** alta. Afecta a clientes reales cuyo mercado objetivo usa un idioma distinto al de la conversacion; no es solo un detalle de interfaz.

**Estado:** pendiente de auditoria, sin implementar. No esta confirmado si el intake pregunta explicitamente el idioma del contenido del sitio o lo infiere del idioma del chat. Existe `business.selectedLanguage` en el JSON, usado por el overlay de comercio de Fase 4, pero falta confirmar donde y como se decide durante el intake.

**Problema:** un cliente en Venezuela puede conversar con LYRA en espanol y necesitar una pagina en ingles para vender en Estados Unidos u otro mercado angloparlante. El idioma del chat no debe asumirse como la eleccion del idioma del sitio.

**Alcance al retomar:**

1. Auditar los archivos de intake/conversacion inicial en `src/ai-builder` y documentar con archivo:linea si se pregunta el idioma del sitio o se infiere del chat, incluyendo el origen de `selectedLanguage`.
2. Si se infiere sin preguntar, disenar una pregunta explicita y obligatoria: "En que idioma quieres que se vea tu pagina para tus clientes?". La respuesta debe ser independiente del idioma de la conversacion con LYRA.
3. Confirmar por separado el comportamiento de la interfaz/conversacion de LYRA: debe iniciar en ingles y mostrar espanol solo si el usuario escribe en espanol. Documentar si ya funciona asi o si requiere trabajo adicional; no confundir esta regla con el idioma del sitio generado.

**Criterio de salida:** evidencia del flujo actual y, tras aprobar el diseno correspondiente, un cliente puede conversar en espanol y elegir contenido publico en ingles sin que la deteccion del chat sobrescriba esa eleccion.

### Busqueda de dominios con precio final asistida por IA

**Prioridad:** a definir cuando se retome.

**Estado:** idea de producto aun no disenada ni implementada. Segun el estado aportado por el dueno, hoy no existe un buscador operativo de disponibilidad/precio de dominios en el producto; lo existente son pruebas y no hay paginas de clientes reales en linea mediante este mecanismo. Las rutas o pruebas previas no equivalen a un flujo comercial disponible.

**Dependencia:** elegir primero un registrador y su API de dominios antes de disenar el flujo.

**Alcance al retomar:**

1. Incorporar al flujo de creacion de pagina una busqueda asistida por IA que consulte disponibilidad y costo real del dominio contra el registrador elegido.
2. Mostrar al cliente solo el precio final: costo real del registrador mas el margen de vmbusiness. El margen no se revela al cliente.
3. Si el precio resulta alto, por ejemplo para un dominio premium, ofrecer alternativas reales mas economicas, verificando tambien disponibilidad y precio con el registrador. No inventar disponibilidad, alternativas disponibles ni importes.

**Criterio de salida:** tras elegir proveedor y aprobar el alcance, demostrar consultas reales de disponibilidad/precio, calculo del precio final y alternativas verificadas, sin exponer el margen al cliente. Documentar este pendiente no autoriza implementar ni contratar servicios.

### Arquitectura modular tipo Shopify/Wix (vision de producto)

**Prioridad:** a definir con Beto. Vision de mediano/largo plazo, posterior a resolver el checkout basico (Fases 5B/5C, impuestos y Stripe).

**Estado:** vision de producto pendiente de evaluacion, sin diseno tecnico ni implementacion aprobados.

**Objetivo:** poder vender el sistema de comercio completo o en modulos separados y activables de forma independiente: checkout, administracion del contenido de la pagina, operaciones/ventas, inventario y catalogo. Listo (POS) se vende aparte y sirve como referencia comercial, no como autorizacion para modificar ese producto. Se busca igualar la calidad y robustez de Shopify y Wix, con un precio de entrada mas competitivo para ganar mercado.

**Implicaciones a evaluar al retomar, sin decisiones tomadas:**

1. Separacion clara de capas: comercio (productos, inventario y ordenes), checkout/pagos, panel admin de contenido del sitio y panel de operaciones de venta. Evaluar cada una como modulo independiente con su propia API y contratos explicitos, evitando acoplamiento directo entre implementaciones.
2. Modelo de precios por modulo frente a plan completo: a definir con Beto; no es una decision tecnica.
3. Impacto en la arquitectura actual de `commerce.py` y el portal, donde hoy conviven estas responsabilidades, y una ruta incremental hacia la modularidad sin rehacer todo de cero ni romper los flujos existentes.

**Criterio de salida:** despues de resolver el checkout basico y acordar la prioridad con Beto, presentar limites de modulos, contratos, dependencias, activacion independiente y plan de transicion para aprobacion. Registrar esta vision no autoriza implementar cambios ni definir precios.

### Plantillas premium con pautas fijas + modulos especializados de tienda

**Prioridad:** vision de mediano/largo plazo, a definir con Beto.

**Estado:** idea de producto, sin implementacion aprobada. LYRA generaria plantillas candidatas siguiendo pautas concretas; las aprobadas quedarian guardadas como plantillas reutilizables de nivel "pro", en vez de generar todo desde cero en cada sitio. El costo inicial de generar y revisar candidatas seria mayor, pero podria destrabar el estancamiento actual de calidad.

**Pautas obligatorias para cualquier plantilla aprobada:**

1. Si es de venta (incluye productos/precios), debe incluir carrito y checkout funcionales, no opcionales.
2. Todas las plantillas, sin excepcion, deben tener un panel admin real conectado, no una maqueta, para modificar contenido, catalogo, precios, imagenes y demas datos del sitio.
3. La calidad objetivo debe ser comparable a plantillas premium de Shopify/Wix, no a plantillas genericas basicas.

**Modulos especializados de tienda:** independientes de la plantilla visual y activables segun el tipo de negocio.

- Toma de pedidos.
- Impresion de tickets.
- Gestion y seguimiento de ordenes.
- Recoleccion de datos del cliente (nombre, telefono, direccion, etc.).
- Generacion de etiquetas de envio.

**Criterio de salida:** al retomar, presentar un proceso de generacion, revision y aprobacion de candidatas reutilizables, con verificacion funcional de las pautas y contratos de los modulos especializados. Este registro no autoriza implementar ni generar candidatas ahora.

### Stripe Connect: cuenta propia de cada cliente para su checkout

**Prioridad:** prerequisito de diseno del checkout real (Fases 5B/5C), incluido el problema reportado del 7% de impuestos. Debe evaluarse antes de decidir la arquitectura de pagos.

**Estado:** pendiente de decision, sin implementacion autorizada en este paso. Segun Beto, la integracion de Stripe para KREATON, Listo POS y Listo KDS avanza desde otro frente en paralelo; este registro no implica modificar esos otros proyectos ni confirma que esa integracion este terminada.

**Dos niveles distintos, no intercambiables:**

1. Stripe de V&M/vmbusiness: cobrar a cada cliente de la plataforma (Representante/Cliente) su suscripcion o licencia de uso.
2. Stripe Connect o equivalente por tienda: cada dueno debe poder crear o conectar su propia cuenta de Stripe. Cuando sus clientes finales compren desde el carrito de su pagina, el cobro debe ir a la cuenta del dueno de esa tienda, no a la cuenta de vmbusiness.

**Alcance al retomar:** coordinar con Beto y revisar lo que ya exista; decidir explicitamente si el checkout se construye sobre Stripe Connect o Stripe simple, considerando el requisito de cuenta propia por tienda, porque la eleccion cambia el modelo de datos y el flujo de pago. No asumir que el Stripe de suscripciones de V&M resuelve los cobros de los clientes finales de cada tienda.

**Criterio de salida:** decision documentada sobre cuentas, destino de fondos, modelo de datos y flujo de checkout, coherente con la integracion paralela y aprobada antes de implementar Fases 5B/5C. No activar cobros ni implementar cambios por registrar este pendiente.

## Orden de inversion recomendado

No invertir ahora en mas plantillas ni mas efectos. El orden correcto es: integridad del catalogo, imagenes, edicion del dueno, checkout real, uniformidad visual y seguridad operativa. La razon es directa: un sitio visualmente atractivo con productos falsos o irrelevantes destruye confianza mas rapido que un sitio sencillo pero fiel.

Hasta cerrar P0 y P1, toda generacion deberia tratarse como borrador sujeto a revision, no como publicacion autonoma lista para un cliente de pago.
