# Pecera Feria Pro — guía de la rama `feria-21-pro`

Segunda vuelta para la Feria 21 (Semana 21, 7 al 9 de octubre, Campus Córdoba), sobre `main`
después de los PR #3 y #4. Pensada con un "council" CEO/CTO/CMO/COO desde el uso real de
founders, inversores y aliados. La guía de operación de la feria sigue en
[`GUIA-FERIA.md`](./GUIA-FERIA.md); acá está lo nuevo, cómo ponerlo en marcha y la auditoría.

---

## 1. Qué cambió

| Pedido | Qué hay ahora | Dónde |
| --- | --- | --- |
| Formulario tosco, de scroll | **Alta en 5 pasos**: rol → tarjeta → proyecto/tesis/especialidad → contacto → revisar (con vista previa de la tarjeta). Barra de progreso, Atrás/Siguiente, validación por paso, Enter avanza. En edición se salta a cualquier paso. | `components/FormPerfil.tsx` |
| "i" de info | Ícono **i** en cada campo con duda (qué sos, etapa, ronda, cargo, especialidades, dirección, WhatsApp, cofounder…). El globo se abre a todo el ancho: nunca se corta en el celu. | `components/Info.tsx` |
| Aliados solo mentor/coach | Aliado puede ser **Profesional**, Mentor/a o coach, Aceleradora, Incubadora, **Empresa** o **Universidad/institución**. Especialidades nuevas: IA y datos, Contabilidad, Operaciones, Audiovisual. Inversor puede ser **Empresa** (CVC). | `lib/cuenta.ts`, `lib/etiquetas.ts`, migración |
| Redes opcionales | Todo el contacto es opcional; redes plegadas en "Redes y web (opcional)". | Paso 4 |
| Bandera para el prefijo | **WhatsApp con bandera** de 14 países. Argentina sigue guardándose en 10 dígitos; el resto como `+código número`. | `components/TelefonoPais.tsx`, `lib/paises.ts` |
| Tags con colores con sentido | **Un color = un área** en toda la app: arcilla negocio, verde plata, azul tecnología, violeta producto, ciruela marca, ocre operaciones, petróleo impacto (planeta y personas), tierra legal. Cargos, especialidades e industrias lo respetan. | `lib/etiquetas.ts` (`AREAS`) |
| Perfil súper estético (NFC) | **Tarjeta nueva**: franja por rol, avatar grande, etiquetas, botones grandes **Escribile / Seguir**, **Guardar contacto** (vCard al teléfono), **Compartir**, **Acceso directo** (instrucciones por iPhone/Android/PC). Racha, cofounder, portafolio y empresa con logo. Dos columnas en PC. | `app/p/[slug]/page.tsx`, `components/perfil/*` |
| Subir pitch en la tarjeta del usuario | Barra solo para el dueño con **"Subí tu pitch"** destacado (con brillo) + editar. Se decide en el navegador: el caché nunca se la muestra a otro. | `components/perfil/BarraDueno.tsx` |
| Guardar perfiles / contactos | **Seguir** = guardar en **Mi red** (`/red`), sin cuenta (en el celular, como los piques). También "Guardar contacto" (vCard) y "Acceso directo". | `lib/red.ts`, `app/red` |
| Feed "for you" y de stakeholders | Pestañas **Para vos** (aleatorio) y **Stakeholding** (la gente que seguís, lo nuevo primero). **+** sobre el avatar del reel para seguir sin salir. | `components/FeedMezclado.tsx`, `Reel.tsx` |
| Racha de progreso | **🔥 Racha**: días seguidos subiendo un pitch (hora de Argentina). En el perfil (con los últimos 14 días) y en el reel. | `lib/racha.ts` |
| Hashtags como secciones | `#feria21` en la descripción del pitch lo suma a **`/t/feria21`** (grilla + "Mirar como feed"). **`/explorar`** busca hashtags y perfiles (sin tildes, por rol). | `lib/hashtags.ts`, `app/t`, `app/explorar` |
| Cofounder match tipo YC | En el paso 3: "Busco cofundador/a" (qué aporto, a quién busco, dedicación, una frase). **`/cofundadores`** con filtros "busco…" y "te busca a vos". | `app/cofundadores` |
| Portafolio para todos | Inversores (inversiones), aliados (casos y servicios), founders (logros, prensa, documentos). Links https, hasta 12, visible por ítem. | `components/cuenta/TarjetaPortafolio.tsx` |
| Logo de empresa + métricas y conceptos adentro | **`/cuenta/empresa`**: logo (entra entero, sin recortar), datos, equipo con código y cargos, **métricas y documentos con el "¿Qué es?" del glosario adentro**. La página pública `/e/slug` muestra logo, números, "Escribile al equipo" y la transparencia con explicación de cada concepto. | `app/cuenta/empresa`, `components/cuenta/PanelEmpresa.tsx` |
| Foto de perfil fallaba | Se **sube apenas se elige** (antes recién al final del formulario y se perdía), PNG transparente con fondo marfil (antes negro), y decodificación de respaldo para Safari viejo. | `lib/imagen.ts`, `subirFoto` |
| "Sumate" → "Landing" | En el menú se llama **Landing**. La URL sigue siendo `/sumate` (puede estar en QRs impresos). | `components/MenuPrincipal.tsx` |
| Modo noche y luz | **Luz / Noche / Auto** en el menú, sin parpadeo. El feed y la landing quedan siempre claros (van sobre video). | `app/globals.css`, `lib/tema.ts` |
| Animaciones profesionales | Botones con respuesta táctil, entrada de pasos y secciones, spinner, brillo en "Subí tu pitch", llama de la racha. Todo se apaga con "reducir movimiento". | `app/globals.css` |
| PC y celular | Feed como columna 9:16 centrada en PC; perfil, empresa, explorar, red y cofundadores en dos o tres columnas. | todas las páginas |
| Login desde Instagram/LinkedIn | Aviso **"Abrí en Chrome/Safari"** (Google bloquea el login en esos navegadores) con botón para copiar el link. | `components/AvisoNavegadorInterno.tsx` |

