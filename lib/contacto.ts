import type { Perfil } from "@/types/pecera";

export type Canal = {
  clave: "whatsapp" | "email" | "linkedin" | "instagram" | "web";
  label: string;
  href: string;
  /**
   * Se abre en pestaña nueva. mailto: no: en el celular abre la app de correo y
   * deja atrás una pestaña vacía.
   */
  externo: boolean;
};

const SALUDO = "Hola! Te vi en Pecera";

/**
 * Los números se cargan como 10 dígitos con código de área (3516123456).
 * wa.me los quiere con prefijo de país y el 9 de celular: 549 + los 10.
 */
function hrefWhatsapp(numero: string, saludo: string): string | null {
  let digitos = numero.replace(/\D/g, "");
  if (digitos.length === 10) digitos = `549${digitos}`;
  if (!digitos) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(saludo)}`;
}

/** Los perfiles cargan la URL a mano: puede venir sin protocolo. */
export function conProtocolo(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Acepta "@usuario", "usuario" o la URL completa. */
export function hrefInstagram(valor: string): string {
  if (/^https?:\/\//i.test(valor)) return valor;
  return `https://instagram.com/${valor.replace(/^@/, "")}`;
}

/**
 * Solo los canales que el perfil tiene cargados, listos para un <a>.
 * `saludo` va como texto de WhatsApp y cuerpo del email.
 */
export function canalesDe(perfil: Perfil, saludo = SALUDO): Canal[] {
  const canales: Canal[] = [];

  if (perfil.whatsapp) {
    const href = hrefWhatsapp(perfil.whatsapp, saludo);
    if (href) canales.push({ clave: "whatsapp", label: "WhatsApp", href, externo: true });
  }
  if (perfil.email) {
    canales.push({
      clave: "email",
      label: "Email",
      href: `mailto:${perfil.email}?body=${encodeURIComponent(saludo)}`,
      externo: false,
    });
  }
  if (perfil.linkedin) {
    canales.push({
      clave: "linkedin",
      label: "LinkedIn",
      href: conProtocolo(perfil.linkedin),
      externo: true,
    });
  }
  if (perfil.instagram) {
    canales.push({
      clave: "instagram",
      label: "Instagram",
      href: hrefInstagram(perfil.instagram),
      externo: true,
    });
  }
  if (perfil.web) {
    canales.push({
      clave: "web",
      label: "Sitio web",
      href: conProtocolo(perfil.web),
      externo: true,
    });
  }

  return canales;
}
