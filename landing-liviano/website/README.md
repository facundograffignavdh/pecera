# Pecera — landing scroll-driven

Landing de una página para **Pecera**. El video generado con Higgsfield es un fondo
fijo de pantalla completa que avanza cuadro por cuadro con el scroll; el contenido
pasa por encima en tarjetas de vidrio.

El diseño usa el sistema de la app (`pecera-feria`): tokens de color, Fraunces +
Familjen Grotesk, el vidrio (`.vidrio`), el switch liquid glass, la luz en capas
sobre el video (`.pez-*`) y las animaciones de `/sumate` (`data-revelar`, títulos
palabra por palabra, titular rotativo, botones magnéticos con brillo, Build in
Public con hitos, barra y racha). Textos e información salen de
https://pecera-virid.vercel.app/sumate.

## Stack

- Vite + JavaScript (ES modules), sin framework
- GSAP + ScrollTrigger (pines del lema y de "Para vos", scrub del video)
- Lenis (scroll suave que maneja ScrollTrigger)
- `ffmpeg-static` (recodifica el video, no hace falta ffmpeg instalado)

## Correr en local

Requiere Node 18+.

```bash
cd website
npm install
npm run dev -- --port 5180
```

Abrir http://localhost:5180. `public/` ya trae el video procesado, así que
`prepare-media` solo hace falta si cambia el video.

> Si `npm install` falla con `ECONNRESET` (algunas redes bloquean
> `registry.npmjs.org`): `npm install --registry=https://registry.yarnpkg.com`

## Build

```bash
npm run build -- --base=./
npx serve dist
```

Siempre por HTTP, nunca con `file://`. La carpeta `dist/` es estática: se puede
subir tal cual a Vercel, Netlify o cualquier hosting.

## Cambiar el video de fondo

```bash
npm run prepare-media -- ../assets/videos/otro-video.mp4
```

Recodifica con cada cuadro como keyframe (`-g 1`), para que el scrub pueda saltar
a cualquier cuadro al instante, y regenera los pósters. Un video de IA crudo
salta mal: no copiarlo directo a `public/`.

## Estructura

```txt
website/
├─ index.html              todas las secciones + Google Fonts
├─ scripts/
│  └─ prepare-media.mjs    video all-keyframe, pósters, favicon
├─ src/
│  ├─ main.js              Lenis, ScrollTrigger, scrub, pines, entradas, switch
│  └─ style.css            tokens de marca, vidrio, luz en capas, secciones
└─ public/
   ├─ bg.mp4               video procesado (17 MB)
   ├─ img/                 pósters (desktop y celular)
   ├─ brand/               wordmark e isotipo oficiales (de pecera-feria)
   └─ favicon.png
```

## Secciones

1. **Hero:** chip de Feria 21, "Construí / Fondeá / Invertí en startups", CTAs, para quién
2. **Lema (fijado):** "Las bocas cerradas no se alimentan.", palabra por palabra con el scroll
3. **01 El problema → 02 La solución:** las herramientas sueltas se ordenan en un perfil
4. **Pitch de 90 segundos:** feed, piques, contacto directo
5. **Transparencia:** switch liquid glass Privado ↔ Transparente (interactivo)
6. **03 Para vos (fijado):** una tarjeta a la vez: emprendo, invierto, acompaño, cofundadores, Academy
7. **04 Build in Public:** cuatro pasos y tarjeta de ejemplo con hitos, actividad y racha
8. **05 El ecosistema:** descubrir, construir, conectar, fondear, aprender
9. **Sumate:** tres roles que llevan a `/cuenta?rol=…` de la app
10. **Pie:** newsletter, links, pie legal obligatorio

Todos los CTA van a la app (`https://pecera-virid.vercel.app`). Si cambia una
ruta de la app, actualizar los links en `index.html`.

## Comportamiento

- Mientras "Para vos" está fijado, el video avanza al 18 % de velocidad
  (`PIN_VIDEO_SPEED` en `main.js`) para no saltearse el paso del macro al escritorio.
- Celular y táctil: póster fijo en vez del video, sin pines, tarjetas apiladas.
- `prefers-reduced-motion`: sin scroll suave ni animaciones automáticas; el lema
  aparece entero.
- Las capas de luz del fondo no usan `mix-blend-mode`: con dos capas de pantalla
  completa en modo mezcla, el compositor por software se quedaba sin memoria y la
  pestaña se caía.
- Hooks de desarrollo: `window.__bgv`, `window.__ST`, `window.__lenis` (solo en dev).

## Marca (del manual de la app)

- Fondo Marfil `#F5F4EC` (nunca blanco puro), texto Tinta `#1C1B16`.
- Botón primario Naranja `#F47C3C` con texto Tinta; hover Pecera `#F87C43`.
- Texto naranja siempre en `#A9441A` (AA sobre Marfil).
- Un solo easing `cubic-bezier(0.22, 1, 0.36, 1)`; duraciones 140 / 220 / 420 ms.
- Pie legal obligatorio: "Pecera es una capa de descubrimiento y conexión…".

## Pendiente

- [ ] Deploy (por ejemplo Vercel) y dominio.
