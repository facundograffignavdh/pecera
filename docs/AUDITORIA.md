# Auditoría CEO + CTO — Pecera rumbo a la Feria 21

Fecha: 29/09/2026 · Rama auditada: `v2-feria-lista` (sobre `main`, con v2-cuentas ya lanzada) · Fuentes: los dos
repos (`pecera` y `pecera-app`), el Drive de Pecera (guía estratégica VC LatAm, pitch deck,
manual de marca, planilla de pitches v2) y QA local en celular (390 px) contra la base de
producción en modo solo lectura.

Cómo usar el cambio y operar la feria: [`GUIA-FERIA.md`](./GUIA-FERIA.md).

---

> **Actualización 1/10 (rama `feria-21-pro`):** auditoría de la segunda vuelta, troubleshooting
> y veredicto del council en [`FERIA-PRO.md`](./FERIA-PRO.md), secciones 3 y 4.

## 1. Resumen ejecutivo

**Qué queremos lograr en la feria.** Que cada proyecto salga de la Feria 21 con un perfil
completo, su empresa armada, un pitch publicado y al menos una conversación nueva; y que Pecera
salga con la primera base real de las dos puntas del mercado (proyectos e inversores/aliados) y
datos para contar la historia en la próxima ronda. La guía del Drive fija el norte: *"500
startups verificadas + 50 inversores activos + 20 intros completadas en 6 meses"*. La feria es el
primer tramo de ese camino.

**Estado.** El producto está listo para la feria **si se cumplen los 6 pendientes P0** de la
sección 4. Ninguno es de código: son de configuración y decisión.

| Área | Estado | Comentario |
| --- | --- | --- |
| Producto y UX | 🟢 | Alta por rol con etiquetas, empresas, transparencia, evento con votación, Docs y doble toque sin zonas muertas. Probado en 390 px. |
| Tecnología | 🟢 | Build, tipos y lint limpios. Migración aditiva con 45 pruebas automáticas (PGlite). La app no se cae si la migración todavía no corrió. |
| Seguridad | 🟢 / 🟡 | RLS + funciones `security definer` con `search_path` vacío; admin por tabla, sin service key en la app. Se corrigió un open redirect. Riesgo abierto: votos con cuentas falsas (sección 5). |
| Operación | 🟢 | Panel `/admin` en el celular: publicar, envíos trabados, ocultar empresas, votación. |
| Legal | 🟡 | Privacidad y condiciones actualizadas con los datos nuevos, pero siguen siendo **borrador**. Falta inscripción de la base y la revisión del abogado. |
| Medición | 🔴 | No medimos la North Star (intros): los toques en WhatsApp/email/LinkedIn no se registran. Sin analítica de uso ni monitoreo de errores. |
| Negocio | 🟡 | La promesa del deck ("inversores verificados, feed curado") todavía no existe en el producto. |

---

## 2. Qué se construyó en esta rama (y por qué)

