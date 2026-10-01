/**
 * Racha de progreso ("build in public"): días seguidos con al menos un pitch
 * publicado, en horario de Argentina. Si hoy todavía no subió, la racha de ayer
 * sigue viva hasta que termine el día. Sin estado: se calcula de las fechas de los
 * pitches cada vez (en el ISR o en el navegador).
 */

const ZONA = "America/Argentina/Cordoba";
const DIA_MS = 24 * 60 * 60 * 1000;

const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-10-07" en horario de Argentina. */
export function diaLocal(fecha: Date | string | number): string {
  return formatoDia.format(new Date(fecha));
}

function diaAnterior(dia: string): string {
  // Mediodía UTC: restar un día nunca cruza dos fechas por el cambio de zona.
  return new Date(Date.parse(`${dia}T12:00:00Z`) - DIA_MS).toISOString().slice(0, 10);
}

export type Racha = {
  /** Días seguidos hasta hoy (o hasta ayer, si hoy todavía no subió). */
  actual: number;
  mejor: number;
  /** Subió hoy: la racha ya está a salvo. */
  hoy: boolean;
  /** Últimos 14 días, del más viejo al de hoy: si subió ese día. */
  ultimos: boolean[];
  total: number;
};

export function calcularRacha(fechas: Array<string | null | undefined>, ahora = Date.now()): Racha {
  const dias = new Set(fechas.filter((f): f is string => !!f).map(diaLocal));
  const hoy = diaLocal(ahora);

  let dia = dias.has(hoy) ? hoy : diaAnterior(hoy);
  let actual = 0;
  while (dias.has(dia)) {
    actual++;
    dia = diaAnterior(dia);
  }

  let mejor = 0;
  for (const d of dias) {
    // Solo arranca a contar desde el primer día de cada tramo.
    if (dias.has(diaAnterior(d))) continue;
    let largo = 0;
    let cursor = d;
    while (dias.has(cursor)) {
      largo++;
      cursor = new Date(Date.parse(`${cursor}T12:00:00Z`) + DIA_MS).toISOString().slice(0, 10);
    }
    mejor = Math.max(mejor, largo);
  }

  const ultimos: boolean[] = [];
  let cursor = hoy;
  for (let i = 0; i < 14; i++) {
    ultimos.unshift(dias.has(cursor));
    cursor = diaAnterior(cursor);
  }

  return { actual, mejor, hoy: dias.has(hoy), ultimos, total: dias.size };
}
