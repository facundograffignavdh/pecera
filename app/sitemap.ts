import type { MetadataRoute } from "next";
import { getSlugs } from "@/lib/datos";
import { LECCIONES } from "@/lib/essentials";
import { EVENTOS } from "@/lib/eventos";

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

// Se rehace cada hora: suma los perfiles nuevos sin pegarle a la base en cada pedido.
export const revalidate = 3600;

/** Páginas públicas y perfiles visibles. Si la base falla, sale sin perfiles. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fijas = ["/sumate", "/", "/explorar", "/academy", "/academy/docs", "/eventos", "/privacidad", "/terminos"];
  const perfiles = await getSlugs().catch(() => [] as string[]);
  return [
    ...fijas.map((ruta) => ({ url: `${SITIO}${ruta}`, priority: ruta === "/sumate" ? 1 : 0.7 })),
    ...EVENTOS.map((e) => ({ url: `${SITIO}/eventos/${e.slug}`, priority: 0.6 })),
    ...LECCIONES.map((l) => ({ url: `${SITIO}/academy/essentials/${l.slug}`, priority: 0.5 })),
    ...perfiles.filter((s) => !s.startsWith("test-")).map((s) => ({ url: `${SITIO}/p/${s}`, priority: 0.5 })),
  ];
}
