@AGENTS.md
# Pecera — MVP feria

## Qué es
Feed vertical tipo Reels con pitches en video de 90 s de participantes de una feria
emprendedora. Tocar un reel lleva al perfil del participante con sus datos y canales
de contacto. Es una capa de descubrimiento: nada de pagos ni inversión en la app.

## Estado actual
- Hecho: feed `/` y perfil `/p/[slug]` con datos de prueba, probados en celular
  real. No rehacer esos componentes (`Feed`, `Reel`, `Avatar`, `VolverAlFeed`):
  extenderlos.
- Capa de datos: `getFeed`, `getPerfil` y `getSlugs` (async) en `lib/datos.ts`, que
  leen de Supabase con el cliente único de `lib/supabase.ts`. Es la única puerta a
  los datos. `lib/mock-data.ts` quedó sin usar.
- `/` y `/p/[slug]` son ISR con `revalidate = 60`. En el feed, solo el reel activo
  y sus vecinos llevan `src`.
- Orden del feed al azar en el celular (`components/FeedMezclado.tsx` + `lib/orden-feed.ts`):
  el HTML del ISR no trae reels (fondo vacío hasta hidratar). El orden vive en una variable
  de módulo: nuevo en cada recarga, el mismo al navegar dentro de la app (el `#hash` de
  "Volver" cae en el mismo reel). El logo del header (`LogoInicio`) lleva al feed; en el
  feed sube al primer reel sin scroll suave.
- `supabase/test-50.sql` carga 50 perfiles `test-*` y `test-50-limpiar.sql` los borra.
- Helpers: `lib/rol.ts` (colores y labels de rol/tipo) y `lib/contacto.ts`
  (normalización de canales). Reutilizarlos, no duplicar lógica.
- Videos y posters de prueba en `public/`; los posters se generaron con ffmpeg.
- Ingesta automática: `.github/workflows/ingesta.yml` (cron cada 10 min + manual,
  con modo seco) corre `scripts/ingesta/` (Node 24 corriendo TS directo, sin
  build). En v2 lee el Form de pitches (`vars.GOOGLE_SHEET_ID_V2`, pestaña
  "Respuestas de formulario 1", marca temporal D/M/YYYY): una respuesta = un pitch,
  que va al perfil de una cuenta existente; no crea perfiles. Comprime con ffmpeg,
  sube video + poster a R2 y publica el pitch con su descripción. La tabla
  `ingestas` lleva el estado por video (`origen_id` = ID de Drive). El input
  `reprocesar` (un origen_id) lo vuelve a procesar aunque esté ok.
- Asignación (`resolver` en `scripts/ingesta/formulario.ts`, regla guardada en
  `envios.regla`): bloqueado → rechazado; escrito = verificado → ese perfil; del
  equipo (`equipo_ingesta`) → perfil del email escrito o espera; si no, escrito que
  no es cuenta → perfil del verificado; escrito que es otra cuenta → espera. Lo en
  espera se reevalúa en cada corrida. Input `asignar` ("<origen_id> <slug o email>",
  leído del JSON del evento, nunca del `env:` del step) lo resuelve a mano. En modo
  seco también lee Supabase (solo lectura) para mostrar la regla.
- ffmpeg en el workflow: build estático de BtbN con versión y sha256 fijos (9.0,
  como el local), nunca el de apt. La rotación se aplica a mano (`-noautorotate` +
  transpose/flip en `video.ts`) y cada corrida arranca con un chequeo sintético
  (`chequeo.ts`, rotaciones 90/180/270) que corta el job si algo sale torcido.
- Subtítulos (`scripts/ingesta/subtitulos.ts`): fase 2 de la corrida. Después de
  publicar, con lo que quede de `INGESTA_PRESUPUESTO_MIN` (variable de GitHub, 9 min
  por defecto, contando toda la corrida) se transcriben los pitches publicados sin
  subtítulos con whisper.cpp y `ggml-large-v3-turbo-q5_0.bin` (revisión fija de
  Hugging Face, sha256 verificado, en caché). Nunca afecta la publicación: lo que
  no entra queda para la próxima; 3 errores y no se reintenta.
  Timeout y estimación usan la misma cuenta (`tiempoWhisperMs`): costo fijo
  (`INGESTA_WHISPER_FIJO_S`, variable de GitHub, 90 s por defecto) + segundos por
  segundo de audio (timeout 10; estimación arranca en 3 y pasa al peor medido por
  segundo de voz, sin el fijo). El chequeo cronometra el costo fijo (carga + una pasada) y el log lo
  separa de la transcripción. Si vence, el log dice a los cuántos segundos y con
  cuántos bloques. `reprocesar` + `solo_subtitulos` rehace solo los subtítulos.
- **Nada de texto inventado**: mejor `[]` que frases que la persona no dijo. El
  detector de voz Silero (`whisper-vad-speech-segments`) mide la voz; sin voz no se
  transcribe. whisper-cli corre con VAD, greedy, `-nf` (sin reintentos con
  temperatura) y `-mc 0` (sin contexto): así no entra en bucles. Se descartan los
  segmentos con confianza media < `INGESTA_CONFIANZA_MIN` (0,75) y, si lo que queda
  cubre menos de `INGESTA_COBERTURA_MIN` (0,5) de la voz, se guarda `[]`. El log
  por pitch muestra voz, cobertura, confianza y descartados (solo números). Medido:
  voz clara 0,88-1,00; voz poco clara con música 0,46-0,54.
- whisper.cpp: build oficial b5130 (= v1.9.4) para Linux x64, fijo por sha256 y en
  caché (`WHISPER_CPP` = su carpeta; trae sus .so, se corre con `LD_LIBRARY_PATH`).
  Silero `ggml-silero-v6.2.0.bin` en revisión fija (`WHISPER_VAD`). El audio lo
  extrae a WAV de 16 kHz el mismo ffmpeg 9.0.1 que comprime. El chequeo previo
  prueba detector y modelo; si falla, publica igual sin subtítulos y el job queda
  en rojo. Ya no se usa el filtro `whisper` de ffmpeg (ni el segundo ffmpeg 8.1.1).
- `/subir` redirige al Form con el email de la sesión precargado (`urlFormularioPitch`
  en `lib/cuenta.ts`). En /cuenta, `components/MisPitches.tsx` muestra lo de la
  función `mis_pitches()` (pitches publicados + envíos pendientes por email o perfil).
- App: `components/Subtitulos.tsx` dibuja los bloques arriba del nombre del reel,
  a la izquierda de la columna; CC recordado con `lib/subtitulos.ts` (localStorage).
- Columna de acciones del reel (estilo TikTok, termina arriba del nombre; el
  bloque de datos reserva `pr-14`): corazón + contador, CC y sonido. Íconos en
  `components/Iconos.tsx` (mismo trazo, `.icono-sombra`). `viewportFit: "cover"`
  en el layout para que funcionen los `env(safe-area-inset-*)`.
- Pique ("me picó", el like): corazón de la columna, doble toque en el video (un
  toque pausa tras 250 ms; sale un corazón donde tocó) y pop-up
  `components/PopupPique.tsx` (`<dialog>` nativo, `.vidrio.vidrio-popup` al 0,50:
  la menor opacidad con AA sobre video negro; todo el texto en Tinta sólida) solo
  al darlo, con la escena animada `components/EscenaPique.tsx`. `lib/piques.ts`: uuid anónimo en localStorage, piques propios recordados,
  optimista con RPC `dar_pique`/`quitar_pique`; los conteos salen de
  `conteo_piques` (ISR + refresco al montar). Si el conteo falla, el feed sale igual.
