# Pecera — Auditoría completa (1 de octubre de 2026)

Rama auditada: `integracion` (une `feria-21-pro` y `claude/lucid-pascal-6wxt7j`). Todo lo que
dice "verificado" se probó en esta rama; lo que dice "no verificado" queda así a propósito: no
se inventan números.

## Resumen ejecutivo

Pecera es hoy una **capa de descubrimiento con identidad profesional**: feed de pitches, perfil
público (al que llevan las tarjetas NFC), empresas con equipo, Build in Public, Dataroom,
Portfolio de inversores y aliados, Academy, Explorar, cofounder match y la Feria 21. El
producto es amplio y técnicamente prolijo (RLS probada, todo por funciones `security definer`,
lecturas en cascada que no rompen si falta una migración).

El problema principal no estaba en el código sino en la **organización**: el trabajo estaba
partido en dos ramas que salían de `main` y se pisaban (dos Explorar, dos portfolios, dos
logos de empresa, dos formularios, dos medidores de completitud). Eso hacía imposible que
"todo ande junto". Esta rama lo resuelve.

Para la feria (7 al 9 de octubre) el producto está **listo para beta controlada** una vez
corridas las migraciones. **No está listo para tiendas de apps** ni para adquisición pública
masiva: faltan borrar la cuenta desde la app, denunciar y bloquear, notificaciones y monitoreo
de errores.

## Evidencia (qué se corrió)

