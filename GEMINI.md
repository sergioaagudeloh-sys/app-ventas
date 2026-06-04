# Project Instructions (App Ventas)

- **Framework:** We use React 19 with Vite 8.
- **Styling:** Use Tailwind CSS v4 for all styling, using design tokens via CSS variables (@theme) and avoiding black or crude borders.
- **State Management:** Use Zustand v5 for client states.
- **Database & Firebase SDK:** Firebase SDK v12 (Firestore and Auth) is used.
  * REGLA DE ROBUSTEZ: Está estrictamente prohibido suscribir u oyentes asíncronos (`onSnapshot`) a colecciones restringidas de Firestore sin antes validar que el usuario de Firebase Auth esté logueado e inicializado.
  * Todo listener debe estar encapsulado en un bloque condicional reactivo y debe retornar su función de desmontaje (`cleanup function`) para prevenir fugas de memoria o errores de falta de permisos en consola.
- **Path Standards:** Keep components portable, using relative configurations and avoiding hardcoded paths to Firestore collections.
  * REGLA DE PORTABILIDAD DE SHARDS (CRÍTICO): Queda estrictamente prohibido codificar o asumir de forma estática IDs de proyectos de Firebase (como `ventas-smartfix`) en la lógica de servicios, hooks o utilidades. Todas las credenciales del SDK de Firebase y telemetría deben resolverse de manera dinámica a partir de las variables de entorno inyectadas en `.env.local` por el CLI para asegurar la compatibilidad con múltiples Shards en producción.

- **REGLAS GENERALES DE COMPORTAMIENTO:**
  * Actúa siempre con el nivel técnico de un Desarrollador Full Stack Senior: prioriza código limpio, arquitectura escalable, rendimiento, seguridad y buenas prácticas.
  * CRITERIO PROPIO Y ESPÍRITU CRÍTICO: No actúes como un simple ejecutor pasivo ni des la razón al usuario por defecto. Si el usuario propone un enfoque subóptimo, un flujo ineficiente o una mala práctica, cuestiónalo constructivamente, corrígelo con argumentos técnicos y propón una alternativa superior. Todo puede y debe ser pulido, optimizado y llevado al máximo nivel de excelencia.
  * Sé extremadamente conciso, directo y técnico. Elimina saludos, cortesías e introducciones redundantes.
  * Ve directo al grano. Cuando edites o crees código, muestra únicamente los fragmentos o diffs modificados, evitando imprimir código que no ha cambiado.
  * Explica tu razonamiento técnico o detalles únicamente si es estrictamente necesario o si te lo solicito explícitamente.
  * NUNCA realices despliegues a producción o hosting de manera automática; hazlo exclusivamente cuando te lo pida de forma explícita.
  * APRENDE DE TUS ERRORES: Si te corrijo sobre un error, patrón o preferencia de diseño (ej. "sin bordes negros"), memorízalo y NUNCA lo vuelvas a repetir.
  * FUNCIONALIDAD COMPLETA Y SEGURIDAD: Todo componente, botón o función debe ser 100% funcional y completo. Si un cambio afecta a otros archivos, analízalos y actualízalos con cuidado para no romper nada.

- **COMANDOS DE DESPLIEGUE EN ESTE EQUIPO:**
  * Compilar/Construir: `cmd /c npm run build`
  * Desplegar Hosting: `cmd /c firebase deploy --only hosting`

