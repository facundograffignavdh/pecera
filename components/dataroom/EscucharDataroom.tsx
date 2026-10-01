"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Cambios del equipo en vivo (Supabase Realtime): si otro miembro guarda, archiva o
 * cambia la visibilidad de un documento, la página se actualiza sola. La política
 * de miembros decide qué eventos llegan. Si Realtime no está, la página anda igual.
 */
export default function EscucharDataroom({ empresaId }: { empresaId: string }) {
  const router = useRouter();

  useEffect(() => {
    const cliente = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    let espera: ReturnType<typeof setTimeout> | undefined;
    const canal = cliente
      .channel(`dataroom-${empresaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "empresa_documentos", filter: `empresa_id=eq.${empresaId}` },
        () => {
          clearTimeout(espera);
          espera = setTimeout(() => router.refresh(), 800);
        }
      )
      .subscribe();
    return () => {
      clearTimeout(espera);
      void cliente.removeChannel(canal);
    };
  }, [empresaId, router]);

  return null;
}
