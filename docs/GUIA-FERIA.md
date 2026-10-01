# Pecera para la Feria 21 — guía de cambios y de uso

> **Novedades de la rama `feria-21-pro`** (alta en pasos, perfil NFC nuevo, Mi red y feed
> Stakeholding, racha, hashtags, cofounder match, portafolio, logo de empresa, modo noche):
> ver [`FERIA-PRO.md`](./FERIA-PRO.md), con la puesta en marcha y la auditoría.

Rama `v2-feria-lista` (sale de `v2-cuentas`, al día con `main` después del PR #2). Esta guía es para el equipo: qué cambió, cómo
ponerlo en marcha y cómo operar la feria. La auditoría con los pendientes está en
[`AUDITORIA.md`](./AUDITORIA.md).

---

## 1. Qué cambió, en una pantalla

| Antes | Ahora |
| --- | --- |
| Perfil con nombre, tipo, rol, descripción y contacto | Formulario en 4 pasos con **etiquetas por rol**: etapa (idea → escalando), industrias, ronda que busca y cargo (CEO, CTO, CFO…) para innovadores; rondas, ticket e industrias de interés para inversores; especialidades con colores para aliados (mentoría, coaching, legal, fundraising…) |
| Cada persona suelta | **Empresas**: alguien la crea, pasa un código de 8 caracteres, el equipo se suma con su cargo. Página pública `/e/slug` con el equipo y **todos los pitches juntos** |
| Nada de métricas | **Transparencia**: 42 métricas y documentos (MRR, churn, CAC, MOAT, pitch deck, cap table, SAFE…), **privados** hasta que el equipo comparte cada uno |
| Sin eventos | **Feria 21** en `/eventos/feria-21`: programa del 7 al 9 de octubre + Demo Day, cómo votar y **votación del público** (un voto por cuenta de Google, solo compiten proyectos) |
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
hasta 6 **industrias de interés**. Puede anotarse en la Feria 21 como "presente" (aparece en
"También en la feria", no compite). Vota como cualquiera.

### Aliado (mentor, coach, aceleradora, incubadora)
Entra como **Aliado**: hasta 5 **especialidades**, cada una con su color (mentoría y coaching en
verde, fundraising y ventas en arcilla, legal en tierra, tecnología en azul…). Igual que el
inversor, figura como presente en la feria.

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
- **Feria 21**: abrir/cerrar la votación, mostrar resultados, ranking en vivo, anotar o sacar
  participantes.

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
