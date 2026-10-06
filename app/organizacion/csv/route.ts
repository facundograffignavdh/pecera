import { type NextRequest, NextResponse } from "next/server";
import { EVENTO_ACTUAL } from "@/lib/eventos";
import { labelComo } from "@/lib/etiquetas";
import { labelsNecesidad, type PanelOrganizacion } from "@/lib/organizacion";
import { ROLES } from "@/lib/rol";
import { supabaseConSesion } from "@/lib/supabase-servidor";
import type { Rol } from "@/types/pecera";

/**
 * CSV del panel de la organización: SOLO quienes aceptaron compartir (la base decide quién
 * puede bajarlo: emails habilitados y admins). Perfil público y lo que buscan y ofrecen; nada
 * de contacto privado, mensajes ni quién con quién.
 */

const COLUMNAS = [
  "nombre",
  "perfil",
  "rol",
  "empresas",
  "ubicacion",
  "descripcion",
  "busca",
  "busca_detalle",
  "busca_como",
  "ofrece",
  "ofrece_detalle",
  "ofrece_como",
  "anotado_en_la_feria",
  "acepto_compartir",
] as const;

/** Celda segura: comillas cuando hace falta y nada que una planilla pueda tomar como fórmula. */
function celda(v: unknown) {
  let t = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
}

export async function GET(request: NextRequest) {
  const supabase = await supabaseConSesion();
  const { data, error } = await supabase.rpc("organizacion_networking", { p_evento: EVENTO_ACTUAL.slug });
  if (error) return new NextResponse("No autorizado o sin datos.", { status: error.code === "42501" ? 403 : 500 });

  const sitio = (process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).replace(/\/+$/, "");
  const como = (l: string[]) => l.map((c) => labelComo(c).toLowerCase()).join(" · ");
  const filas = (data as PanelOrganizacion).consentidos.map((c) => ({
    nombre: c.nombre,
    perfil: `${sitio}/p/${c.slug}`,
    rol: ROLES[c.rol as Rol]?.label ?? c.rol,
    empresas: c.empresas ?? "",
    ubicacion: c.ubicacion ?? "",
    descripcion: c.descripcion,
    busca: labelsNecesidad(c.busca),
    busca_detalle: c.busca_detalle.join(" · "),
    busca_como: como(c.busca_como),
    ofrece: labelsNecesidad(c.ofrece),
    ofrece_detalle: c.ofrece_detalle.join(" · "),
    ofrece_como: como(c.ofrece_como),
    anotado_en_la_feria: c.participa ? "sí" : "no",
    acepto_compartir: c.acepto_at,
  }));

  const cuerpo = [COLUMNAS.join(","), ...filas.map((f) => COLUMNAS.map((k) => celda(f[k])).join(","))].join("\n") + "\n";
  // BOM: Excel abre bien las tildes.
  return new NextResponse(`﻿${cuerpo}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="feria21-networking.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
