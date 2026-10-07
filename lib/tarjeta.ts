/**
 * Código de la tarjeta NFC de un stand de la Feria 21 (sin imports, para probarlo con
 * `node scripts/pruebas/tarjeta.ts`). Mismo esquema que la planilla de tarjetas:
 * s<100 × (día − 6) + stand> → miércoles 7 = s1xx, jueves 8 = s2xx, viernes 9 = s3xx.
 * El stand 16 del jueves es s216.
 */

export const DIAS_FERIA = [
  { dia: 7, label: "Mié 7" },
  { dia: 8, label: "Jue 8" },
  { dia: 9, label: "Vie 9" },
] as const;

export const STAND_MAX = 99;

/** null si el día no es de la feria o el stand no está entre 1 y 99. */
export function codigoTarjeta(dia: number, stand: number): string | null {
  if (!DIAS_FERIA.some((d) => d.dia === dia)) return null;
  if (!Number.isInteger(stand) || stand < 1 || stand > STAND_MAX) return null;
  return `s${100 * (dia - 6) + stand}`;
}

/** Link de la tarjeta: el del perfil con `?src=nfc&t=<código>` (lo lee lib/atribucion.ts). */
export function conCodigoTarjeta(urlPerfil: string, codigo: string): string {
  return `${urlPerfil}?src=nfc&t=${codigo}`;
}
