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
  Drive).
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
- `pitches`: perfil_id, video_url, poster_url, orden, publicado, origen_id
- `ingestas`: origen_id, estado (ok | error), error, intentos, bytes (solo service key)
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
- Claves: `<driveId>.mp4`, `<driveId>.jpg` (poster), `<fotoId>.jpg` (avatar). Un
  reintento sobrescribe, nunca duplica.
- Cache-Control: `public, max-age=31536000, immutable`.
- Nunca listar el bucket: qué falta procesar se decide con Supabase.
- Si la suma de bytes subidos supera 8 GB: dejar de subir y fallar el job.
- El repo es público: los logs de la ingesta solo muestran origen_id, slug, estado
  y números. Nunca nombres, emails, teléfonos ni links; los errores de Supabase van
  con código y mensaje, nunca con la fila.

## Reglas aprendidas
- Si levantás `npm run dev` para verificar, cerralo al terminar.
- No podés probar en celular ni en navegador: cuando algo dependa del scroll, del
  video o del touch, decile al usuario qué tiene que probar él.
- WhatsApp: los números se cargan como 10 dígitos con código de área;
  `lib/contacto.ts` antepone `549`.
- La URL pública sale de `NEXT_PUBLIC_SITE_URL` (`metadataBase` en el layout).
