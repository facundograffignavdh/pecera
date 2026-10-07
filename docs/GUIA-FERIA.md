# Pecera para la Feria 21 — guía de cambios y de uso

> **Novedades de la rama `feria-21-pro`** (alta en pasos, perfil NFC nuevo, Mi red y feed
> Stakeholding, racha, hashtags, cofounder match, portafolio, logo de empresa, modo noche):
> ver [`FERIA-PRO.md`](./FERIA-PRO.md), con la puesta en marcha y la auditoría.

Rama `v2-feria-lista` (sale de `v2-cuentas`, al día con `main` después del PR #2). Esta guía es para el equipo: qué cambió, cómo
ponerlo en marcha y cómo operar la feria. La auditoría con los pendientes está en
[`AUDITORIA.md`](./AUDITORIA.md).

> **Networking de la Feria 21** (rama `networking-feria`, migración
> `20261015120000_networking_feria.sql`): ver la [sección 7](#7-networking-de-la-feria-21).

---

## 1. Qué cambió, en una pantalla

| Antes | Ahora |
| --- | --- |
| Perfil con nombre, tipo, rol, descripción y contacto | Formulario en 4 pasos con **etiquetas por rol**: etapa (idea → escalando), industrias, ronda que busca y cargo (CEO, CTO, CFO…) para innovadores; rondas, ticket e industrias de interés para inversores; especialidades con colores para aliados (mentoría, coaching, legal, fundraising…) |
| Cada persona suelta | **Empresas**: alguien la crea, pasa un código de 8 caracteres, el equipo se suma con su cargo. Página pública `/e/slug` con el equipo y **todos los pitches juntos** |
| Nada de métricas | **Transparencia**: 42 métricas y documentos (MRR, churn, CAC, MOAT, pitch deck, cap table, SAFE…), **privados** hasta que el equipo comparte cada uno |
| Sin eventos | **Feria 21** en `/eventos/feria-21`: programa del 7 al 9 de octubre + Demo Day, cómo votar y **votación del público** (un voto por cuenta de Google; compite cualquier perfil anotado: emprendedor, inversor o aliado) |
| Sin material educativo | **Docs**: 98 conceptos con ejemplo y buscador (`/docs/conceptos`) y 16 documentos legales con kit por etapa (`/docs/legales`). Todo se comparte con link directo |
| Doble toque en parte del video | **Doble toque en toda la pantalla**, ráfaga de corazones (tap-tap-tap), vibración, pista la primera vez y el pop-up espera a que termine la ráfaga |
| Sin navegación | **Menú** (☰ arriba a la izquierda): Feed, Feria 21, Docs, Sumate, Mi perfil |
| `/sumate` con formulario propio aparte | `/sumate` elige el rol y entra con **Google** a `/cuenta?rol=…`. Un solo alta, sin datos duplicados |
| Operar = SQL editor | **`/admin`**: publicar perfiles y pitches, envíos trabados con el comando listo, ocultar empresas y manejar la votación. Desde el celular |

Todo lo nuevo es **aditivo**: una sola migración (`supabase/migrations/20261001120000_feria_lista.sql`)
que crea tablas y columnas, no borra ni renombra nada. Si la app se despliega **antes** de correrla,
funciona igual: guarda lo básico del perfil, avisa y las páginas nuevas muestran un estado neutro.

---

## 2. Puesta en marcha (en este orden)

1. **Revisar y mergear** el PR a `main`. Correr `npm run build` localmente si hace falta. La
   app aguanta el orden inverso (deploy antes que migración), pero lo ideal es: migración →
   merge → deploy.
2. **Probar la migración sin tocar la base** (opcional, 1 minuto): ver
   `supabase/pruebas/feria_lista.mjs`. Tiene que dar `45 ok · 0 fallas`.
3. **Correr la migración** en el SQL editor de Supabase: pegar el contenido completo de
   `20261001120000_feria_lista.sql` y ejecutar. El editor manda todo el script junto y Postgres
   lo corre en una sola transacción implícita: si algo falla, no queda nada a medias (revisar el
   error y volver a correr).
4. **Sumar al equipo como admin** (con el email exacto de Google de cada uno):
   ```sql
   insert into public.admins (email) values ('nombre@gmail.com');
   ```
5. Entrar a **`/admin`** con esa cuenta. Si dice "no está en el equipo", el email no coincide.
6. Decidir **autopublicar** desde el Resumen del panel: prendido = cada perfil nuevo se ve
   enseguida (recomendado durante la feria, con el equipo mirando el panel); apagado = cada
   perfil espera tu OK.
7. **Revisar el programa** en `lib/eventos.ts`: miércoles 7 y jueves 8, feria de 9:00 a 17:00 h
   en la Carpa Feria; viernes 9, feria desde las 9:00 h y Demo Day a las 14:00 h en el Auditorio,
   Urquía. Si algo cambia, se edita ahí. Commit + deploy.
8. **Verificar que el lanzamiento de v2-cuentas quedó completo** (PR #2, mergeado el 29/9;
   checklist en `CLAUDE.md`): `lanzamiento-cuentas.sql` corrido, variables de R2 en Production
   de Vercel, app de Google en modo producción y el Form viejo cerrado.

> ⚠️ **Crítico para la feria:** si la app de Google OAuth sigue en modo *Testing*, solo pueden
> entrar los usuarios de prueba cargados (máx. 100). Pasarla a *In production* antes del Día 1.
> Y en Supabase → Authentication → URL Configuration, sumar el dominio de producción a
> *Redirect URLs* (`https://tu-dominio/auth/callback`).

---

## 3. Cómo se usa (por rol)

### Innovador (emprendedor)
1. `/sumate` → "Sumate a Pecera" → **Innovador** → Entrar con Google.
2. Paso 3 del formulario: **etapa** (barra de 5 tramos), hasta 3 **industrias**, **ronda** que
   busca y su **cargo**. Guardar.
3. Tarjeta **Tu empresa**: "Crear empresa" (nombre, dirección, qué hace, etapa, industria,
   ronda). Aparece el **código** (ej. `A1B2-C3D4`) con botón para copiar o mandar por WhatsApp.
4. El resto del equipo entra con su cuenta → Tu empresa → **"Tengo un código"** → elige su cargo.
5. Tarjeta **Transparencia**: cargar métricas y links. Cada dato tiene su interruptor
   **Privado / Compartido**. Solo lo compartido aparece en `/e/slug`.
6. Tarjeta **Feria 21** → "Anotar mi proyecto": aparece en la votación.
7. Subir el pitch desde "Mis pitches" (Form de Google, como siempre).

### Inversor
Entra como **Inversor**: tipo (ángel, fondo, aceleradora), **rondas** que mira, **ticket** y
hasta 6 **industrias de interés**. Puede anotarse en la Feria 21 y compite en el ranking del
público como cualquier participante (migración `20261013120000_feria_todos_los_roles.sql`). Vota
como cualquiera.

### Aliado (mentor, coach, aceleradora, incubadora)
Entra como **Aliado**: hasta 5 **especialidades**, cada una con su color (mentoría y coaching en
verde, fundraising y ventas en arcilla, legal en tierra, tecnología en azul…). Igual que el
inversor, si se anota en la feria compite en el ranking del público.

### Público
No necesita cuenta para mirar el feed, perfiles, empresas, el evento ni Docs. Para **votar**
entra con Google (un voto por cuenta, lo puede cambiar mientras la votación esté abierta).

### Equipo (admin)
`/cuenta` muestra **Panel del equipo** solo a los admins. En `/admin`:
- **Resumen**: alertas (perfiles pendientes, videos trabados), números y autopublicar.
- **Perfiles** / **Pitches**: publicar o despublicar con un toque (filtros por estado).
- **Envíos**: videos del Form que no se publicaron, con el email escrito y verificado, la regla
  y el comando `gh workflow run ingesta.yml -f asignar="…"` listo para copiar (cambiar `SLUG`).
- **Empresas**: ocultar una empresa (spam, nombre ofensivo).
- **Feria 21**: abrir/cerrar la votación, mostrar resultados, ranking en vivo y **Quién
  participa** (con buscador y filtro "Para revisar"): anotar o sacar perfiles, sumar o sacar
  empresas (participan a través de una sola persona, quien la administra, para que los votos no
  se repartan; se puede cambiar quién la representa y sus votos pasan con ella) y sumar o quitar
  `#feria21` de los pitches (es lo que arma `/t/feria21`).
- **`/admin/vivo`** (pantalla del stand): métricas a la izquierda y el top 10 de la votación a la
  derecha, cada 15 s, sin los votos del equipo. La página del evento sigue mostrando resultados
  solo cuando se tocan desde acá.

---

## 4. Operación de la feria, día por día

| Momento | Qué hace el equipo |
| --- | --- |
| **Antes** | Pasos de la sección 2. Imprimir QR a `/sumate` y a `/eventos/feria-21`. Cargar las tarjetas NFC con `/p/slug` de cada proyecto. |
| **Miércoles 7, 9:00 h (Carpa Feria)** | `/admin` → Feria 21 → **Abrir** votación. Mesa de alta: cada equipo entra con Google, arma perfil + empresa + se anota en la feria. Pantalla con el QR a `/eventos/feria-21#votacion`. En `/admin` → Resumen, vaciar "pendientes" cada hora. |
| **Jueves 8, 9:00 a 17:00 h (Carpa Feria)** | Revisar **Envíos** (videos trabados) y publicar pitches. Mirar el ranking; si hay algo raro (muchos votos de cuentas nuevas), anotarlo. En el Resumen, vistas y contactos por perfil. |
| **Viernes 9, mañana (Carpa Feria)** | La votación sigue abierta hasta el Demo Day. |
| **Viernes 9, 14:00 h — Demo Day (Auditorio, Urquía)** | Al empezar, **Cerrar** la votación. **Mostrar** resultados en el momento del anuncio: la página del evento pasa a ranking con barras. |
| **Después** | Dejar los resultados visibles o esconderlos. Exportar el ranking si se necesita (captura del panel). |

La votación y los resultados se controlan por separado: se puede abrir la votación con los
resultados ocultos (lo normal) y mostrarlos recién en el anuncio.

---

## 5. Editar y ampliar

- **Programa del evento**: `lib/eventos.ts` (días, fechas, textos, reglas). Vive en código
  para que la página se vea aunque la base falle.
- **Evento nuevo** (hackathon, otra feria): agregarlo a `EVENTOS` en `lib/eventos.ts` e insertar
  la fila en la base: `insert into public.eventos (slug, nombre) values ('hackathon-x', 'Hackathon X');`.
- **Vocabularios** (etapas, industrias, cargos, especialidades): `lib/etiquetas.ts`. Son espejo
  de los `CHECK` de la migración: si agregás un valor, hacé una migración nueva que actualice el
  `CHECK` (nunca editar una migración ya corrida).
- **Métricas de transparencia**: `lib/transparencia.ts` + el `CHECK` `empresa_datos_clave_valida`.
- **Conceptos y documentos**: `lib/glosario.ts` y `lib/legales.ts`. Los `slug` son las anclas
  de los links compartidos: no cambiarlos.

---

## 6. Si algo falla

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| "Guardamos tu perfil. Etapa, industrias… se van a poder guardar en un rato" | La migración no corrió | Paso 3 de la sección 2 |
| `/admin` dice "no está en el equipo" | Email distinto en `admins` | Insertar el email exacto (minúsculas) |
| No se puede entrar con Google | App OAuth en *Testing* o falta la Redirect URL | Ver el aviso de la sección 2 |
| "Ese código no existe" | Código mal tipeado o renovado | El dueño lo ve en su cuenta; puede generar uno nuevo |
| "Probaste muchos códigos" | Más de 10 intentos en una hora | Esperar una hora (protección contra adivinar códigos) |
| La página de empresa da 404 | Ningún perfil del equipo está publicado, o la ocultó el equipo | Publicar un perfil del equipo en `/admin` |
| Un voto "no se puede" | Votación cerrada, votarse a sí mismo o a la propia empresa | Es la regla; lo explica el mensaje |

---

## 7. Networking de la Feria 21

Rama `networking-feria`. Migración aditiva `supabase/migrations/20261015120000_networking_feria.sql`
(después de `persona_empresa`); vuelta atrás `supabase/rollback-networking-feria.sql` (NO es
migración, con pérdida: lee su encabezado). Pruebas sin tocar ninguna base:
`supabase/pruebas/networking_feria.mjs` (PGlite) y `node scripts/pruebas/networking.ts` (encaje).

### Qué es
- **Qué buscás y qué ofrecés**, para todos los roles: 10 categorías (capital, equipo,
  conocimiento, mercado, producto, herramientas, infraestructura, investigación, difusión y
  trabajo) con sus opciones, hasta **10 por lado**. Además, hasta 8 **detalles libres** por lado
  («Figma», «créditos de AWS») y el **cómo** (pago, canje, sin costo o a conversar). Se elige por
  categorías, con buscador y con **ejemplos por rol** (startup en MVP, inversora ángel, estudio
  contable, laboratorio universitario, empresa grande, desarrolladora freelance, estudiante) que
  suman opciones sin borrar las que ya había. El mismo selector está en el perfil y en Networking.
- Las 10 opciones de antes siguen valiendo. Ocho son opciones nuevas con el mismo id (cofundador,
  mentoría, primeros clientes, empleo, alianzas estratégicas, proveedores e insumos, comunidad y
  networking, prensa); **inversión** y **talento** quedan como «Capital y financiamiento (en
  general)» y «Equipo y talento (en general)»: se ven si ya estaban y valen por toda la categoría
  en el encaje, pero no se ofrecen para elegir de nuevo.
- **`/cofundadores` tiene dos pestañas**: «Cofundadores» (el cofounder match de siempre, igual) y
  «Networking». Link directo: `/cofundadores?ver=networking&alcance=feria`.
- Networking tiene el filtro **Feria 21 / Toda la plataforma**. Por defecto, Feria 21 para quien
  está anotado en la feria (se ve el sello verde FERIA 21). La lista se ordena por **encaje**: lo
  que buscás y el otro ofrece y al revés (opción exacta pesa más que la misma categoría), el cómo,
  la zona, las industrias y la etapa, con hasta tres razones en cada tarjeta.
- **Conexión**: el mismo flujo del cofounder match (interés con mensaje, aceptar o pasar, match,
  retirar con confirmación), con su propia tabla `networking_intereses` y su propio tope de 20
  por día (no le come el cupo al de cofundador). Con match aparecen WhatsApp y email; tocarlos
  cuenta como conexión iniciada (CI), igual que siempre.

### El aviso al anotarse
- Al tocar «Anotar…» en la tarjeta **Feria 21** de `/cuenta`, aparece: «Para hacer networking en
  la Feria 21, contanos qué buscás y qué ofrecés», con el botón a Networking (abre la hoja para
  completar).
- Si **el equipo la anotó desde `/admin`**, le aparece la próxima vez que entra a `/cuenta`.
- Se cierra con «Ahora no» (vuelve al día siguiente en ese celular) y no aparece más cuando ya
  completó busca **y** ofrece. Es solo interfaz: nunca traba el alta ni el login.

### Consentimiento para la Universidad (opcional)
- Adentro del aviso y en la tarjeta Feria 21 de `/cuenta`, una casilla **opcional y separada**:
  «Acepto compartir mi perfil y lo que busco y ofrezco con la Universidad Siglo 21, organizadora
  de la Feria 21, para facilitar conexiones durante el evento.» Nunca es condición para nada.
- Se guarda la elección, la fecha y la versión del texto (`evento_consentimientos`); destildarla
  la retira (queda `acepta = false` con la fecha nueva). Con el convenio firmado, lo ven las
  autoridades de la Universidad en su panel (ver la sección 8).
- Explicado en `/privacidad#universidad`.

### Puesta en marcha
1. Correr `20261015120000_networking_feria.sql` en el SQL editor (una sola vez, con todo el
   archivo). Antes del merge: en esa ventana `main` muestra el id crudo de las opciones nuevas, así
   que probar solo con perfiles no publicados.
2. Probar en el celular (preview de Vercel): las dos pestañas, el filtro y el sello, editar en la
   hoja (y el teclado de iOS en el buscador), interés → match → retirar, el aviso anotándose desde
   `/cuenta` y desde `/admin`, y la casilla (tildar y destildar).
3. Merge a `main`.

### Si algo falla
| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| Networking muestra la lista pero sin «Me interesa» | La migración no corrió | Paso 1 |
| «Primero contá qué buscás y qué ofrecés» | El perfil no tiene nada en busca ni ofrece, o está oculto | Completar en la hoja; mostrar el perfil |
| No aparece la casilla de la Universidad | La migración no corrió | Paso 1 |
| «Revisá este dato» al guardar busca/ofrece | La base todavía tiene la regla vieja | Paso 1 |

---

## 8. Panel de la Universidad (`/organizacion`)

Migración aditiva `supabase/migrations/20261016120000_panel_organizacion.sql` (después de
`networking_feria`; el encabezado trae cómo volver atrás). Pruebas sin tocar ninguna base:
`supabase/pruebas/panel_organizacion.mjs` (PGlite).

### Quién entra
- Las autoridades de la Universidad, con su cuenta de Google, en **`/organizacion`**. Solo los
  emails que el equipo habilita en **`/admin` → Universidad** («Habilitar» / «Sacar»). No necesitan
  perfil en Pecera y no ven nada del resto de `/admin`.
- Los admins de Pecera también lo abren, para revisar lo mismo que ve la Universidad.
- Quien entra con otra cuenta ve «no está habilitada» y nada más.

### Qué ve
- **Números** de la feria (participantes visibles, sin el equipo ni perfiles de prueba): personas,
  cuántos completaron busca y ofrece, cuántos mostraron interés, intereses, matches (por par),
  aceptados, por día, entre roles, lo más buscado y ofrecido, lo que se busca mucho y se ofrece
  poco, por categoría, el cómo y cuántos aceptaron compartir.
- **Con nombre, solo quienes tildaron la casilla** y tienen el perfil visible: perfil público,
  empresas, zona, lo que buscan y ofrecen (con detalle y cómo), si están anotados y cuándo
  aceptaron. Botón **Descargar CSV** (`/organizacion/csv`, con link al perfil; abre bien en Excel).
- **Nunca**: mensajes, quién le mostró interés a quién, emails de cuenta, ni nombres de quien no
  aceptó. Si alguien destilda la casilla, oculta su perfil o borra la cuenta, desaparece al instante.
- **Solo el equipo** (al final del panel): quién de la feria todavía no completó qué busca y qué
  ofrece, para empujarlo en el stand.

### Puesta en marcha
1. Correr `20261016120000_panel_organizacion.sql` en el SQL editor (archivo completo, sin nada
   seleccionado).
2. En `/admin` → Universidad, habilitar los emails de Google de las autoridades.
3. Pasarles el link `https://<dominio>/organizacion`.


---

## 9. Alta rápida en el stand (`/admin/alta`)

Rama `alta-rapida`, migración `20261019120000_alta_rapida.sql` (después de score_switch; pruebas
`supabase/pruebas/alta_rapida.mjs`; vuelta atrás `supabase/rollback-alta-rapida.sql`, que NO es
migración y es con pérdida del registro y los emails de reclamo).

### En el stand (menos de 30 segundos)
1. Desde el celular, `/admin` → **+ Alta rápida** (solo cuentas de `admins`).
2. Nombre y apellido, qué hace en una línea, la empresa (opcional) y, si la da, su email de Google
   "para que reclame su perfil". Enter pasa al siguiente campo.
3. Si aparece **"Ya existe: …, ¿es la misma persona?"**: «Abrir» lleva a ese perfil; si es otra,
   «No, es otra persona» (o «Crear igual»). Si la empresa ya existe, **«Sumar a …»** la suma sin
   duplicarla y sin cambiar quién la administra ni quién la representa en la feria.
4. **Contale** lo que dice el texto de la casilla y tildala solo si dice que sí. Sin eso no se crea.
5. Opcional: el **Stand** (día y número) arma el link de la tarjeta NFC con el esquema de la planilla
   (`s<100 × (día − 6) + stand>`: jueves 8, stand 16 → `s216`). Solo se muestra, no se guarda.
6. Listo: link del perfil (copiar), link de la tarjeta, **Crear otro** (deja fijas las opciones) y
   las últimas 5 altas con **Editar** y **Deshacer** (solo durante 10 minutos).

"Más opciones" (cerrado): rol (emprendedor), tipo de la empresa (startup) y publicado (tildado).
El perfil nace como cuenta personal (`tipo = persona`), sin dueña.

### Después: la persona reclama su perfil
- Si dejó su email de Google: cuando entra a Pecera con esa cuenta y abre **Mi perfil**, ve
  "Encontramos tu perfil de la feria: ¿es tuyo?". Al confirmar (con la casilla de consentimiento)
  queda como dueña, y las empresas sin administradora pasan a ella. En Gmail no importan los
  puntos ni lo que va después de "+".
- Si entró con otro email: `/admin/perfil/<id>` → **Vincular con cuenta** (la cuenta tiene que haber
  entrado una vez y no tener perfil).
- Si ya tenía su propio perfil, o dijo "No es mío": aparece en `/admin` → Perfiles → **Para revisar**.
  Nada se fusiona solo.

### Editar desde `/admin`
`/admin` → Perfiles → **Editar** en cada fila. Sin cuenta: todo, el email de reclamo, vincular y
**Eliminar** (si lo creó el equipo; derecho de supresión). Con cuenta: solo nombre y descripción.
Empresa: editar nombre y línea, **Sumar otra** (crear o sumarse a una existente, hasta 5). Filtro
**Sin empresa** para completar las que faltan. Todo queda en `equipo_acciones` (quién, cuándo y qué
columnas, nunca los valores).

### Puesta en marcha
1. Correr `20261019120000_alta_rapida.sql` en el SQL editor (archivo completo).
2. Prueba manual: un solo perfil, **sin publicar**, renombrado a `test-…` por SQL, y borrarlo
   después con «Eliminar perfil».
