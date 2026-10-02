"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabaseNavegador } from "@/lib/supabase-navegador";

/**
 * Escucha cambios de perfiles con Supabase Realtime y refresca la página (los
 * componentes del servidor se vuelven a dibujar con los datos nuevos, sin perder lo
 * que se está escribiendo). Ej.: editás en el celular y la compu se actualiza; alguien
 * se suma a tu empresa y aparece en el equipo. La RLS decide qué eventos llegan.
 * Sin la migración feria_pro (perfiles fuera de la publicación) simplemente no llega
 * nada.
 */
export default function EnVivo({
  canal,
  filtro,
  tabla = "perfiles",
}: {
  canal: string;
  filtro: string;
  /** perfiles, o empresa_miembros para el equipo de una empresa (multi_empresa). */
  tabla?: "perfiles" | "empresa_miembros";
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = supabaseNavegador();
    let espera: number | null = null;
    const suscripcion = supabase
      .channel(canal)
      .on("postgres_changes", { event: "*", schema: "public", table: tabla, filter: filtro }, () => {
        // Varios cambios juntos (autoguardado + foto) = un solo refresco.
        if (espera !== null) clearTimeout(espera);
        espera = window.setTimeout(() => {
          espera = null;
          router.refresh();
        }, 900);
      })
      .subscribe();
    return () => {
      if (espera !== null) clearTimeout(espera);
      supabase.removeChannel(suscripcion);
    };
  }, [canal, filtro, tabla, router]);

  return null;
}
