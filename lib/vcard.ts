/**
 * Tarjeta de contacto (vCard 3.0) para "Guardar en contactos": en el celular abre la
 * app de Contactos con todo cargado. Solo con lo que la persona publicó.
 */

type DatosVcard = {
  nombre: string;
  descripcion: string;
  whatsapp: string | null;
  email: string | null;
  web: string | null;
  linkedin: string | null;
  empresa?: string | null;
  cargo?: string | null;
  url: string;
};

/** Escapa lo que vCard trata como separador. */
const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");

/** WhatsApp guardado → internacional: Argentina (10 dígitos) va con +549. */
export function telefonoInternacional(whatsapp: string): string {
  const digitos = whatsapp.replace(/\D/g, "");
  if (whatsapp.trim().startsWith("+")) return `+${digitos}`;
  return digitos.length === 10 ? `+549${digitos}` : `+${digitos}`;
}

const conProtocolo = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export function vcard(d: DatosVcard): string {
  const lineas = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:;${esc(d.nombre)};;;`,
    `FN:${esc(d.nombre)}`,
    d.empresa && `ORG:${esc(d.empresa)}`,
    d.cargo && `TITLE:${esc(d.cargo)}`,
    d.whatsapp && `TEL;TYPE=CELL:${telefonoInternacional(d.whatsapp)}`,
    d.email && `EMAIL;TYPE=INTERNET:${esc(d.email)}`,
    `URL:${d.url}`,
    d.web && `URL:${conProtocolo(d.web)}`,
    d.linkedin && `X-SOCIALPROFILE;TYPE=linkedin:${conProtocolo(d.linkedin)}`,
    `NOTE:${esc(`${d.descripcion} — Lo conocí en Pecera: ${d.url}`)}`,
    "END:VCARD",
  ].filter(Boolean);
  return `${lineas.join("\r\n")}\r\n`;
}

/** Descarga el .vcf (en iOS y Android abre "Agregar contacto"). */
export function descargarVcard(contenido: string, archivo: string) {
  const blob = new Blob([contenido], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${archivo}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
