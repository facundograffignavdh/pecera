/**
 * Prefijos de WhatsApp para el selector con bandera. Argentina va primero y se
 * guarda como 10 dígitos (área + número, sin 0 ni 15), como siempre; el resto se
 * guarda internacional: "+" + código + número (lo acepta el guardián de la base).
 */

export type Pais = {
  iso: string;
  nombre: string;
  codigo: string;
  bandera: string;
  ejemplo: string;
};

export const PAISES: Pais[] = [
  { iso: "AR", nombre: "Argentina", codigo: "54", bandera: "🇦🇷", ejemplo: "351 612 3456" },
  { iso: "UY", nombre: "Uruguay", codigo: "598", bandera: "🇺🇾", ejemplo: "99 123 456" },
  { iso: "CL", nombre: "Chile", codigo: "56", bandera: "🇨🇱", ejemplo: "9 1234 5678" },
  { iso: "PY", nombre: "Paraguay", codigo: "595", bandera: "🇵🇾", ejemplo: "981 123 456" },
  { iso: "BO", nombre: "Bolivia", codigo: "591", bandera: "🇧🇴", ejemplo: "7123 4567" },
  { iso: "BR", nombre: "Brasil", codigo: "55", bandera: "🇧🇷", ejemplo: "11 91234 5678" },
  { iso: "PE", nombre: "Perú", codigo: "51", bandera: "🇵🇪", ejemplo: "912 345 678" },
  { iso: "CO", nombre: "Colombia", codigo: "57", bandera: "🇨🇴", ejemplo: "321 123 4567" },
  { iso: "EC", nombre: "Ecuador", codigo: "593", bandera: "🇪🇨", ejemplo: "99 123 4567" },
  { iso: "VE", nombre: "Venezuela", codigo: "58", bandera: "🇻🇪", ejemplo: "412 123 4567" },
  { iso: "MX", nombre: "México", codigo: "52", bandera: "🇲🇽", ejemplo: "55 1234 5678" },
  { iso: "US", nombre: "Estados Unidos", codigo: "1", bandera: "🇺🇸", ejemplo: "305 123 4567" },
  { iso: "ES", nombre: "España", codigo: "34", bandera: "🇪🇸", ejemplo: "612 34 56 78" },
  { iso: "IT", nombre: "Italia", codigo: "39", bandera: "🇮🇹", ejemplo: "312 345 6789" },
];

export const ARGENTINA = PAISES[0];

/** Valor guardado → país + número local. Sin "+", es Argentina. */
export function separarTelefono(valor: string | null | undefined): { pais: Pais; local: string } {
  const v = (valor ?? "").trim();
  if (!v.startsWith("+")) return { pais: ARGENTINA, local: v.replace(/\D/g, "") };
  const digitos = v.replace(/\D/g, "");
  // El código más largo que coincida (598 antes que 5…).
  const pais = [...PAISES]
    .sort((a, b) => b.codigo.length - a.codigo.length)
    .find((p) => digitos.startsWith(p.codigo));
  return pais
    ? { pais, local: digitos.slice(pais.codigo.length) }
    : { pais: ARGENTINA, local: digitos };
}

/** País + número local → valor a guardar ("" si no hay número). */
export function unirTelefono(pais: Pais, local: string): string {
  const digitos = local.replace(/\D/g, "").replace(/^0+/, "");
  if (!digitos) return "";
  return pais.iso === "AR" ? digitos : `+${pais.codigo}${digitos}`;
}

/** Para mostrar: "+54 351 612 3456" o "+598 99123456". */
export function telefonoLegible(valor: string): string {
  const { pais, local } = separarTelefono(valor);
  return `+${pais.codigo} ${local}`;
}
