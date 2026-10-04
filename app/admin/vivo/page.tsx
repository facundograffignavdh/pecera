import type { Metadata } from "next";
import Link from "next/link";
import Vivo from "@/components/admin/Vivo";
import { supabaseConSesion } from "@/lib/supabase-servidor";

export const metadata: Metadata = {
  title: "En vivo — Pecera",
  robots: { index: false, follow: false },
};

/**
 * Pantalla del stand: conexiones iniciadas de hoy y un ticker anónimo, leídos desde
 * el cliente cada 15 s (no ISR). Solo agregados. Entra quien esté en `admins`.
 */
export default async function VivoPage() {
  const supabase = await supabaseConSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: esAdmin } = user ? await supabase.rpc("es_admin") : { data: false };

  if (!esAdmin) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-marfil px-6 text-center text-tinta">
        <p className="max-w-sm leading-relaxed">Esta pantalla es del equipo. Entrá desde el panel con tu cuenta.</p>
        <Link href="/admin" className="font-semibold underline underline-offset-4">
          Ir al panel
        </Link>
      </main>
    );
  }
  return <Vivo />;
}
