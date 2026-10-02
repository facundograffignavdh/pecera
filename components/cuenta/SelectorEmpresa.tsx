import Link from "next/link";
import { LogoEmpresa } from "@/components/perfil/Bloques";
import { conEmpresa } from "@/lib/cuenta";

type Opcion = { id: string; slug: string; nombre: string; logo_url?: string | null; es_principal: boolean };

/**
 * "Trabajando en": con qué empresa se trabaja en esta pantalla (multi_empresa). Son
 * links a la misma página con otro `?empresa=`, así cada pestaña queda en la suya.
 * Con una sola empresa no se dibuja: se ve igual que siempre.
 */
export default function SelectorEmpresa({
  empresas,
  actual,
  ruta,
}: {
  empresas: Opcion[];
  actual: string;
  /** La página a la que lleva cada chip (con su #ancla, si hace falta). */
  ruta: string;
}) {
  if (empresas.length < 2) return null;
  return (
    <nav aria-label="Empresa con la que trabajás" className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tinta/65">Trabajando en</p>
      <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {empresas.map((e) => {
          const activa = e.id === actual;
          return (
            <li key={e.id} className="shrink-0">
              <Link
                href={conEmpresa(ruta, e.slug)}
                aria-current={activa ? "page" : undefined}
                className={`boton flex min-h-11 max-w-[14rem] items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
                  activa ? "bg-tinta text-marfil" : "border border-tinta/25 text-tinta hover:border-tinta"
                }`}
              >
                <LogoEmpresa nombre={e.nombre} logo={e.logo_url ?? null} size={28} />
                <span className="truncate">{e.nombre}</span>
                {e.es_principal && <span className="sr-only"> (principal)</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