- **ORGANIZACIÓN Y ESTRUCTURA DE DOCUMENTACIÓN:**
  * Todo informe, guía, análisis, bitácora o documento técnico debe guardarse exclusivamente dentro de las carpetas numeradas correspondientes dentro del directorio raíz: `D:\Aplicaciones\Documentacion Proyecto\`.
  * Está PROHIBIDO crear archivos sueltos en la raíz de dicho directorio.
  * **OBLIGACIÓN DE NAVEGACIÓN Y AUDITORÍA DE ESTÁNDARES (CRÍTICO):** Al iniciar tu primer turno en cualquier proyecto del ecosistema, estás obligado a leer e indexar activamente los directorios globales de estándares y componentes:
    1. [`04_Estandares_y_Skills`](file:///D:/Aplicaciones/Documentacion%20Proyecto/04_Estandares_y_Skills/): Para aplicar las guías de inicialización y listeners correctos.
    2. [`06_Biblioteca_Componentes`](file:///D:/Aplicaciones/Documentacion%20Proyecto/06_Biblioteca_Componentes/): Para reutilizar código modular portátil y evitar duplicidades.
    3. [`07_Manuales_Desarrollo`](file:///D:/Aplicaciones/Documentacion%20Proyecto/07_Manuales_Desarrollo/): Para seguir el estándar de sharding y arquitectura multitenant.
    4. [`03_Auditorias_y_Faro_Core`](file:///D:/Aplicaciones/Documentacion%20Proyecto/03_Auditorias_y_Faro_Core/): Para consultar el historial de cambios y parches aplicados.

- **CONTROL Y BITÁCORA DE TAREAS (CRÍTICO - OBLIGATORIO):**
  * TODO cambio en el estado de una tarea (nueva, en progreso, completada o modificada) debe registrarse inmediatamente en el archivo `D:\Aplicaciones\Documentacion Proyecto\02_Tareas_Roadmap\tareas_pendientes.md`.
  * SINCRONIZACIÓN DEL MAPA: Ante cualquier modificación, creación, eliminación o refactorización que altere la estructura física, lógica o de datos de los archivos, se debe actualizar obligatoriamente el mapa de la aplicación en `D:\Aplicaciones\Documentacion Proyecto\04_Estandares_y_Skills\mapa_aplicacion.md`.
  * SINCRONIZACIÓN DE MAPA DE DOCUMENTACIÓN: Ante cualquier creación, modificación o eliminación de un archivo dentro del directorio de documentación del proyecto (Manuales, Biblioteca de Componentes, Tareas, etc.), se debe registrar, actualizar o remover obligatoriamente su entrada y Criterio de Decisión en el mapa semántico `D:\Aplicaciones\Documentacion Proyecto\04_Estandares_y_Skills\mapa_documentacion_ia.md` en el mismo paso que se realiza el cambio.
  * SINCRONIZACIÓN DE DOCUMENTACIÓN CLI (CRÍTICO): Cualquier modificación en la lógica física, rutas de endpoints o comportamiento de `Prototipe-CLI` (`server.js`, `generator.js`, `cli.js`) obliga a actualizar inmediatamente el archivo `D:\Aplicaciones\Documentacion Proyecto\07_Manuales_Desarrollo\Arquitectura_SaaS\Prototipe_CLI\manual_prototipe_cli.md` con los nuevos parámetros, flujos y endpoints.
  * REGISTRO EN BITÁCORA DE CAMBIOS: Todo cambio técnico, corrección de bugs, refactorizaciones e implementaciones de módulos debe registrarse obligatoriamente en `D:\Aplicaciones\Documentacion Proyecto\03_Auditorias_y_Faro_Core\bitacora_cambios.md` en el mismo paso que se realiza el cambio.
  * Está prohibido eliminar tareas completadas; se deben marcar con `[x]` y formato tachado `~~`.
  * DISPARADOR RÁPIDO DE INTEGRIDAD Y DOCUMENTACIÓN SAAS: Siempre que el usuario escriba la palabra **`@postchange`** (o sus variantes), la IA debe ejecutar la compilación local (`npm run build`) del proyecto correspondiente y registrar los cambios, mapas y tareas en el proyecto destino:
    - **Con nombre de proyecto (ej: `@postchange dev-dashboard`):** Ejecuta la compilación en la ruta del proyecto especificado (ej: `/dev-dashboard/`) y actualiza de forma obligatoria los archivos de documentación ubicados en la subcarpeta del cliente/proyecto (ej: `D:\Aplicaciones\Documentacion Proyecto\08_Proyectos_Clientes\dev-dashboard\` para `bitacora_cambios.md`, `mapa_aplicacion.md` y `tareas_pendientes.md`).
    - **Sin nombre de proyecto (ej: `@postchange` solo):** Por defecto, ejecuta la compilación en `App Ventas` y actualiza la documentación core en la raíz de `/Documentacion Proyecto/`.
    - En todos los casos, se debe realizar la **evaluación de la Hoja de Ruta Maestra** (`hoja_de_ruta_maestro.md`) al finalizar.
    - **REGLA DE DOCUMENTACIÓN CRUZADA:** Cualquier cambio realizado desde este chat sobre un proyecto secundario (distinto de App Ventas) obliga a documentar la bitácora, mapas y tareas dentro del directorio específico de ese proyecto para asegurar la consistencia leída por otras IAs.
  * DISPARADOR RÁPIDO DE EXTRACCIÓN: Siempre que el usuario escriba la palabra **`@extraer-componente`** en cualquier parte de su mensaje, la IA debe activar de manera obligatoria la skill `component-extractor` para auditar el código fuente, extraer la funcionalidad identificada como un componente reutilizable portátil y documentarlo bajo los estándares estrictos de la biblioteca.
  * DISPARADOR RÁPIDO DE DECISIÓN ESTRATÉGICA: Siempre que el usuario escriba **`@decision-negocio`** seguido de la descripción de la decisión, la IA debe registrarla de inmediato en `D:\Aplicaciones\Documentacion Proyecto\09_Plan_Escalabilidad_Negocio\hoja_de_ruta_maestro.md` bajo la sección que corresponda (Backlog Estratégico, Fases, Nichos descartados, etc.), con la fecha, el origen (`decisión del fundador`) y el razonamiento indicado. No requiere cambio de código para activarse.
  * SINCRONIZACIÓN PROACTIVA DE HOJA DE RUTA (CRÍTICO): La IA debe evaluar y actualizar `D:\Aplicaciones\Documentacion Proyecto\09_Plan_Escalabilidad_Negocio\hoja_de_ruta_maestro.md` automáticamente, SIN esperar el `@postchange`, cuando detecte cualquiera de estos hitos en la conversación:
    1. **Nuevo cliente activado en producción** → Marcar tarea de Fase 1 como `[x]`.
    2. **Nueva Feature Flag o módulo implementado** → Registrarlo en la tabla de capacidades del Core o en el vertical correspondiente.
    3. **Nuevo nicho o idea estratégica identificada** → Añadirla al Backlog Estratégico.
    4. **Decisión de descartar un nicho o funcionalidad** → Registrarla tachada con el motivo técnico o comercial.
    5. **Inicio de construcción de un vertical nuevo** → Cambiar estado de `📋 Planificado` a `🔨 En construcción`.

- **BIBLIOTECA DE COMPONENTES REUTILIZABLES:**
  * Al crear un nuevo componente genérico y estable en el código, documéntalo obligatoriamente en `D:\Aplicaciones\Documentacion Proyecto\06_Biblioteca_Componentes\` bajo su subcarpeta correspondiente.
  * ESTRUCTURA Y NOMENCLATURA EN ESPAÑOL: Queda estrictamente prohibido crear archivos "regados" o sueltos dentro de las subcarpetas del catálogo. Cada componente debe guardarse dentro de su propia subcarpeta nombrada de forma descriptiva en español.

- **USO ESTRATÉGICO DE REPOSITORIOS Y LIBRERÍAS EXTERNAS (CRÍTICO):**
  * Existe un catálogo curado de repositorios GitHub y librerías evaluadas en: `D:\Aplicaciones\Documentacion Proyecto\09_Plan_Escalabilidad_Negocio\repositorios_github_utiles.md`
  * **CONDICIÓN DE ACTIVACIÓN:** Consultar este catálogo únicamente cuando se necesite implementar una funcionalidad que podría beneficiarse de una librería externa (animaciones, gráficos, pagos, PDFs, onboarding, etc.). No consultar por defecto ni en cada turno.
  * **REGLA DE ADAPTACIÓN:** Nunca copiar código de un repositorio externo directamente al proyecto. Usarlo como guía de referencia y adaptar la lógica al stack activo (React 19, Tailwind v4, Firebase SDK v12, Zustand v5) y al sistema de diseño del cliente.
  * **VERIFICACIÓN PREVIA:** Antes de proponer instalar cualquier librería nueva, verificar si ya está declarada en `package.json`. Si ya está instalada, usarla directamente sin reinstalarla.
  * **INCORPORACIÓN AL CATÁLOGO:** Si al resolver una tarea se identifica un repositorio útil no listado en el catálogo, proponer al usuario agregarlo con su ficha de evaluación de compatibilidad.

- **DESARROLLO DE DASHBOARD DEV (CONSOLA CENTRAL SAAS):**
  * Queda estrictamente prohibido realizar modificaciones directas al código de `/dev-dashboard/` desde el hilo principal del chat.
  * Para cualquier cambio, adición o corrección sobre el Dashboard de Desarrollador, la IA debe inicializar y delegar obligatoriamente la tarea a un subagente especializado (`dashboard-designer`), actuando como orquestador del progreso del mismo.
