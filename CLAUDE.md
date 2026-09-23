@AGENTS.md
# Pecera — MVP feria

## Qué es
Feed vertical tipo Reels con pitches en video de 90 s de participantes de una feria
emprendedora. Tocar un reel lleva al perfil del participante con sus datos y canales
de contacto. Es una capa de descubrimiento: nada de pagos ni inversión en la app.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres) para datos · Cloudflare R2 para videos (MP4 720p vertical)
- Deploy en Vercel · Entorno de desarrollo: Windows + PowerShell

## Comandos
- `npm run dev` → servidor local en localhost:3000
- `npm run build` → verificar antes de cada commit importante

## Rutas
- `/` → feed de reels
- `/p/[slug]` → perfil del participante

## Datos
- `perfiles`: slug, nombre, tipo (startup, emprendimiento, aceleradora, incubadora,
  ángel, fondo, coach/mentor), rol (emprendedor | inversor | aliado), descripcion,
  avatar_url, whatsapp, email, linkedin, instagram, web, publicado
- `pitches`: perfil_id, video_url, poster_url, orden, publicado

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