---

## 2. Puesta en marcha (en este orden)

1. **Probar la migración sin tocar ninguna base** (1 minuto):
   ```bash
   mkdir %TEMP%\pgtest && cd %TEMP%\pgtest && npm init -y && npm i @electric-sql/pglite
   copy <repo>\supabase\pruebas\feria_pro.mjs .
   node feria_pro.mjs <ruta al repo>
   ```
   Tiene que terminar en `34 ok · 0 fallas`.
2. **Correr `supabase/migrations/20261007120000_feria_pro.sql`** en el SQL editor de Supabase.
   Es aditiva en datos: amplía dos `CHECK` (solo agrega valores), redefine el guardián de
   perfiles con la misma lógica + WhatsApp internacional, y crea columnas, tablas y funciones
   nuevas. No borra ni renombra nada; `main` sigue andando con esta base.
3. **Mergear y desplegar.** Si se despliega antes de correr la migración, la app no se cae:
   todas las lecturas van en cascada (feria_pro → feria_lista → lo de siempre) y lo nuevo
   muestra un estado neutro.
4. **Revisar en Vercel que estén las 4 variables de R2** en Production (`R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`). Sin ellas no se suben ni fotos ni logos.
5. **Pedir `#feria21` en el Form de pitches**: agregar en la pregunta de descripción "Sumá
   #feria21 para aparecer en la sección de la feria".
6. **Freeze de deploys el 5/10** (recomendación del council) y prueba en un iPhone y un Android
   reales con una tarjeta NFC real.

---

## 3. Auditoría y troubleshooting

### Cómo se verificó