- Medición (`20261002120000_medicion.sql`, `lib/medicion.ts`): vistas (3 s de video, una
  por dispositivo y pitch cada 12 h, `registrar_vista`) y contactos (toques en canales del
  perfil y del pop-up, `registrar_contacto` con `keepalive`), con el uuid de
  `lib/dispositivo.ts`. anon solo ve agregados: `metricas_perfil(slug)` (vistas y piques
  por pitch en /p/slug, `GrillaPitches`). Los contactos solo en /admin (`admin_metricas`).
  Pruebas: `supabase/pruebas/medicion.mjs`.
- Migraciones nuevas en `supabase/migrations/` (las corre el usuario).
- La base guarda claves de R2 (`<id>.mp4`); `lib/media.ts` (`urlMedia`) arma la URL
  con `NEXT_PUBLIC_MEDIA_URL` y `lib/datos.ts` ya la aplica.
- La service key de Supabase vive solo en los secrets del workflow, jamás en la app.
- Cuentas (rama v2-cuentas): login con Google (Supabase Auth, PKCE) y "Mi perfil"
  en `/cuenta`. `@supabase/ssr` solo en `/cuenta`, `/auth`, `/subir`, `/admin` y las
  actions de `/eventos` (`lib/supabase-servidor.ts` y `proxy.ts`, cuyo matcher cubre esas
  rutas; la página del evento sigue estática y pide la sesión por action). Las páginas públicas nunca
  leen cookies: `lib/cuenta-local.ts` (`useCuentaLocal`) combina la cookie de sesión
  (parseada por nombre, con partes `.0`/`.1`; nada de regex en template literals) y
  un dato chico y público del perfil en localStorage (`pecera:cuenta`: slug, nombre,
  rol, foto, visible) que escribe `RecordarCuenta` en /cuenta y borra `BotonSalir`.
  Con eso `AccesoCuenta` muestra "Entrar" o la foto (va a /p/slug si es visible) y
  `BotonEditarFicha` ("Editar" sobre la franja, lleva a /cuenta) aparece solo en el perfil propio. Es solo interfaz. Reglas del form en `lib/cuenta.ts` (cliente y servidor);
  el trigger `perfiles_guardian` las repite en la base y bloquea slug, publicado,
  usuario_id, origen_id y consentimiento_at. Foto y logo se achican en el celular
  (`prepararImagen` en `lib/imagen.ts`): lado mayor ≤ 1024 px, con su proporción y sin
  recortar, ≤ 1 MB (`lib/limites-imagen.ts`, compartido con el servidor). La foto va en JPG
  sobre Marfil (el trigger solo acepta .jpg); el logo, en PNG si tiene transparencia. Las
  fallas dicen el motivo (pesada, formato o "problema nuestro"). En el alta la foto viaja con el form:
  `crearPerfilPersonal` la sube con `lib/foto.ts` (`lib/r2.ts`, `<userId>-<hash8>.jpg`; `lib/r2.ts`
  nunca le pasa un Request al fetch: Next lo rearma como stream y R2 responde 411); si
  falla, el perfil se guarda igual y se avisa;
  la vieja la anota el trigger en `r2_borrar`. Esas fotos no cuentan para el tope
  de 8 GB de la ingesta (pendiente para cuando se toque la ingesta).
- Legales: `/privacidad` y `/terminos` (estáticas, `components/PaginaLegal.tsx`),
  con links en `PieLegal` y junto a la casilla de consentimiento (pestaña nueva).
  Contacto en `CONTACTO_PRIVACIDAD`. **Son un BORRADOR para revisión legal.**
  Pendientes para el abogado: inscripción de la base en el Registro Nacional de
  Bases de Datos, transferencia internacional a proveedores fuera del país (art. 12
  de la Ley 25.326) y cuánto guardar los originales de Drive (hoy la ingesta no los
  borra). Si cambia qué datos se guardan o un proveedor, actualizar /privacidad y
  su fecha.
- Feria (rama v2-feria-lista, sobre v2-cuentas; guía en `docs/GUIA-FERIA.md`, pendientes
  en `docs/AUDITORIA.md`): migración aditiva `20261001120000_feria_lista.sql` con etiquetas
  de perfil, empresas, transparencia, eventos/votos y panel admin. Todo por funciones
  `security definer`; la app nunca escribe `empresa_id` ni las tablas nuevas directo.
  Si la migración no corrió, `faltaMigracion()` (lib/datos.ts) hace caer a las columnas de
  siempre y las páginas nuevas muestran un estado neutro. Pruebas de la migración sin tocar
  ninguna base: `supabase/pruebas/feria_lista.mjs` (PGlite en carpeta aparte).
- Vocabularios (etapas, rondas, tickets, industrias, cargos, especialidades) en
  `lib/etiquetas.ts`, espejo EXACTO de los `CHECK`: cambiar uno = migración nueva.
  Transparencia en `lib/transparencia.ts` (espejo de `empresa_datos_clave_valida`), glosario
  en `lib/glosario.ts` (los `slug` son anclas compartidas: no cambiarlos), legales en
  `lib/legales.ts`, programa del evento en `lib/eventos.ts` (Feria 21: 7 y 8/10 de 9 a
  17 h y 9/10 a la mañana en la Carpa Feria; Demo Day 9/10 14 h en el Auditorio, Urquía).
  La votación se abre y cierra a mano en /admin; `votacion` es el cronograma que se muestra.
- Ecosistema (rama claude/lucid-pascal-6wxt7j). Migraciones
  aditivas, a correr EN ORDEN: `20261003120000_pitch_build_producto_newsletter.sql`,
  `20261004120000_dataroom.sql`, `20261005120000_portfolio.sql`, `20261006120000_logos.sql`.
  Pruebas sin tocar ninguna base: `supabase/pruebas/pitch_build_producto_newsletter.mjs`
  (PGlite). Sin la migración, cada parte cae a vacío con `faltaMigracion()`.
  - Pitch del dueño: `pitches.oculto` + `editar_mi_pitch`/`ocultar_mi_pitch`/
    `mis_pitches_detalle` (`components/cuenta/AccionesPitch.tsx`). Insignia celeste
    `InsigniaPitch` igual en feed, perfil, empresa y cuenta. El pitch completa el perfil
    (`CompletarPerfil`).
  - Build in Public (`lib/build.ts`): hitos (uno solo en curso) y avances (5 por día); la
    racha es semanal y se calcula de las fechas de los avances (hora de Buenos Aires). El
    feed muestra el hito en curso (`ItemFeed.construyendo`).
  - Producto o servicio de la empresa (`lib/producto.ts`) con imágenes en R2 y One Pager
    imprimible (`/e/[slug]/one-pager`). Logo de empresa en `empresa_logos`
    (`poner_logo_empresa`); se dibuja con `LogoEntidad` (inicial si no hay logo).
  - Newsletter = un link (Substack u otra plataforma) en `perfil_newsletter`; nada de
    envíos ni suscripciones propias.
  - Academy (`/academy`): Startup Essentials (`lib/essentials.ts`, ejemplos siempre
    hipotéticos) y templates (`lib/plantillas.ts`) que se completan por pasos en
    `/cuenta/dataroom/plantilla/[id]` con borrador local (`lib/borrador.ts`). Los campos con
    `dato` se espejan en Transparencia.
  - Dataroom (`lib/dataroom.ts`, `empresa_documentos`): templates, documentos escritos y
    links, por categoría; privados por defecto, el switch `SwitchTransparencia` los hace
    transparentes de a uno; Realtime solo si la publicación existe. Exportar = página
    imprimible (PDF desde el navegador), sin dependencias. Subir archivos queda pendiente
    (R2 es público).
  - Portfolio (`lib/portfolio.ts`): relaciones perfil → organización (inversión, asesoría,
    directorio, mentoría…), visibilidad público/miembros/privado y confirmación de la
    empresa (declarada → pendiente → confirmada/rechazada). Track record calculado, nunca
    declarado. Servicios (aliados) y tesis (inversores). `/explorar` filtra por portfolio real.