| Decisión | Por qué (CEO) | Cómo (CTO) |
| --- | --- | --- |
| **Etiquetas por rol** (etapa, ronda, industrias, cargo · rondas, ticket, industrias de interés · especialidades) | Un inversor filtra en segundos por etapa e industria; un founder encuentra al mentor de fundraising. Es la data que después permite matching y curaduría. | Columnas nuevas con `CHECK` en la base, espejo exacto en `lib/etiquetas.ts`; chips nativos accesibles (`components/Chips.tsx`). |
| **Empresas con código de invitación** | En la feria se presentan equipos, no personas. Una página por proyecto junta a todo el equipo y todos sus pitches. | `crear_empresa` / `unirse_empresa` por RPC; el código es privado (tabla aparte), 8 hex, límite de 10 intentos/hora. El `empresa_id` solo cambia por RPC (trigger guardián). |
| **Transparencia privada por defecto** | "Construir y fondear en público" es un valor de marca, pero cada founder decide qué mostrar. Privado por defecto baja la fricción; compartir es un gesto. | `empresa_datos` con `visible` por dato; la RLS solo expone lo compartido de empresas visibles. 42 claves con glosario enlazado. |
| **Feria 21 con votación del público** | Le da al público una razón para entrar con Google (crece la base) y a los proyectos una razón para compartir su perfil. | Un voto por cuenta y evento (PK), solo compiten proyectos, no votarse ni votar a la propia empresa; resultados ocultos hasta que el equipo los muestra. Programa en código (`lib/eventos.ts`). |
| **Docs (98 conceptos + 16 documentos legales)** | Nivela el idioma entre founders primerizos e inversores; posiciona a Pecera como referencia educativa. | Estático, con buscador sin tildes, anclas compartibles y enlace a la transparencia. Aviso de que no es asesoramiento legal. |
| **Doble toque mejorado** | El pique es la señal de interés; tiene que funcionar en toda la pantalla y sentirse bien. | Sin zonas muertas (`pointer-events`), ráfaga de corazones, vibración, pista la primera vez, pop-up después de la ráfaga. |
| **`/sumate` → Google** | Un solo alta evita perfiles duplicados y datos sueltos en otra tabla. | Se quitó el formulario propio y la migración `postulaciones` (reemplaza al PR #1, que conviene cerrar). |
| **Panel `/admin`** | El equipo opera la feria parado en un stand, sin SQL. | RPCs `admin_*` que verifican `es_admin()`; para publicar, pasan el guardián "como sistema" solo dentro de esa transacción. |

---

## 3. Hallazgos técnicos

### Corregidos en esta rama
- **Open redirect en el login** (`lib/cuenta.ts` → `destinoSeguro`): `next=/\otro.com` pasaba el
  filtro y el navegador lo interpreta como `//otro.com`. Ahora se rechazan barras invertidas.
- **Zonas muertas del doble toque**: el bloque de datos del reel tapaba ~40% del video.
- **Límite de intentos inefectivo** (detectado en las pruebas de la migración): si la función
  tiraba error al fallar el código, el contador se revertía con la transacción. Ahora devuelve
  `null` sin error y el contador persiste.
- **Votos a quien no compite**: la base ahora exige `rol = 'emprendedor'` para recibir votos.
- **Políticas legales desactualizadas**: privacidad y condiciones ya mencionan empresas,
  transparencia, votos y Docs (regla del proyecto: si cambian los datos, se actualiza la política).

### Buenas prácticas que ya están
RLS en todas las tablas nuevas, `revoke` a `public` + `grant` puntual por función,
`set search_path = ''`, códigos de invitación fuera de la tabla pública, emails solo en el panel,
URLs de documentos solo `https` y con `rel="nofollow noopener"`, ISR en todo lo público
(la base no recibe una consulta por visita), degradación elegante si falta la migración.

---

## 4. Pendientes esenciales, por prioridad

### P0 — antes del Día 1 (bloquean la feria)

| # | Pendiente | Cómo hacerlo | Quién | Esfuerzo |
| --- | --- | --- | --- | --- |
| 1 | **Correr la migración** `20261001120000_feria_lista.sql` | SQL editor de Supabase, antes o justo después del merge. Antes, `supabase/pruebas/feria_lista.mjs` (45 ok). | CTO | 10 min |
| 2 | **Cargar admins** | `insert into public.admins (email) values ('…');` por cada persona del equipo. | CTO | 2 min |
| 3 | **App de Google OAuth en producción** | Google Cloud → OAuth consent screen → *Publish app*. En *Testing* solo entran 100 usuarios de prueba: el público no podría votar. | CEO/CTO | 15 min (+ verificación de Google si pide scopes sensibles; los nuestros no) |
| 4 | **Dominio final y Redirect URLs** | Decidir el dominio **antes de grabar las tarjetas NFC** (la URL `/p/slug` queda impresa). Configurarlo en Vercel, en `NEXT_PUBLIC_SITE_URL` y en Supabase → Auth → *Site URL* y *Redirect URLs* (`/auth/callback`). | CEO | 30 min |
| 5 | **Verificar el lanzamiento de v2-cuentas** (PR #2 ya en `main`) | Checklist de `CLAUDE.md`: `lanzamiento-cuentas.sql` corrido, variables de R2 en Production de Vercel, Form viejo cerrado. Probar un alta real con foto en producción. | CTO | 20 min |
| 6 | ~~**Fechas del programa**~~ | Hecho: 7, 8 y 9 de octubre y Demo Day el 9 a las 14 h, en `lib/eventos.ts`. | CEO | — |

### P1 — antes del Demo Day (9/10) o durante la feria

| # | Pendiente | Por qué | Cómo hacerlo |
| --- | --- | --- | --- |
| 7 | ~~**Medir intros**~~ (hecho: tabla `contactos`, en `/admin` → Resumen) (toques en WhatsApp, email, LinkedIn, web) | Es la North Star: sin esto no podemos decir cuántas conexiones generó la feria. | Mismo patrón que los piques: tabla `contactos (perfil_id, canal, dispositivo, created_at)`, RPC `registrar_contacto` con límite por dispositivo, y `navigator.sendBeacon` en el `onClick` de cada canal de `/p/[slug]` y del pop-up. Sin datos personales. ~2 h. |
| 8 | **Analítica de uso y errores** | DAU/MAU y retención 7/30/90 (lo pide la guía); enterarnos de un error antes que el usuario. | Vercel Web Analytics (sin cookies, sin dependencia pesada) y Sentry para errores. **Son dependencias nuevas: aprobar antes de instalar.** |
| 9 | **Backup antes de la feria** | El plan free de Supabase no tiene restauración a un punto en el tiempo. | `supabase db dump` (CLI) o *Database → Backups* si el plan lo permite, el día antes y el día después. |
| 10 | **Revisión legal express** | Privacidad y condiciones son borrador; ahora hay más datos (empresas, transparencia, votos). | Enviar `/privacidad` y `/terminos` al abogado con la lista de pendientes de `CLAUDE.md`: inscripción de la base en el Registro Nacional, transferencia internacional (art. 12, Ley 25.326), conservación de originales de Drive. |
| 11 | **Guion de la mesa de alta** | En la feria, cada minuto en la mesa cuenta. | Imprimir: QR a `/sumate` → rol → Google → paso 3 → "Crear empresa" → código al equipo → "Anotar mi proyecto". Tiempo objetivo: 3 minutos por equipo. |
| 12 | **Ingesta en hora pico** | El cron corre cada 10 min y cada corrida tiene 9 min de presupuesto: con muchos videos juntos, la promesa de "10-15 min" puede estirarse. | Mirar `/admin → Envíos` cada hora el Día 1; si se acumulan, disparar corridas manuales (`gh workflow run ingesta.yml`). Vigilar el tope de 8 GB de R2 (≈ 400-800 pitches). |

### P2 — después de la feria (producto y negocio)

| # | Pendiente | Por qué | Cómo |
| --- | --- | --- | --- |
| 13 | **Inversores verificados** | Es la promesa central del pitch deck ("inversores verificados scrollean un feed curado") y "la señal de calidad más diferenciadora" según la guía. | Columna `verificado` en perfiles + `verificado_at`, toggle en `/admin`, insignia en perfil y reel. Documentar el criterio (LinkedIn, referencia, track record) y medir cuántos aplican y cuántos se aprueban. |
| 14 | **Filtros en el feed** | Con etiquetas cargadas, el inversor quiere "agtech en MVP buscando seed". | Filtros por etapa/industria/ronda en `/` con parámetros en la URL; el feed sigue estático por combinación frecuente o se filtra en el cliente. |
| 15 | **Subir el video desde la app** | El Form de Google es un salto de contexto; en la feria es fricción. | Subida directa a R2 con URL firmada desde una action (sin multipart, < 40 MB) y cola para la ingesta. |
| 16 | **Denunciar contenido** | Con más gente, alguien va a subir algo que no debe; hoy solo nos enteramos si nos escriben. | Botón "Reportar" en perfil/empresa → tabla `reportes` → lista en `/admin`. |
| 17 | **Pruebas de la base en CI** | Hoy el harness se corre a mano. | Job de GitHub Actions que instala PGlite en una carpeta temporal y corre `supabase/pruebas/feria_lista.mjs` en cada PR que toque `supabase/`. |
| 18 | **Eventos desde el panel** | Hoy un evento nuevo requiere código + SQL. | Mover el programa a la base (`eventos.agenda jsonb`) cuando haya un segundo evento; hasta entonces, código. |
| 19 | **Legal de la empresa Pecera** | Checklist de la guía del Drive. | Acuerdo de cofundadores con vesting 4+1, cesión de IP de todo el código y la marca a la sociedad, marca "Pecera" en el INPI (clases 9, 35, 42), decidir SAS vs. SAS + Delaware antes de la primera ronda institucional. |
| 20 | **Pipeline de fundraising** | "Definir el hito que valida la siguiente ronda" (guía). | Usar los datos de la feria (perfiles por rol, empresas, intros, votos) como primera tracción; armar el data room de Pecera con las mismas 42 claves de transparencia que le pedimos a los founders. |

---

## 5. Riesgos conocidos y cómo mitigarlos

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| **Votos con cuentas de Google armadas** | Media | Medio (reputación del premio) | Un voto por cuenta ya está. En `/admin` el ranking es en vivo: si un proyecto salta de golpe, revisar con SQL (abajo). Las condiciones permiten anular votos armados. A futuro: exigir perfil creado para votar o limitar por dispositivo. |
| **Link malicioso en transparencia** | Baja | Medio | Solo `https`, `nofollow`, y `/admin → Empresas → Ocultar`. P2: botón de reporte. |
| **Pico de altas satura el login** | Baja | Alto | Supabase free soporta 50.000 usuarios activos/mes; las páginas públicas son estáticas (ISR). El cuello real es la mesa de alta: guion de 3 minutos. |
| **Migración corrida a medias** | Muy baja | Alto | El SQL editor corre el script en una transacción implícita; está probada con 45 casos. |
| **Se imprimen tarjetas NFC con el dominio equivocado** | Media | Alto (tarjetas inservibles) | P0 #4: dominio definido antes de imprimir. |
| **Ingesta atrasada en hora pico** | Media | Bajo | P1 #12. |

Consulta para revisar votos sospechosos (solo lectura, en el SQL editor):

```sql
select p.nombre, date_trunc('minute', v.created_at) as minuto, count(*) as votos,
       count(*) filter (where u.created_at > now() - interval '1 day') as de_cuentas_nuevas
from public.votos v
join public.perfiles p on p.id = v.perfil_id
join auth.users u on u.id = v.votante
join public.eventos e on e.id = v.evento_id and e.slug = 'feria-21'
group by 1, 2
having count(*) >= 5
order by 2 desc;
```

---

## 6. Qué medir en la feria (y de dónde sale)

| Métrica | Fuente hoy | Meta sugerida para la feria |
| --- | --- | --- |
| Perfiles creados por rol | `/admin → Resumen` | 60 proyectos · 15 inversores · 20 aliados |
| Empresas con 2+ miembros | `/admin → Empresas` | 70% de los proyectos |
| Proyectos con al menos un dato de transparencia compartido | SQL: `select count(distinct empresa_id) from empresa_datos where visible` | 30% |
| Pitches publicados | `/admin → Resumen` | 1 por proyecto |
| Piques | `/admin → Resumen` | 10 por pitch en promedio |
| Votos | `/admin → Feria 21` | 1 por asistente con cuenta |
| **Intros** (toques en canales) | `/admin → Resumen`, por perfil y canal | 20 intros completadas (meta de 6 meses del Drive, adelantada) |

Las metas son una propuesta para discutir en el equipo; lo importante es medirlas igual el Día 1
y el Demo Day para tener la curva.

---

## 7. Cómo seguir trabajando (recomendación de proceso)

- Todo cambio de base, como migración nueva y aditiva, con su caso en `supabase/pruebas/`.
- Antes de cada merge: `npm run build`, `npm run lint` y QA en 390 px de las páginas tocadas.
- Revisiones con los skills del equipo: `/review` para el código, `/qa` para el flujo en el
  navegador, `/cso` para seguridad antes de abrir funciones nuevas al público.

---

## 8. Rama del ecosistema (claude/lucid-pascal-6wxt7j): estado y decisiones pendientes

**Qué agrega.** Pitch del dueño (editar descripción y ocultar), Build in Public (hitos, avances
y racha semanal), producto o servicio con imágenes y One Pager, link de newsletter, Academy
(Startup Essentials + templates guiados), Dataroom (privado ↔ transparente de a un documento,
export a PDF), Portfolio de inversores y aliados con confirmación de la empresa, servicios y
tesis, `/explorar`, logos de empresa, el sistema de diseño naranja + editorial y la landing
nueva de `/sumate`. Todo con migraciones aditivas (20261003 → 20261006, en ese orden) y
pruebas en PGlite (`supabase/pruebas/pitch_build_producto_newsletter.mjs`).

**Antes de mergear.**
1. Correr las cuatro migraciones en orden en el SQL editor.
2. `npm run build`, `npm run lint` y las tres pruebas de `supabase/pruebas/`.
3. QA en el celular de lo que no se puede probar sin pantalla real: el scroll de la landing
   (la escena del problema, el CTA fijo), el switch del Dataroom con el dedo, el editor de
   templates por pasos y el PDF del One Pager y del Dataroom.
4. Revisión legal de `/privacidad` (se sumaron producto, Build in Public, Dataroom,
   portfolio, servicios, tesis, newsletter y logos).

**Decisiones pendientes (no se construyeron a propósito).**
- Subir archivos al Dataroom: hoy son links o documentos escritos. R2 es público; subir
  archivos privados necesita URLs firmadas o un bucket aparte.
- Links privados del Dataroom para un inversor puntual (con vencimiento): requiere tabla de
  accesos y una página que no indexe.
- Dark mode: no existe; los tokens están listos para sumarlo.
- Matching de cofundadores, notificaciones, tarjetas NFC, score de riesgo y analítica de la
  landing: no existen y la landing no los promete. Si se suma analítica, los eventos
  naturales son `hero_cta_click`, `role_selected` (en `ElegirRol`) y `signup_completed`.
- Rol "profesional" (sin startup, sin inversión): hoy no hay rol para eso; la landing ofrece
  "Solo quiero mirar".