| Chequeo | Resultado |
|---|---|
| `tsc --noEmit` | sin errores |
| `npm run lint` | 0 errores; 2 avisos esperables (`<img>` dentro de la imagen OG, que no puede usar `next/image`) |
| `npm run build` | compila |
| Pruebas de la base (PGlite, migraciones en el orden de producción) | feria_lista 45 ok · medicion 29 ok · feria_pro 39 ok · pitch_build_producto_newsletter 87 ok — **200 ok, 0 fallas** |
| Rutas (16) en local | todas 200, sin texto de error en el HTML |
| Celular 375 px (15 rutas) | ninguna con desborde horizontal |
| Secretos en el cliente | solo `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `MEDIA_URL`, `SITE_URL` (públicas por diseño) |
| HTML crudo | un solo `dangerouslySetInnerHTML` (JSON-LD de /sumate), escapado (`<` → `<`) |

## P0 — Crítico (bloquea que "todo ande")

1. **Dos ramas paralelas que se pisaban** → resuelto en esta rama (ver "Implementado").
2. **Migraciones sin correr en producción.** Sin ellas, Portfolio, Dataroom, Build in Public,
   cofounder, logos y tiempo real se ven vacíos (la app no se cae: cae a lo de siempre).
   Orden: `20261003…pitch_build_producto_newsletter`, `20261004…dataroom`,
   `20261005…portfolio`, `20261006…logos`, `20261007…feria_pro`. Probadas juntas en ese orden.
3. **Choque de versión de migración** (`20261003120000` repetida) → resuelto: feria_pro pasó a
   `20261007120000` (no había corrido).

## P1 — Alto (confianza, retención, legales)

1. **Borrar la cuenta desde la app** no existe (solo por email según /terminos). Es un derecho
   (Ley 25.326, supresión) y un requisito de Apple y Google.
2. **Denunciar y bloquear** perfiles o pitches no existe. Es obligatorio para contenido
   generado por usuarios en las tiendas, y necesario apenas haya tráfico abierto.
3. **Monitoreo de errores**: hoy solo `console.error` (logs de Vercel). Nadie se entera si algo
   se rompe en la feria. Recomendado: alertas de errores de Vercel o Sentry (dependencia nueva:
   decidirlo antes).
4. **Imagen al compartir (OG) de perfiles y eventos**: no tienen `og:image`. Es justo el link
   que se manda por WhatsApp después del NFC: sin imagen, la tarjeta de vista previa se ve pobre.
5. **Notificaciones**: no hay ninguna (ni "te siguieron", ni "una empresa confirmó tu
   portfolio"). Sin eso, el loop de retención depende de que la persona vuelva sola.
6. **Medición de activación**: se miden vistas, piques y contactos (bien, con privacidad), pero
   no el embudo de alta (landing → rol → perfil completo → primer pitch). Sin eso no se sabe
   dónde se pierde la gente.

## P2 — Medio

1. **SEO**: falta `canonical` en casi todas las páginas, JSON-LD en perfiles (Person /
   Organization) y empresas, y el `<h1>` en el feed. `robots.txt` y `sitemap.xml` ya existen y
   las páginas privadas (/cuenta, /admin, /red, Dataroom) ya tienen `noindex`.
2. **App instalable**: falta `manifest.webmanifest` y `favicon.ico` (pedido automático del
   navegador: hoy da 404). El "acceso directo" a un perfil mejora con manifest.
3. **Ajustes / exportar mis datos**: no hay una pantalla de ajustes; privacidad (ocultar perfil)
   vive dentro del formulario.
4. **Videos de prueba en `public/videos/`** (≈ 62 MB): se suben con cada deploy aunque solo los
   usa el seed. Moverlos a R2 o sacarlos del repo.
5. **Cofounder match** es un directorio filtrado, no un match con estados (interés mutuo).
   Útil como v1; el próximo paso es "me interesa" de ambos lados.

## P3 — Pulido

1. El logo de empresa se puede editar en /cuenta/empresa; la tarjeta de /cuenta solo lo
   muestra (antes había dos editores).
2. Rendimiento medido en producción (LCP, INP, CLS): **no verificado** (en local no es
   representativo). Activar Speed Insights de Vercel o mirar Lighthouse sobre el deploy.

## Implementado en esta rama

- **Unión de las dos ramas** con 12 conflictos resueltos y decisiones de producto:
  - **Formulario**: el de 6 pasos (pedido explícito: pasos, no scroll); tiene todos los campos
    del otro y más.
  - **Perfil público** (/p): el de dos columnas con acciones (destino del NFC) + Portfolio,
    Build in Public y Newsletter del ecosistema.
  - **Empresa** (/e): la del ecosistema (producto, pitch destacado, Build in Public, ronda,
    dataroom público, apoyos) + ubicación, #hashtags, fundadores primero y logo de respaldo.
  - **Explorar**: el directorio del ecosistema (startups, inversores, aliados) + la Feria
    (#feria21) y los hashtags más usados.
  - **Menú**: grupos Descubrir / Lo tuyo / Pecera, con Eventos → Feria 21, Academy y Landing.
  - **Reel**: insignia PITCH + #hashtags tocables + chip "Construyendo".
- **Terminología**: *Portfolio* = inversiones y clientes confirmados por la empresa. Lo que
  antes se llamaba "portafolio" (links) ahora es **Links y documentos**.
- **Un solo logo de empresa**: se guarda en `empresa_logos` (acepta PNG con transparencia);
  la columna `empresas.logo_url` queda solo como respaldo de lectura y se borra junto al quitar.
- **Un solo número de completitud** en /cuenta (CompletarPerfil); la tarjeta NFC ya no muestra
  otro porcentaje distinto.
- **Modo noche para el sistema de diseño nuevo** (superficie y fondos suaves); sin esto, el
  texto claro quedaba sobre fondos claros.
- **Azul del Pitch más oscuro** (#1e5a87, texto marfil, contraste ≈ 6,6:1): convive con el
  naranja sin chocar.
- **Landing**: Substack apunta a `substack.com/@peceravc` (el link anterior daba 404) y los
  peces del isotipo ya no se animan.
- Código muerto borrado: `EditarPerfil`, `BuscadorExplorar`, `lib/borrador-perfil.ts`.
- Pruebas de la base actualizadas para correr todas las migraciones en el orden de producción.

## Matriz de QA (resumen)

| Función | Celular | PC | Permisos (RLS) | Vacío / sin migración | Persistencia | Tiempo real |
|---|---|---|---|---|---|---|
| Feed (Para vos / Stakeholding) | ok | ok | anon solo publicados | ok | — | — |
| Perfil público / NFC | ok | ok | visible = publicado y no oculto | ok | — | — |
| Formulario 6 pasos + autoguardado | ok | ok | trigger guardián | ok | probado | perfiles (EnVivo) |
| Empresa / equipo / logo | ok | ok | probado (feria_lista, logos) | ok | — | /cuenta/empresa |
| Dataroom | ok | ok | **probado**: privado ≠ visible, sin escritura directa | ok | — | — |
| Portfolio + confirmación | ok | ok | probado | ok | — | — |
| Build in Public | ok | ok | probado | ok | — | — |
| Explorar / hashtags | ok | ok | solo visibles | ok | — | — |
| Cofundadores | ok | ok | solo visibles | ok | — | — |
| Eventos / Feria / votación | ok | ok | probado (feria_lista) | ok | — | — |
| Notificaciones | **no existe** | | | | | |
| Borrar cuenta / denunciar / bloquear | **no existe** | | | | | |

"ok" en celular y PC = sin desborde a 375 px y con el layout revisado; las interacciones
táctiles (scroll del feed, video, NFC real) las tiene que probar una persona en el teléfono.

## Puntajes internos (0–100, para priorizar; no son métricas de marketing)

| Área | Puntaje | Por qué |
|---|---|---|
| Arquitectura | 80 | Una sola puerta a los datos, cascada por migración, RPCs `security definer`. Baja por la duplicación que hubo entre ramas. |
| Base de datos / RLS | 85 | 200 pruebas sin tocar ninguna base; migraciones aditivas. |
| Seguridad | 75 | Sesión en todas las acciones, sin secretos en el cliente, límites de frecuencia. Faltan denunciar/bloquear y monitoreo. |
| UX | 72 | Formulario por pasos, perfil cuidado, estados vacíos. Muchas funciones en /cuenta: es largo. |
| UI / marca | 78 | Sistema naranja + editorial consistente; modo noche ahora cubre los tokens nuevos. |
| SEO | 60 | robots, sitemap y noindex bien; faltan canonical, OG image de perfiles y JSON-LD. |
| Celular (web) | 80 | Sin desbordes; táctil sin probar en dispositivo. |
| App Store / Google Play | 25 | Sin borrar cuenta, denunciar, bloquear ni manifest. |
| Crecimiento / retención | 45 | Buenos loops (NFC, portfolio confirmado, Build in Public) pero sin notificaciones ni embudo medido. |
| Modelo de negocio | 40 | Ninguna monetización todavía (correcto antes de la liquidez). Candidatos: herramientas para inversores, Dataroom avanzado, eventos. |

## Lista para…

- **No listo**: tiendas de apps (P1.1, P1.2, manifest, moderación).
- **Listo con arreglos**: adquisición pública (P1.3 monitoreo, P1.4 OG, P1.6 embudo).
- **Listo para beta**: la feria, con las migraciones corridas y el equipo mirando /admin.

## Hoja de ruta sugerida

1. Antes del 5/10 (congelar deploys): correr migraciones, unir esta rama, probar en el celular
   el camino NFC → perfil → contacto.
2. Semana de la feria: solo arreglos. Mirar logs de Vercel a diario.
3. Después de la feria: borrar cuenta + denunciar/bloquear → notificaciones (seguidores,
   confirmaciones de portfolio) → OG image de perfiles → embudo de activación → manifest.