- Landing `/sumate`: ver Rutas. Solo datos reales (`getPulsoEcosistema`, sin `test-*`, no
  muestra números < 5); todo lo de ejemplo va rotulado "ejemplo".
- Integración (rama `integracion`, une feria-21-pro y el ecosistema; auditoría en
  `docs/AUDITORIA-MASTER.md`). Nombres únicos: **Portfolio** = inversiones y clientes
  confirmados por la empresa (`portfolio`); **Links y documentos** = los links del perfil
  (tabla `portafolio`). Logo de empresa: se guarda en `empresa_logos` (`poner_logo_empresa`);
  `empresas.logo_url` es solo respaldo de lectura. Formulario de perfil: ya no hay (ver Perfil editable).
  El progreso del perfil en /cuenta lo muestra solo `CompletarPerfil`.
- Eliminar la cuenta (rama `borrar-cuenta`, migración `20261008120000_borrar_cuenta.sql`,
  pruebas `supabase/pruebas/borrar_cuenta.mjs`): `/cuenta/eliminar` confirma escribiendo
  ELIMINAR y llama a `borrar_mi_cuenta(p_dispositivo)` (una transacción: perfil y todo lo
  suyo, la empresa si es la única integrante o si no pasa la titularidad, `auth.users`,
  claves de R2 a `r2_borrar` con `now()`). Lo que queda: `origenes_borrados` (ID de Drive,
  /admin → Drive los lista para borrar a mano), `emails_borrados` (sha256 del email, con
  `hash_email` en la base y `hashEmail` en la ingesta) y las filas de `ingestas`/`envios` en
  'borrado' sin emails. Triggers: ningún pitch con origen borrado, y lo que se escriba de un
  origen borrado vuelve a 'borrado' con `intentos` 1000 (la ingesta vieja lo da por agotado).
  La ingesta saltea `origenes_borrados` siempre (también `reprocesar`/`asignar`) y marca las
  respuestas anteriores al borrado que nunca registró. Después: `limpiarNavegador`
  (`lib/borrar-cuenta.ts`, todo `pecera:*` salvo tema y subtítulos) y `AvisoCuentaEliminada`.
- Multi-empresa (rama `multi-empresa`, migración `20261010120000_multi_empresa.sql`, después de
  cofundador_conexiones; pruebas `supabase/pruebas/multi_empresa.mjs`; para volver atrás,
  `supabase/rollback-multi-empresa.sql`, que NO es migración): una persona en hasta 5 empresas.
  `empresa_miembros` (PK `id` propia a propósito: si la PK fuera empresa+perfil, PostgREST vería un
  muchos-a-muchos y el embed `empresa:empresas(...)` de main sería ambiguo) es la verdad;
  `perfiles.empresa_id` queda como la **principal** (la mantienen triggers, el tope de 5 es otro
  trigger) y `perfiles.cargo` es el cargo en la principal (espejado). Las funciones de siempre
  (main) siguen con su firma y trabajan sobre la principal; la app nueva usa las `_en(p_empresa, …)`
  y las de fila por id (hito, avance, documento, relación) autorizan por la empresa de la fila.
  En /cuenta la empresa va en la URL (`?empresa=slug`) y en cada action (`empresa_id`, contexto
  `EmpresaActual` + `CampoEmpresa`); nunca una "empresa activa" guardada. Helpers en
  `lib/cuenta-empresa.ts` (`leerMisEmpresas`, `elegirEmpresa`, `empresaParaAccion`, `rpcEn`, que cae a
  la función vieja si falta la migración). Reel: la principal y un chip "+N"; perfil: todas.
  Salir siendo la última integrante borra la empresa (`borrar_empresa_entera`: R2 a `r2_borrar`,
  portfolio ajeno a 'declarada') solo con ELIMINAR en `/cuenta/empresa/salir`, que ofrece exportar
  el Dataroom; `borrar_mi_cuenta` aplica la regla a cada empresa.
- Super dataroom (rama `super-dataroom`, migración `20261011120000_super_dataroom.sql`, después de
  multi_empresa; pruebas `supabase/pruebas/super_dataroom.mjs` y `node scripts/pruebas/vinculo.ts`;
  vuelta atrás `supabase/rollback-super-dataroom.sql`, que NO es migración; guía `docs/GUIA-MEDICION.md`).
  North Star = **conexiones INICIADAS** (CI): toque en un canal (`contactos`) de un origen (cuenta
  vinculada o dispositivo) a un perfil, sin otro toque del par en 24 h; el canal no suma. CI-Q: origen
  inversor/aliado → emprendedor. Proyectos sin `test-*`, `pecera` ni perfiles del equipo. Fórmulas
  solo en SQL (`metrica_*`, internas). `actividad` (append-only, lista cerrada, por
  `registrar_actividad`; NO se llama `eventos`, que es la votación) + `lib/actividad.ts`;
  atribución en `lib/atribucion.ts` (`?src=nfc&t=s16`, utm, first/last-touch, limpia la URL),
  sesión de 30 min en `lib/sesion.ts`, `components/Medicion.tsx` en el layout (`?equipo=1`),
  `MedirPerfil` en /p. Vínculo dispositivo ↔ cuenta: cookie httpOnly de `entrar` → callback con
  `vincularSinFallar` (`lib/vinculo.ts`: nunca traba el login), aviso `AvisoEntrar` en cada form de
  login. Borrar la cuenta limpia los dispositivos por trigger del vínculo (no se redefinió
  `borrar_mi_cuenta`). `metricas_hora` la llena `.github/workflows/metricas.yml` (podando la
  actividad de más de 90 días). `/admin/vivo` = pantalla del stand (k ≥ 5 en el ticker). Pestaña Medición de /admin
  (`app/admin/medicion.tsx`, `components/admin/Dataroom.tsx`): snapshot inmutable del Demo Day, CSV en
  `/admin/csv` y el dataroom. "¿Para qué?" tras un contacto: `lib/motivo.ts` + `PreguntaMotivo` (layout).
