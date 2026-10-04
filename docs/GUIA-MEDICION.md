# Guía de medición — Feria 21 (super dataroom)

Para el equipo: qué se mide, cómo grabar las tarjetas, cómo no ensuciar los números y
qué mirar durante la feria. Rama `super-dataroom`, migración
`20261011120000_super_dataroom.sql`.

## Qué medimos (definiciones exactas)

- **Conexión iniciada (CI)**, el North Star: un toque en un canal de contacto
  (WhatsApp, email, LinkedIn, Instagram o web) de un **origen** a un perfil, sin otro
  toque del mismo par en las 24 h anteriores. Origen = la cuenta, si el navegador está
  unido a una; si no, el dispositivo. El canal no suma: tocar WhatsApp y email del mismo
  perfil es una sola CI. **Siempre decimos "iniciadas"**: un toque es una intención, no
  una reunión.
- **CI calificada (CI-Q)**: el origen es una cuenta con rol inversor o aliado y el
  destino es un emprendedor.
- **Proyecto (participante)**: perfil visible con al menos un pitch publicado. No cuentan
  los `test-*`, el perfil `pecera` ni los de cuentas del equipo (`admins`,
  `equipo_ingesta`).
- **Liquidez** = proyectos con ≥ 1 CI / proyectos. **Liquidez calificada**: con CI-Q.
- **Ceros**: proyectos con vistas y ninguna CI.
- **Vistas fuera del horario de la feria**: mide el horario (las franjas de
  `feria_franjas`), no el lugar.

Todo excluye el tráfico interno: dispositivos marcados con `?equipo=1`, dispositivos
unidos alguna vez a una cuenta del equipo, y los perfiles de prueba.

## Tarjetas NFC

El identificador de la tarjeta es el **número de stand**: `s` + número (`s16`). URL
exacta para grabar:

```
https://<dominio>/p/<slug>?src=nfc&t=s16
```

- `<slug>` es el del perfil del stand (el que aparece en `/p/<slug>`).
- Otra cosa en `t` (por ejemplo `prueba1`) no cuenta como tarjeta.
- Al abrirse, la app guarda el origen y **saca los parámetros de la URL**: si alguien
  comparte el link después, no arrastra la tarjeta.
- Para probar una tarjeta usá un perfil `test-*` o uno no publicado y el stand `s99`.

Links de campaña: `?utm_source=instagram&utm_medium=story&utm_campaign=feria21`.

## Que el equipo no cuente

Una vez en cada celular o compu del equipo, abrir cualquier página con `?equipo=1`
(por ejemplo `https://<dominio>/?equipo=1`). Aparece el aviso "Este dispositivo quedó
marcado como del equipo". Iniciar sesión con una cuenta de `admins` o `equipo_ingesta`
también lo excluye.

## Durante la feria

- **Pantalla del stand**: `/admin/vivo` (con una cuenta de `admins`). Se actualiza cada
  15 s. Solo agregados: el ticker no dice nombres y nombra la industria solo si tiene 5
  proyectos o más.
- **Curva por hora**: el workflow `metricas.yml` guarda los agregados en `metricas_hora`
  a los 7 minutos de cada hora (recalcula las últimas 26 h, así tapa atrasos de GitHub).
  El cron corre solo desde `main`; en otra rama: `gh workflow run metricas.yml --ref <rama>`.
- **Horario de la feria**: `feria_franjas` (7 y 8/10 de 9 a 17, 9/10 de 9 a 18). Si
  cambia, se edita en el SQL editor.

## Demo Day (viernes 9, 14:00)

Antes de subir: congelar el snapshot (`admin_congelar_demo_day()`, botón en /admin
cuando esté). Guarda una fila que no se puede cambiar con CI, CI por participante,
liquidez, liquidez calificada y % de vistas fuera del horario de la feria, desde el
comienzo del 7/10 hasta ese momento.

## Privacidad

- Nada de IP, ubicación, user agent (solo celular/compu) ni datos de quien contacta.
- La actividad cruda se borra a los 90 días (la poda corre en el mismo workflow); quedan
  los totales por hora.
- Borrar la cuenta borra la unión navegador–cuenta y todo lo de los navegadores que
  quedan sin cuenta.
- El repo es público: ningún dato real en git ni en los logs.

## Lanzamiento (una sola sesión)

1. Correr `supabase/migrations/20261011120000_super_dataroom.sql` en el SQL editor.
2. Verificar: `select * from public.feria_franjas;` (3 filas) y
   `select public.metrica_resumen(now() - interval '1 day', now());`.
3. En la vista previa de Vercel: `?equipo=1` en un celular, una tarjeta de prueba
   (`/p/<test>?src=nfc&t=s99`), un login y `/admin/vivo`. Correr `metricas.yml` a mano y
   mirar `select * from public.metricas_hora order by hora desc limit 3;`.
4. Merge a `main`.

Para volver atrás: `supabase/rollback-super-dataroom.sql` (no es migración; borra solo
lo nuevo). Pruebas sin tocar ninguna base: `supabase/pruebas/super_dataroom.mjs`
(PGlite) y `node scripts/pruebas/vinculo.ts`.
