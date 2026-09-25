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
- `supabase/test-50.sql` carga 50 perfiles `test-*` y `test-50-limpiar.sql` los borra.
- Helpers: `lib/rol.ts` (colores y labels de rol/tipo) y `lib/contacto.ts`
  (normalización de canales). Reutilizarlos, no duplicar lógica.
- Videos y posters de prueba en `public/`; los posters se generaron con ffmpeg.
- Ingesta automática: `.github/workflows/ingesta.yml` (cron cada 10 min + manual,
  con modo seco) corre `scripts/ingesta/` (Node 24 corriendo TS directo, sin
  build). Lee el Google Form, comprime con ffmpeg, sube a R2 y crea perfil + pitch
  publicados. La tabla `ingestas` lleva el estado por video (`origen_id` = ID de
  Drive). El input `reprocesar` (un origen_id) lo vuelve a procesar aunque esté ok.
- ffmpeg en el workflow: build estático de BtbN con versión y sha256 fijos (9.0,
  como el local), nunca el de apt. La rotación se aplica a mano (`-noautorotate` +
  transpose/flip en `video.ts`) y cada corrida arranca con un chequeo sintético
  (`chequeo.ts`, rotaciones 90/180/270) que corta el job si algo sale torcido.
- Subtítulos (`scripts/ingesta/subtitulos.ts`): fase 2 de la corrida. Después de
  publicar, con lo que quede de `INGESTA_PRESUPUESTO_MIN` (variable de GitHub, 9 min
  por defecto, contando toda la corrida) se transcriben los pitches publicados sin
  subtítulos con el filtro `whisper` de ffmpeg y `ggml-large-v3-turbo-q5_0.bin`
  (revisión fija de Hugging Face, sha256 verificado, en caché). Nunca afecta la
  publicación: lo que no entra queda para la próxima; 3 errores y no se reintenta.
  El factor de estimación arranca en 3,5x y se ajusta a lo medido; el timeout es 8x
  el audio. `reprocesar` + `solo_subtitulos` rehace solo los subtítulos.
- whisper usa un **segundo ffmpeg**: BtbN 8.1.1 (2026-05-31), fijo por sha256 y
  fuera del PATH (`FFMPEG_WHISPER`). BtbN deshabilitó whisper el 2026-06-19 y
  ningún build 9.0 lo trae. Comprimir sigue siendo del 9.0.1. El chequeo previo
  prueba el filtro y el modelo; si falla, publica igual sin subtítulos y el job
  queda en rojo. En el filtro las rutas van relativas y con "/" (los ":" de `C:\`
  rompen la sintaxis).
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
- Migraciones nuevas en `supabase/migrations/` (las corre el usuario).
- La base guarda claves de R2 (`<id>.mp4`); `lib/media.ts` (`urlMedia`) arma la URL
  con `NEXT_PUBLIC_MEDIA_URL` y `lib/datos.ts` ya la aplica.
- La service key de Supabase vive solo en los secrets del workflow, jamás en la app.
- Próximo: deploy en Vercel; dominio propio para R2 después de la feria.

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
  (con `WHISPER_MODELO`; el modelo está en `../pecera-originales/`)
- `npm run ingesta:tipos` → chequeo de tipos del script de ingesta (tiene su propio
  tsconfig; el de la app excluye `scripts/`)

## Rutas
- `/` → feed de reels
- `/p/[slug]` → perfil del participante

## Datos
- `perfiles`: slug, nombre, tipo (startup, emprendimiento, aceleradora, incubadora,
  angel, fondo, coach), rol (emprendedor | inversor | aliado), descripcion,
  avatar_url, whatsapp, email, linkedin, instagram, web, publicado, origen_id
- Esos son los valores que se guardan; las etiquetas visibles ("Inversor ángel",
  "Coach / mentor", etc.) salen de `lib/rol.ts`.
- `pitches`: perfil_id, video_url, poster_url, orden, publicado, origen_id,
  subtitulos (jsonb `[{desde, hasta, texto}]` en segundos; null = falta, [] = sin voz;
  se corrige editando la celda)
- `ingestas`: origen_id, estado (ok | error), error, intentos, bytes,
  subtitulos_intentos, subtitulos_error (solo service key)
- `piques`: pitch_id, dispositivo (uuid anónimo), created_at; PK pitch + dispositivo.
  anon no la lee: usa las funciones security definer `dar_pique`, `quitar_pique`
  (validan pitch publicado; límite 30 acciones/min por dispositivo en
  `piques_frecuencia`) y `conteo_piques` (solo agregados)
- `r2_borrar`: clave, bytes, borrar_despues — claves viejas de R2 a borrar (solo
  service key)
- `*_url` guardan la clave de R2 o, en el seed, una ruta `/...`

## Marca (resumen del manual)
- Colores: fondo Marfil #F5F4EC · texto Tinta #1C1B16 · naranja Pecera #F87C43 (solo
  acentos, nunca texto chico) · Arcilla #D95A22 (botones/texto naranja) ·
  inversor #0C6AA8 · aliados #1F7A52 · emprendedor → Arcilla
- Nunca blanco puro #FFFFFF de fondo. Naranja ≤ 10% de la pantalla.
- Fuentes: Fraunces (titulares) + Familjen Grotesk (texto/UI), vía next/font
- Easing único: cubic-bezier(0.22, 1, 0.36, 1) · respetar prefers-reduced-motion
- Tono: rioplatense, de "vos", sin humo
- Pie legal obligatorio: "Pecera es una capa de descubrimiento y conexión. No capta
  fondos del público, no custodia activos ni realiza oferta pública de valores o
  asesoramiento financiero."

## Fuera de alcance (NO construir)
Login de usuarios, likes, comentarios, búsqueda, subida de videos desde la app,
panel de admin, doble aprobación, verificación de inversores.

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