- Feria en vivo (rama `vivo-feria`, migración `20261012120000_vivo_feria.sql`, después de
  super_dataroom; pruebas `supabase/pruebas/vivo_feria.mjs`). `/admin/vivo` sobre fondo Pecera con
  todo el texto en Tinta sólida (6,5:1) y `tema-fijo`; logo = `isotipo-blanco` + `wordmark-tinta`
  (nunca el combinado: sus peces naranjas desaparecen). Ranking `admin_ranking_evento` (top 10 con
  puesto de competición, tope 12 filas, sin votos de `metrica_cuentas_equipo()`; filas con
  translateY y barras con translateX). `resultados_evento` no cambia. Empresas en la feria:
  `evento_empresas` (una representante por empresa, que está en `evento_participantes`; triggers la
  limpian si deja de participar o sale de la empresa); `admin_empresa_participante`,
  `admin_representante` (mueve los votos), `admin_pitch_feria` (#feria21 en la descripción) y
  `admin_feria` (`components/admin/GestionFeria.tsx`). Métricas con alcance (`?alcance=plataforma`
  en vivo, `?a=plataforma` en Medición; por defecto la feria): `*_en(…, p_alcance)`; el Demo Day
  congela dos filas (`demo_day_snapshots.alcance`). Sin la migración, todo cae a lo de antes.
  Desde `20261013120000_feria_todos_los_roles.sql` (después de vivo_feria; pruebas
  `supabase/pruebas/feria_todos_los_roles.mjs`; vuelta atrás `supabase/rollback-feria-todos-los-roles.sql`,
  que NO es migración) compite cualquier rol: `votar`, ranking, representante y métricas sin filtro de
  rol. En la feria se dice "participantes" (no "proyectos") y el ranking es "Ranking del público".
- Perfil editable y barra inferior (rama `perfil-inline`, migración `20261014120000_persona_empresa.sql`,
  después de feria_todos_los_roles; pruebas `supabase/pruebas/persona_empresa.mjs`; vuelta atrás
  `supabase/rollback-persona-empresa.sql`, que NO es migración). **Una cuenta = una persona** (como
  LinkedIn): `perfiles.tipo = 'persona'` en las cuentas nuevas (no se muestra); el tipo de entidad va en
  `empresas.tipo` (`TIPOS_EMPRESA` en `lib/etiquetas.ts`, espejo del CHECK) y el rol en cada una es
  `empresa_miembros.cargo`. Una persona puede no tener empresas. El alta y la pantalla de entrar lo
  explican (`AvisoCuentaPersonal`): primero tu perfil, después tu emprendimiento como empresa. Los
  perfiles viejos no se tocan.
  - El cuerpo de /p/[slug] es `components/perfil/VistaPerfil.tsx`: /p lo usa sin slots (el visitante ve
    lo de siempre) y /cuenta con slots de dueño. Cada sección: `SeccionEditable` ("+ Agregar" si está
    vacía, lápiz si tiene datos; `#editar-<clave>` la abre) → `FormSeccion` en una `Hoja`
    (`components/ui/Hoja.tsx`: bottom sheet en el celular, pregunta antes de descartar) →
    `guardarSeccion` (`app/cuenta/seccion.ts`: escribe solo las columnas de esa sección; las etiquetas
    del rol ya no son obligatorias, `validarPerfil(…, { pedirEtiquetas: false })`). Las que ya tenían
    editor (links, newsletter, tesis, servicios, portfolio) van en `SeccionConTarjeta`.
  - Alta mínima: `AltaPerfil` → `crearPerfilPersonal` (nombre y apellido, rol, una línea, dirección,
    consentimiento; foto opcional). Empresas: `EmpresasDueno` ("Administrar", "Agregar otra empresa" con
    `crear_empresa_basica`: nombre, tipo y cargo, sin logo ni descripción, o con código).
  - `NavInferior` (en el layout, vidrio): Explorar · Eventos · "+" naranja (`/cuenta#subir-pitch`,
    `lib/resaltar.ts`) · Cofundadores · Academy; no va en /admin/vivo, /sumate ni imprimibles. Su alto
    está en `--alto-nav` (globals.css): lo suman lo fijo abajo, el bloque del reel y un `::after` de cada
    `<main>` que scrollea. El menú hamburguesa ya no existe; el feed se abre con el logo, Mi perfil con
    el avatar, Mi red desde el perfil propio y el selector de tema está al final de /cuenta.
  - Compartir en el reel (`BotonCompartirReel`, entre el corazón y el CC): `navigator.share` o copia un
    mensaje con `/?src=compartir#<pitch>` y `/sumate`.
- Networking de la Feria 21 (rama `networking-feria`, migración `20261015120000_networking_feria.sql`,
  después de persona_empresa; pruebas `supabase/pruebas/networking_feria.mjs` y
  `node scripts/pruebas/networking.ts`; vuelta atrás `supabase/rollback-networking-feria.sql`, que NO es
  migración y es con pérdida; guía en `docs/GUIA-FERIA.md` §7).
  - Busca/ofrece en dos niveles: `CATEGORIAS_NECESIDAD` (10) y `NECESIDADES` (opción + categoría) en
    `lib/etiquetas.ts`, espejo de `necesidades_validas()` (la usan `perfiles_busca_valido`/`_ofrece_valido`,
    redefinidos: tope 10). Los 10 valores de antes siguen: 8 son opciones con el mismo id e `inversion` y
    `talento` son "en general" (valen por su categoría, no se ofrecen para elegir). Detalle libre
    (`busca_detalle`/`ofrece_detalle`, 8 de ≤ 30) y "cómo" por lado (`busca_como`/`ofrece_como`: `COMOS`).
    Un solo selector, `components/networking/SelectorBuscaOfrece.tsx` (categorías plegables, buscador,
    ejemplos por rol que suman), en la hoja del perfil y en Networking; guarda `guardarSeccion("buscaOfrece")`.
  - `/cofundadores` = pestañas `PestanasCofundadores` (`?ver=networking`, `?alcance=feria|plataforma`,
    `?editar=1`): Cofundadores sin cambios y `ListaNetworking` (todos los roles, filtro Feria 21 por defecto
    para quien participa, con `SelloFeria21` y `s21-*`). Encaje en `lib/networking.ts`
    (`encajeNetworking`: exacta 12, categoría 4, tope 30 por dirección; cómo +4; zona, industrias, etapa;
    razones con el nombre, nunca un pronombre). `lib/cofundador.ts` no cambia (solo exporta `lugar`).
  - Conexión: `networking_intereses` (tabla aparte: la PK de `cofundador_intereses` no admite un tipo sin
    redefinir todo) con `networking_interesar(p_a, p_mensaje, p_evento)`, `_responder`, `_retirar` y
    `mis_networking_conexiones`; tope propio de 20/día; `evento_id` = Feria 21 o null. El flujo de pantalla
    es compartido: `components/explorar/conexiones.tsx` y `useMatch`/`useNetworking` en `useMatch.ts`.
  - Aviso al anotarse (`AvisoNetworkingFeria`, en `TarjetaEvento`): al anotarse o al entrar a /cuenta si la
    anotó /admin; "Ahora no" lo cierra hasta el día siguiente (`pecera:aviso-networking`); con busca y ofrece
    completos no aparece más. Casilla OPCIONAL para la Universidad (`CasillaUniversidad`,
    `CONSENTIMIENTO_U21` con versión): `evento_consentimientos` por `guardar_consentimiento_evento` /
    `mi_consentimiento_evento`; retirar = `acepta false` con fecha. Con el convenio firmado, lo ve la
    Universidad en `/organizacion` (abajo). `/privacidad#universidad` lo explica.
  - `borrar_mi_cuenta` no cambió: las dos tablas nuevas caen en cascada con el perfil (probado).
- Panel de la Universidad (migración `20261016120000_panel_organizacion.sql`, después de networking_feria;
  pruebas `supabase/pruebas/panel_organizacion.mjs`; guía `docs/GUIA-FERIA.md` §8). `/organizacion`
  (dinámica, con sesión; en el matcher de `proxy.ts`, fuera de robots): entran los emails de
  `evento_organizadores` (privada; las carga /admin → Universidad con `admin_organizador`/`admin_organizadores`)
  y los admins (`puede_ver_organizacion`). `organizacion_networking(p_evento)`: números de la feria sin el
  equipo y, con nombre, SOLO quienes aceptaron (`evento_consentimientos.acepta`) con perfil visible; nunca
  mensajes ni quién con quién; `sin_completar` solo para admins. CSV de los consentidos en
  `/organizacion/csv` (celdas sin fórmulas, BOM). Helpers en `lib/organizacion.ts`.
- Quién vio tu perfil y Mi CRM (rama `quien-vio-tu-perfil`, migración `20261017120000_quien_vio.sql`, después de
  panel_organizacion; pruebas `supabase/pruebas/quien_vio.mjs` y `node scripts/pruebas/visitas.ts`; vuelta atrás
  `supabase/rollback-quien-vio-perfil.sql`, que NO es migración y es con pérdida). Todo arranca APAGADO: interruptores en
  `funciones_config` (visitas, pared y cuántos libres, traspaso), que lee `config_funciones()` (anon) y cambia /admin →
  Resumen → Funciones (`admin_funciones`), sin deploy. Tablas propias (`visitas`, `visitas_anonimas`, `visitas_ajustes`,
  `visitas_frecuencia`); NO toca actividad, vistas, piques ni las métricas (solo lee `metrica_cuentas_equipo()`).
  - Solo con sesión (`hayCookieSesion` + `supabaseNavegador`, las páginas siguen ISR): `registrarVisita` (`lib/visitas.ts`)
    en `MedirPerfil` (perfil), `Reel` a los 3 s (pitch, mismo criterio que vistas) y `Feed` al dar pique (sacarlo el mismo
    día borra la fila, `quitar_visita_pique`). Una fila por visitante → visitado → tipo → día de Buenos Aires
    (`lib/visitas-dia.ts`, espejo de `visitas_hoy()`); dedupe también en localStorage `pecera:visitas-dia`. Nunca tira.
  - Como visitante se cuenta recién desde el aviso (`AVISO_VISITAS` con versión; `AvisoVisitas` en el layout, sin
    bloquear). Se guarda la CUENTA (auth.users), nunca el dispositivo: sin perfil visible figura "sin perfil" y aparece
    con nombre al LEER si después lo arma. Modo privado = solo contador (`visitas_anonimas`); pasar a privado vuelve
    contador lo ya guardado; recíproco (en privado no ves quién te visitó). Nada de autovisitas ni del equipo. 30 días:
    las lecturas filtran y `podar_visitas` (service_role) corre en `.github/workflows/metricas.yml` (tolera 404).
  - `visitas` tiene una sola FK a `perfiles` (visitado) y el visitante va a `auth.users`: no hay muchos-a-muchos nuevo
    para PostgREST (PGRST201). Mantenerlo así.
  - Mi CRM: `/cuenta/crm` (dinámica, noindex), pestañas `PestanasCuenta` ("Mi perfil | Mi CRM") arriba de /cuenta y
    /cuenta/crm. Interruptor (`InterruptorVisitas`), resumen identificado + total anónimo (`metricas_perfil`, desde
    siempre), lista con filtros y páginas (`mis_visitas`), "Lo que otros ven de mí" (`mis_visitas_hechas`) y
    `BorrarHistorial`. Fuera de la v1: "Escribirle", notas, CSV, notificaciones; `contactos` sigue anónima.
  - Pared de pitches (apagada por defecto; /admin → Funciones, con cuántos libres, default 2): solo `Reel`/`Feed`
    reproducen pitches (perfil, empresa y "Ver el pitch" son posters que llevan a `/#<pitch>`), así que la pared vive en
    `Feed` (`usePared` en `lib/pared.ts`, reglas puras en `lib/pared-reglas.ts`, prueba `node scripts/pruebas/pared.ts`).
    Contador por navegador (`pecera:pared`: pitches distintos a los 3 s, sin sesión); el siguiente distinto queda sin
    `src`, con velo y `PopupPared` (Entrar con Google con `next=<ruta>#<pitch>`, `AvisoNavegadorInterno`, links a
    perfil/Explorar/Eventos, se cierra). Sin config o sin storage, abierta. `BienvenidaPared` al volver ofrece el
    perfil sin bloquear. Es capa en el cliente: invita e identifica, NO protege videos (R2 público, URLs en el RSC).
  - Traspaso de la sesión (apagado por defecto; requiere visitas prendidas): sin sesión, `registrarVisita` anota en
    sessionStorage `pecera:traspaso-sesion` (solo con el traspaso prendido; nunca se cruza actividad, vistas, piques
    ni `dispositivo_cuentas`). `PopupPared` muestra el aviso y la casilla "Mostrar que visité y di pique" (tildada)
    ANTES del botón; la lista (6 h, 10 por tipo, `lib/traspaso.ts`, prueba `node scripts/pruebas/traspaso.ts`) viaja
    en la cookie httpOnly `pecera-traspaso` de `entrar` y el callback llama `acreditarSinFallar` (2 s, en paralelo
    con el vínculo, nunca traba el login). `acreditar_traspaso` guarda el aviso y recién ahí acredita
    (`origen='traspaso'`), valida todo en la base y una vez por hora; destildada = modo privado sin acreditar. Se
    confía en la lista del navegador a propósito: verificarla contra la medición sería el cruce que se prohíbe.
- `components/TecladoIOS.tsx` (en el layout): iOS Safari deja la ventana corrida al cerrar el
  teclado (hueco abajo); al perder el foco vuelve `window` a 0. Nada scrollea el documento.
- Score crediticio A-D (rama `score-crediticio`; se calcula en la app, la única migración es el interruptor). Categoriza el
  riesgo de inversión según cuánta información de la empresa es **transparente** en su Dataroom
  (documentos y datos con el switch en "Transparente"; lo privado no cuenta). TODA empresa tiene score y
  arranca en D; A es el menor riesgo. La fórmula vive solo en `lib/score.ts` (sin imports en runtime, para
  probarla con `node scripts/pruebas/score.ts`, que tiene que terminar en "0 fallas"): 9 áreas del
  Dataroom (sin "Otros") con pesos que suman 100 (finanzas 20, tracción 20, legal 15, fundraising 10,
  fundadores 10, producto 8, mercado 7, modelo 5, empresa 5); un área suma entera si tiene UNA pieza que
  cuenta (plantilla completa, link https o escrito de ≥ 200 caracteres; un dato de Transparencia con
  valor). Umbrales: C ≥ 30, B ≥ 60 y con finanzas y tracción, A ≥ 85 y con finanzas, tracción y legal.
  Cambiar pesos o umbrales cambia el score de todas: va con la prueba. `lib/score-empresa.ts` lo conecta
  con los catálogos (`CATEGORIA_DE_DATO`, `DATOS`, `PLANTILLAS`), y de ahí sale "qué métricas, documentos
  y templates suben el score" (`METRICAS_SCORE`): un dato o template nuevo aparece solo. Lectura:
  `getScoresEmpresas` (`lib/datos.ts`, por lotes, anon; si falla, sin insignia, nunca un D falso).
  Se muestra en `/e/[slug]` (`PanelScore`), en la tarjeta de empresa de /p y /cuenta, en el Dataroom del
  dueño (público vs. potencial con lo privado) y en /explorar (insignia + filtro en Startups). La "i"
  (`Info`) explica cómo mejorarlo. `InsigniaScore.tsx` es aparte y liviano: Explorar la carga en el cliente.
  **Interruptor de emergencia, APAGADO por defecto** (migración `20261018120000_score_switch.sql`, después de
  quien_vio; columna `funciones_config.score_activo`, `config_score()` para anon y `admin_score(p_activo)` solo
  admins; pruebas `supabase/pruebas/score_switch.mjs`; vuelta atrás `supabase/rollback-score-switch.sql`, que NO
  es migración). Se prende en /admin → Resumen → Funciones ("Score crediticio"). La ÚNICA lectura es
  `scoreActivo()` (`lib/datos.ts`): si falla o falta la migración, apagado. Apagado no se ve NADA (insignias,
  filtro de Startups, `PanelScore`, la "i", el bloque del Dataroom) y `getScoresEmpresas` devuelve un Map vacío
  sin consultar. La acción revalida todo; si se cambia por SQL, /p, /e y /explorar (ISR) tardan hasta 60 s.
  **Pendiente legal** (sigue vigente; por eso el score está apagado): el texto de la "i" aclara que mide cuánta información hay, no si es verdadera, y que
  no es una calificación de riesgo regulada ni asesoramiento; antes del lanzamiento, que el abogado revise
  el nombre "crediticio" y los rótulos "Riesgo bajo/alto" (calificadoras de riesgo, CNV).
- `landing-liviano/` (rama `landing-liviano`): landing de scroll con video, **proyecto Vite aparte**
  (JS + GSAP + Lenis, su propio `package.json`; no es Next ni parte de `/sumate`). Todos sus CTA
  apuntan por URL absoluta a la app (`pecera-virid.vercel.app`). No lo despliega el proyecto de
  Vercel de la app: va como otro proyecto con Root Directory `landing-liviano/website`. Detalle en
  `landing-liviano/website/README.md`. ESLint lo ignora. `website/postcss.config.js` está vacío a
  propósito: sin él Vite toma el `postcss.config.mjs` de Tailwind de la raíz y la build falla.
  `public/bg.mp4` (17 MB) tiene todos los cuadros como keyframe para el scrub; no recomprimirlo
  a mano (`npm run prepare-media` lo regenera).
  - Carrusel de pitches debajo del lema (`src/pitches.js`, fuera del pin): pide `${VITE_API_BASE}/api/landing/pitches`
    al acercarse, esqueletos sin saltos, se mueve solo y despacio (con Pausar; nunca con reducir movimiento) y cada
    tarjeta abre `${VITE_APP_URL}/#<pitch>`. Si falla o viene vacío, desaparece. `VITE_APP_URL` y `VITE_API_BASE` (por
    defecto `https://pecera.lat`) viven en `website/vite.config.js` y se pisan por entorno (Vercel Preview).
- Endpoint público de la landing: `GET /api/landing/pitches` (`app/api/landing/pitches/route.ts`, `?n=` 1-20, 12 por
  defecto). Mismas condiciones que el feed, sin `test-*` ni el perfil `pecera`, solo con poster, orden por `orden` e `id`.
  Expone EXACTAMENTE `id, poster, descripcion (≤ 90, sin hashtags), nombre, slug, rol, empresa` (armado campo por campo
  en `forma.ts`, al lado). CORS `*` (GET y OPTIONS), `s-maxage=60, stale-while-revalidate=300`; si falla, 200 con
  lista vacía. Prueba `node scripts/pruebas/landing-pitches.ts` (0 fallas): agregar un campo = cambiarla a propósito.
- Próximo: deploy en Vercel; dominio propio para R2 después de la feria.

## Rama v2-cuentas (reglas)
- Todo se trabaja en `v2-cuentas`; `main` es producción y la feria depende de ella.
- La base de Supabase es COMPARTIDA con producción: migraciones solo aditivas
  (crear tablas o columnas), nunca borrar ni renombrar.
- El cron de la ingesta corre desde `main` (formulario viejo, `vars.GOOGLE_SHEET_ID`).
  La ingesta de esta rama (formulario nuevo) solo se prueba a mano:
  `gh workflow run ingesta.yml --ref v2-cuentas [-f seco=true]`. Comparten
  `concurrency: ingesta`, así que nunca corren a la vez. Escribe en la base y R2 de
  producción: probar con perfiles no publicados.

## Lanzamiento de v2-cuentas (el día que se une a main)
1. Correr `supabase/lanzamiento-cuentas.sql` en el SQL editor: revisar el listado,
   publicar los perfiles reales creados mientras tanto y prender `autopublicar`.
2. Cargar las variables de R2 (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_ENDPOINT`, `R2_BUCKET`) también en el entorno Production de Vercel.
3. Publicar la app de Google (modo producción), con las páginas de privacidad y
   condiciones ya publicadas.
4. Antes del merge, cerrar el Form viejo y esperar una última corrida de main. Desde
   el merge, el cron lee el Form nuevo (`GOOGLE_SHEET_ID_V2`); el viejo ya no se lee.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres) para datos · Cloudflare R2 para videos (MP4 720p vertical)
- Deploy en Vercel · Entorno de desarrollo: Windows + PowerShell

## Comandos
- `npm run dev` → servidor local en localhost:3000
- `npm run build` → verificar antes de cada commit importante
- `npm run lint` → ESLint; el plugin de React 19 es estricto
- `npm run ingesta:chequeo` → chequeo de rotación de la ingesta con el ffmpeg local
  (y de whisper si está `WHISPER_MODELO`)
- `npm run ingesta:subtitulos -- <video>` → transcribe local e imprime los bloques
  y los números. En `../pecera-originales/`: `WHISPER_CPP=whisper-cpp` (build de
  Windows x64 b5130), `WHISPER_MODELO` y `WHISPER_VAD=ggml-silero-v6.2.0.bin`
- `npm run ingesta:tipos` → chequeo de tipos del script de ingesta (tiene su propio
  tsconfig; el de la app excluye `scripts/`)

## Rutas
- `/` → feed de reels
- `/p/[slug]` → perfil del participante
- `/cuenta` → Mi perfil: login, alta mínima o el perfil propio editable (VistaPerfil con hojas por
  sección). Al crear, la action redirige a `/cuenta?creado=1` (`&foto=error` si la foto falló); si la
  cuenta ya tenía perfil (doble envío), a `/cuenta`. Las actions nunca tiran: toda falla vuelve como
  mensaje (22023 del trigger → campo). A los 20 s sin respuesta se ofrece reintentar;
  `app/cuenta/error.tsx` atrapa el resto.
- `/cuenta/eliminar` → qué se borra (`antes_de_borrar`) y confirmación con ELIMINAR
- `/subir` → al Form de pitches con el email de la sesión (sin sesión, a /cuenta)
- `/auth/callback` → vuelta de Google (`?next=` a la página de origen)
- `/e/[slug]` → página de empresa: equipo con cargos, pitches de todos y datos de
  transparencia compartidos (ISR, se genera en la primera visita)
- `/eventos` y `/eventos/[slug]` → Feria 21: programa, cómo votar y votación
  (`components/eventos/Votacion.tsx` pide el estado de la sesión al montar)
- `/docs` → redirige a `/academy/docs`; `/docs/conceptos` y `/docs/legales` siguen estáticas
- `/academy`, `/academy/docs`, `/academy/essentials/[slug]` → Academy (estáticas)
- `/explorar` → directorio con búsqueda (`?q=`) y vistas (`?ver=startups|inversores|aliados`);
  estática, los filtros viven en el cliente (`useSearchParams` con Suspense)
- `/e/[slug]/one-pager` y `/e/[slug]/dataroom` → One Pager y Dataroom público (ISR)
- `/cuenta/dataroom` (+ `plantilla/[id]`, `nuevo`, `doc/[id]`, `exportar`) → Dataroom del
  equipo (dinámicas, con sesión)
- `/sitemap.xml` y `/robots.txt` → `app/sitemap.ts` y `app/robots.ts` (no indexa cuenta,
  admin, auth ni subir)
- `/admin` → panel del equipo (dinámica, con sesión; acceso por la tabla `admins`)
- `/organizacion` (+ `/csv`) → panel de la Universidad para la Feria 21 (emails habilitados en /admin → Universidad, y admins)
- `/admin/vivo` → pantalla del stand: CI de hoy, ticker anónimo y ranking de la votación, cada 15 s
  (`admin_vivo_en` + `admin_ranking_evento`)
- `/cuenta/empresa` → Administrar empresa (`?empresa=slug`; sin él, la principal; `?pestana=`): pestañas
  Información (con tipo y cargo propio), Logo y marca, Contacto, Equipo, Producto, Build in Public y
  Métricas y documentos. "Guardar cambios" guarda la pestaña actual (`guardarEmpresaPestana`); avisa si
  hay cambios sin guardar al cambiar de pestaña o salir.
- `/cuenta/empresa/salir` → salir de una empresa (`?empresa=slug`); si es la última integrante,
  qué se borra, exportar el Dataroom y confirmación con ELIMINAR
- `/explorar` (startups, inversores, aliados y hashtags), `/t/[tag]` y `/t/[tag]/feed`
  (sección por hashtag; `#feria21` = la feria), `/cofundadores` (pestañas Cofundadores y Networking),
  `/red` (Mi red: los perfiles que seguís, en el celular)
- `/api/landing/pitches` → pitches públicos para la landing aparte (ver landing-liviano)
- `/sumate` → landing de adquisición (ISR 60 s), armada en `components/landing/`: Hero
  (con `EcosistemaVivo`: tarjetas de ejemplo unidas por corrientes y el isotipo quieto en
  el centro), Desparramado (problema → solución), demo,
  SegunQuienSos (pestañas por rol), MapaEcosistema (Descubrir/Construir/Conectar/Fondear/
  Aprender), BuildEnPublico, CaminoInversion, AcademyDataroom, ExplorarBusqueda (form real a
  `/explorar`), Confianza (datos en vivo), Diferencia, Preguntas (también JSON-LD), Cierre
  (video del acuario apagado) y PieLanding. Todos los CTA abren `ElegirRol` ("¿Qué te trae
  a Pecera?") y llevan a `/cuenta?rol=…`; "Solo quiero mirar" va al feed. CTA fijo
  `#cta-fijo` que se esconde donde hay otro CTA (`data-cta-zona`). Movimiento solo CSS +
  `Movimiento.tsx` (`data-revelar`, `data-escena`, `data-profundidad`, `data-magnetic`,
  barra de lectura); con reducir movimiento todo aparece ya armado.

## Datos
- `perfiles`: slug, nombre, tipo (startup, emprendimiento, aceleradora, incubadora,
  angel, fondo, coach), rol (emprendedor | inversor | aliado), descripcion,
  avatar_url, whatsapp, email, linkedin, instagram, web, publicado, origen_id,
  usuario_id (auth.users, null = sin dueño), oculto (lo maneja la persona),
  consentimiento_at. Visible = `publicado and not oculto`. El email de la cuenta
  nunca va a perfiles.
- `ajustes`: una fila; `autopublicar` decide si los perfiles de /cuenta nacen
  publicados (solo service key / SQL editor)
- Esos son los valores que se guardan; las etiquetas visibles ("Inversor ángel",
  "Coach / mentor", etc.) salen de `lib/rol.ts`.
- `pitches`: perfil_id, video_url, poster_url, orden, publicado, origen_id,
  descripcion (máx. 150; el feed usa la del perfil si falta; /p/slug la muestra por pitch),
  subtitulos (jsonb `[{desde, hasta, texto}]` en segundos; null = falta, [] = sin voz;
  se corrige editando la celda)
- `ingestas`: origen_id, estado (ok | error), error, intentos, bytes,
  subtitulos_intentos, subtitulos_error (solo service key)
- `envios` (solo service key): origen_id, email_verificado, email_escrito, fecha,
  estado (recibido | en_espera | ok | error | rechazado), regla, perfil_id. Los emails
  viven solo acá. `emails_bloqueados` y `equipo_ingesta` (email en minúsculas): solo
  service key / SQL editor. `ingesta_cuentas(emails)` solo service_role;
  `mis_pitches()` para authenticated (sin emails ni origen_id).
- `piques`: pitch_id, dispositivo (uuid anónimo), created_at; PK pitch + dispositivo.
  anon no la lee: usa las funciones security definer `dar_pique`, `quitar_pique`
  (validan pitch publicado; límite 30 acciones/min por dispositivo en
  `piques_frecuencia`) y `conteo_piques` (solo agregados)
- `r2_borrar`: clave, bytes, borrar_despues — claves viejas de R2 a borrar (solo
  service key)
- `*_url` guardan la clave de R2 o, en el seed, una ruta `/...`
- perfiles (feria_lista): etapa, ronda, industrias[], cargo, especialidades[], ticket,
  rondas_interes[], empresa_id. `empresa_id` solo cambia por RPC (trigger
  `perfiles_empresa_guardian` + flag `pecera.empresa_rpc`).
- `empresas` (slug, nombre, tipo, descripcion — opcional desde persona_empresa —, redes, industrias, etapa,
  ronda, dueno_id, oculta):
  visible si no está oculta y tiene al menos un integrante visible (por `empresa_miembros`).
- `empresa_miembros` (multi_empresa: id, empresa_id, perfil_id, cargo, created_at; único por empresa
  y perfil; hasta 5 por perfil): anon ve las de perfiles y empresas visibles; nadie la escribe directo.
  La administración pasa a la integrante más antigua de esa empresa (por `created_at`). `empresas_codigos` (privada)
  y `empresas_intentos` (10 intentos/hora). RPCs: `crear_empresa`, `unirse_empresa` (null si
  el código no existe), `editar_empresa`, `salir_empresa`, `renovar_codigo_empresa`, `mi_empresa`.
- `empresa_datos` (clave, valor, url https, visible): privado por defecto; anon solo ve lo
  visible de empresas visibles. RPCs `mis_datos_empresa`, `guardar_dato_empresa` (vacío = borrar).
- `eventos` (votacion_abierta, resultados_visibles, activo), `evento_participantes`, `votos`
  (PK evento + votante). Recibe votos cualquier perfil anotado y visible (desde
  `20261013120000_feria_todos_los_roles.sql`; antes, solo `emprendedor`); nadie se vota ni vota a
  su empresa. Resultados visibles solo si el equipo los muestra (o para admins).
- feria_pro (`20261007120000_feria_pro.sql`, guía en `docs/FERIA-PRO.md`): tipos de perfil
  `profesional`, `empresa`, `institucion`; especialidades nuevas; WhatsApp `+E.164` además de
  los 10 dígitos argentinos; columnas de cofounder (`busca_cofundador`, `cofundador_*`);
  `empresas.logo_url` (`empresa-<id>-<hash8>.jpg`, `cambiar_logo_empresa`, `mi_empresa_v2`,
  `miembros_mi_empresa`); `portafolio` (links https, visible por ítem, 12 por perfil, RPCs
  `mi_portafolio`/`guardar_portafolio`/`borrar_portafolio`); `seguidos` por dispositivo
  anónimo (`seguir`, `dejar_de_seguir`, `seguidores_de`, límite con `medicion_limitar`).
  Lecturas en cascada en `lib/datos.ts` (`enCascada`). Racha (`lib/racha.ts`) y hashtags
  (`lib/hashtags.ts`) se calculan sin migración. Colores con sentido: `AREAS` en
  `lib/etiquetas.ts` (un color = un área). Modo noche: variables CSS en `globals.css`;
  `.tema-fijo` para lo que va sobre video.
- networking_feria: `networking_intereses` (de, a, mensaje ≤ 280, estado, evento_id; sin políticas, solo por
  RPC) y `evento_consentimientos` (evento_id, perfil_id, acepta, version, decidido_at; privada, solo por RPC).
  Las dos caen en cascada al borrar el perfil. `evento_organizadores` (evento_id, email en minúsculas;
  privada, solo por RPC de admin): quién de la Universidad entra a /organizacion.
- cofundador_conexiones (`20261009120000_cofundador_conexiones.sql`, después de borrar_cuenta;
  pruebas en `supabase/pruebas/cofundador.mjs`): `cofundador_intereses` (de, a, mensaje ≤ 280, estado
  pendiente/aceptado/rechazado/retirado; sin políticas: solo por RPC `cofundador_interesar`,
  `cofundador_responder`, `cofundador_retirar`, `mis_cofundador_conexiones`). Hay que tener tu
  perfil visible con «Busco cofundador/a»; si el otro ya te había elegido, match inmediato; 20
  intereses por día; retirar deja la fila en 'retirado' (sigue contando para el tope, no se puede
  volver a pedir; la pantalla lo confirma antes) y al pasar o retirar se vacía el mensaje; borrar la
  cuenta los borra en cascada en las dos direcciones. WhatsApp y email solo vienen con match. El encaje (`lib/cofundador.ts`)
  ordena por complemento y dice el porqué; `/cofundadores` lee la sesión en el navegador
  (`components/explorar/useMatch.ts`) y sin la migración queda como directorio.
- `admins` (email en minúsculas, solo SQL editor): `es_admin()` y las `admin_*` lo exigen;
  para publicar pasan el guardián limpiando los claims del JWT solo en esa transacción.
- Ecosistema (todo por RPC `security definer`; la app no escribe estas tablas directo):
  `pitches.oculto`; `empresa_hitos`, `empresa_avances`; `empresa_productos` (imagenes =
  claves R2 de la empresa); `perfil_newsletter` (url, titulo); `empresa_documentos`
  (tipo plantilla/escrito/link, campos jsonb, visible=false por defecto, archivado; uno por
  empresa y plantilla); `portfolio` (tipo, estado, ronda/lider solo en inversión, caso de
  éxito, visibilidad, confirmacion; sin duplicados por `portfolio_sin_duplicados`),
  `perfil_servicios`, `perfil_tesis`; `empresa_logos` (clave `<empresaId>-<hash8>.png|jpg`).
  Imágenes y logos viejos van a `r2_borrar` con una hora de gracia.

## Marca (resumen del manual)
- Colores: fondo Marfil #F5F4EC · texto Tinta #1C1B16 · Naranja #F47C3C = acción
  primaria (botones con texto Tinta, 6,4:1) · Pecera #F87C43 = hover y acentos · nunca
  naranja como texto sobre Marfil: para texto naranja, `naranja-texto` #A9441A (5,4:1) ·
  Arcilla #D95A22 (foco, emprendedor) · inversor #0C6AA8 · aliados #1F7A52 · Pitch en
  celeste #8FD3F4 y Build in Public en ámbar `obra` #F2C45F (siempre de fondo, texto Tinta).
  Botones desde `lib/ui.ts` (`boton(variante, tamano)`), no a mano.
- Texto chico: mínimo `text-tinta/65` sobre Marfil (AA); `/55` o `/60` no llegan.
- Nunca blanco puro #FFFFFF de fondo. Naranja ≤ 10% de la pantalla.
- Fuentes: Fraunces (marca y titulares) + Familjen Grotesk (texto/UI), vía next/font;
  `font-editorial` (Georgia, del sistema) para lectura larga (lecciones, descripciones)
- Movimiento: tres duraciones (`--duracion-rapida` 140 ms, `--duracion` 220 ms,
  `--duracion-enfasis` 420 ms); solo transform/opacity
- Easing único: cubic-bezier(0.22, 1, 0.36, 1) · respetar prefers-reduced-motion
- Tono: rioplatense, de "vos", sin humo
- Pie legal obligatorio: "Pecera es una capa de descubrimiento y conexión. No capta
  fondos del público, no custodia activos ni realiza oferta pública de valores o
  asesoramiento financiero."

## Fuera de alcance (NO construir sin decidirlo antes)
Comentarios, chat interno, pagos o inversión dentro de la app, subida de videos desde la app
(sigue por el Form), doble aprobación. La verificación de inversores y los filtros del feed
son los próximos candidatos (ver `docs/AUDITORIA.md`, P2).

## Reglas de trabajo
- Mobile-first: probar pensando en celular.
- Cambios chicos y enfocados; no reescribir archivos que no tienen que ver con la tarea.
- Preguntar antes de instalar dependencias nuevas.
- Videos: `muted` + `playsInline` + autoplay solo en el reel visible.

## Reglas de R2
- Solo storage class Standard. PutObject simple, sin multipart.
- Si el video comprimido pesa > 40 MB: no subir, registrar error.
- Claves con hash del contenido: `<driveId>-<hash8>.mp4`, `<driveId>-<hash8>.jpg`
  (poster), `<fotoId>-<hash8>.jpg` (avatar); hash8 = primeros 8 hex del sha256 del
  archivo final. Cada versión nueva tiene clave nueva (con `immutable`, sobrescribir
  no invalida cachés). Las filas viejas pueden tener `<id>.mp4` sin hash.
- La clave anterior no se borra enseguida: después de actualizar Supabase se anota
  en `r2_borrar` con `borrar_despues` = ahora + 1 hora (el ISR puede seguir
  sirviéndola) y cada corrida borra las vencidas al arrancar. Hasta entonces sus
  bytes cuentan para el tope.
- Si la subida o Supabase fallan, las claves nuevas recién subidas se borran ya.
- Cache-Control: `public, max-age=31536000, immutable`.
- Nunca listar el bucket: qué falta procesar se decide con Supabase.
- Si la suma de bytes en R2 (filas vigentes + `r2_borrar`) supera 8 GB: dejar de subir y fallar el job.
- El repo es público: los logs de la ingesta solo muestran origen_id, slug, estado
  y números. Nunca nombres, emails, teléfonos ni links; los errores de Supabase van
  con código y mensaje, nunca con la fila. Nunca el texto transcripto: el error de
  subtítulos va solo a `ingestas.subtitulos_error`.

## Reglas aprendidas
- Si levantás `npm run dev` para verificar, cerralo al terminar.
- No podés probar en celular ni en navegador: cuando algo dependa del scroll, del
  video o del touch, decile al usuario qué tiene que probar él.
- WhatsApp: los números se cargan como 10 dígitos con código de área;
  `lib/contacto.ts` antepone `549`.
- La URL pública sale de `NEXT_PUBLIC_SITE_URL` (`metadataBase` en el layout).