- `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios (25 páginas).
- Migración: **34 pruebas** nuevas en PGlite (aliados profesionales, WhatsApp internacional,
  cofounder, logo con permisos y borrado diferido, portafolio con RLS y tope de 12, seguir con
  límite por minuto) + las **29** de medición siguen pasando.
- QA con gstack en **390 px y 1440 px**, modo luz y noche, contra la base de producción en solo
  lectura (sin la migración nueva: probó también las caídas seguras): perfil, empresa, feed con
  pestañas, seguir → Mi red, explorar, hashtag, cofundadores, docs y el formulario completo en
  sus 5 pasos (página de prueba local, borrada antes del commit).

### Qué encontró la auditoría (y se arregló)

| Problema | Causa | Arreglo |
| --- | --- | --- |
| La foto de perfil "no andaba" | Al editar, recién se subía al tocar Guardar al final; PNG transparente quedaba negro; Safari viejo rechazaba la decodificación | Subida inmediata con indicador, fondo marfil, decodificación de respaldo, avatares sin pasar por el optimizador de imágenes |
| Avatar y logo tapados por la franja | La franja tenía `position: relative` y pintaba encima | Contenido `relative` |
| Explorar no encontraba perfiles | Solo indexaba perfiles con pitch | Lee todos los perfiles visibles |
| Logo invisible en modo noche | Imagen en tinta sobre fondo oscuro | Versión marfil por CSS (`.solo-luz` / `.solo-noche`) |
| Login roto desde Instagram/LinkedIn | Google bloquea esos navegadores internos | Aviso con "Copiar el link" para abrir en Chrome/Safari |
| Botón "Escribile por WhatsApp" en dos líneas | Texto largo a 390 px | "Escribile" con ícono |

### Si algo falla

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| "No pudimos subir la foto/el logo" | Faltan variables de R2 en Production o R2 caído | Paso 4 de la sección 2; ver logs de Vercel (`R2 (foto)` / `R2 (logo)`) |
| "El logo se va a poder subir en un rato" | La migración feria_pro no corrió | Paso 2 |
| No aparece "Busco cofundador/a" ni el portafolio | La migración feria_pro no corrió | Paso 2 (la app guarda igual el resto del perfil) |
| WhatsApp de otro país no guarda | Falta la migración (el guardián viejo exige 10 dígitos) | Paso 2 |
| Seguidores siempre en 0 | Falta la migración (Mi red funciona igual en el celular) | Paso 2 |
| `#feria21` vacío | Los pitches no tienen el hashtag en la descripción | Paso 5; se puede editar la descripción del pitch en la tabla `pitches` |
| "Abrí Pecera en Chrome/Safari" | La persona entró desde Instagram/LinkedIn | Es el aviso correcto: abrir el link en el navegador |
| Bandera se ve como "UY" en una PC con Windows | Windows no dibuja emojis de banderas | Normal; en celulares se ve la bandera |
| Mi red vacía en otro celular | Mi red vive en el dispositivo (sin cuenta, como los piques) | Esperado; sincronizar con la cuenta es un pendiente |

---

## 4. Council: qué se decidió y qué quedó afuera

Las tres voces (Skeptic, Pragmatist, Critic) coincidieron en blindar el camino **tarjeta NFC →
perfil → contacto** y en que el perfil se vea completo **sin video**. Eso guió el orden del trabajo.
El disenso más fuerte fue **recortar el cofounder match**: se hizo igual porque lo pidió el
fundador, pero como v1 liviana (opción en el perfil + página con filtros), aditiva y fuera del
camino crítico. Lo que el council sumó y no estaba pedido: el aviso de navegadores internos y el
estado vacío de los perfiles sin pitch.

**Pendientes recomendados (después de la feria):**
1. Sincronizar Mi red con la cuenta (hoy vive en el celular).
2. Subida de video desde la app con compresión en el celular (hoy va por el Form de Google; el
   plan B en la feria es que el equipo lo suba desde `/admin`).
3. Inversores verificados (insignia administrada desde `/admin`).
4. Filtros del feed por etapa/industria/ronda.
5. QR de respaldo impreso en las tarjetas NFC (muchos Android traen el NFC apagado).
