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
  `EditarPerfil` aparece solo en el perfil propio. Es solo interfaz. Reglas del form en `lib/cuenta.ts` (cliente y servidor);
  el trigger `perfiles_guardian` las repite en la base y bloquea slug, publicado,
  usuario_id, origen_id y consentimiento_at. Foto y logo se achican en el celular
  (`prepararImagen` en `lib/imagen.ts`): lado mayor ≤ 1024 px, con su proporción y sin
  recortar, ≤ 1 MB (`lib/limites-imagen.ts`, compartido con el servidor). La foto va en JPG
  sobre Marfil (el trigger solo acepta .jpg); el logo, en PNG si tiene transparencia. Las
  fallas dicen el motivo (pesada, formato o "problema nuestro"). La foto viaja con el form:
  `guardarPerfil` la sube con `lib/foto.ts` (`lib/r2.ts`, `<userId>-<hash8>.jpg`; `lib/r2.ts`
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
  `empresas.logo_url` es solo respaldo de lectura. Formulario de perfil: el de 6 pasos.
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
- `/cuenta` → Mi perfil (login, crear/editar, Mis pitches). Al crear, la action
  redirige a `/cuenta?creado=1` (`&foto=error` si la foto falló); si la cuenta ya
  tenía perfil (doble envío), a `/cuenta`. `guardarPerfil` nunca tira: toda falla
  vuelve como mensaje (22023 del trigger → campo). A los 20 s sin respuesta el form
  ofrece recargar; `app/cuenta/error.tsx` atrapa el resto.
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
- `/cuenta/empresa` → cuenta de la empresa: logo, datos, equipo con código, métricas y
  documentos con el concepto del glosario adentro
- `/explorar` (startups, inversores, aliados y hashtags), `/t/[tag]` y `/t/[tag]/feed`
  (sección por hashtag; `#feria21` = la feria), `/cofundadores` (cofounder match),
  `/red` (Mi red: los perfiles que seguís, en el celular)
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
- `empresas` (slug, nombre, descripcion, redes, industrias, etapa, ronda, dueno_id, oculta):
  visible si no está oculta y tiene al menos un perfil visible. `empresas_codigos` (privada)
  y `empresas_intentos` (10 intentos/hora). RPCs: `crear_empresa`, `unirse_empresa` (null si
  el código no existe), `editar_empresa`, `salir_empresa`, `renovar_codigo_empresa`, `mi_empresa`.
- `empresa_datos` (clave, valor, url https, visible): privado por defecto; anon solo ve lo
  visible de empresas visibles. RPCs `mis_datos_empresa`, `guardar_dato_empresa` (vacío = borrar).
- `eventos` (votacion_abierta, resultados_visibles, activo), `evento_participantes`, `votos`
  (PK evento + votante). Solo reciben votos perfiles `emprendedor`; nadie se vota ni vota a
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
- cofundador_conexiones (`20261008120000_cofundador_conexiones.sql`, pruebas en
  `supabase/pruebas/cofundador.mjs`): `cofundador_intereses` (de, a, mensaje ≤ 280, estado
  pendiente/aceptado/rechazado; sin políticas: solo por RPC `cofundador_interesar`,
  `cofundador_responder`, `cofundador_retirar`, `mis_cofundador_conexiones`). Hay que tener tu
  perfil visible con «Busco cofundador/a»; si el otro ya te había elegido, match inmediato; 20
  intereses por día; WhatsApp y email solo vienen con match. El encaje (`lib/cofundador.ts`)
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
