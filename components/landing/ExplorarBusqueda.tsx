import Link from "next/link";
import { Seccion } from "@/components/landing/Seccion";

const SUGERENCIAS = ["fintech inversor", "agtech", "mentoría", "legal", "pre-seed"];

const RESULTADOS = [
  { tipo: "Startup", nombre: "Pagos Simples", detalle: "Fintech · Seed", color: "bg-arcilla", texto: "text-marfil", ini: "PS" },
  { tipo: "Inversor", nombre: "Inversora ángel", detalle: "Invirtió en fintech y agtech", color: "bg-inversor", texto: "text-marfil", ini: "CR" },
  { tipo: "Aliado", nombre: "Nodo Litoral", detalle: "Mentoría de go-to-market", color: "bg-aliado", texto: "text-marfil", ini: "NL" },
  { tipo: "Empresa", nombre: "Raíz Verde", detalle: "Agtech · MVP · 2 personas", color: "bg-naranja-suave", texto: "text-naranja-texto", ini: "RV" },
];

/**
 * Explorar como capa de descubrimiento, con la búsqueda de verdad: el formulario
 * va a /explorar?q=… y las sugerencias son búsquedas que el directorio entiende
 * (por industria, rol, servicio o el portfolio de cada uno). El panel de al lado
 * es un ejemplo de lo que devuelve.
 */
export default function ExplorarBusqueda() {
  return (
    <Seccion
      id="explorar"
      numero="09"
      etiqueta="Explorar"
      titulo="Encontrá a quien estás buscando."
      bajada="Startups, inversores, aliados y empresas en un mismo directorio. Los filtros de inversores y aliados miran su portfolio real: en qué invirtieron y con quién trabajaron, no solo lo que dicen."
      className="border-t border-tinta/10"
    >
      <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div data-revelar>
          <form action="/explorar" method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="landing-buscar" className="sr-only">
              Buscar en el directorio de Pecera
            </label>
            <input
              id="landing-buscar"
              name="q"
              type="search"
              maxLength={80}
              placeholder="Ej.: fintech inversor"
              className="min-h-14 w-full flex-1 rounded-full border border-tinta/30 bg-marfil px-6 text-base text-tinta placeholder:text-tinta/65 focus:outline-2 focus:outline-offset-2 focus:outline-arcilla"
            />
            <button
              type="submit"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-tinta px-7 font-semibold text-marfil transition-colors duration-[var(--duracion)] ease-pecera hover:bg-tinta/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla active:scale-[0.98]"
            >
              Buscar
            </button>
          </form>
          <p className="mt-6 text-sm font-medium text-tinta/65">Probá con:</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SUGERENCIAS.map((s) => (
              <li key={s}>
                <Link
                  href={`/explorar?q=${encodeURIComponent(s)}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-tinta/15 bg-marfil px-4 text-[15px] font-medium text-tinta transition-colors duration-[var(--duracion)] ease-pecera hover:border-naranja hover:bg-naranja-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[15px] font-semibold">
            {[
              ["startups", "Startups"],
              ["inversores", "Inversores"],
              ["aliados", "Aliados"],
            ].map(([ver, label]) => (
              <Link key={ver} href={`/explorar?ver=${ver}`} className="inline-flex min-h-11 items-center text-naranja-texto underline-offset-4 hover:underline">
                Ver {label.toLowerCase()} <span aria-hidden className="ml-1">&rarr;</span>
              </Link>
            ))}
          </p>
        </div>

        <figure data-revelar className="rounded-[var(--radius-bloque)] border border-tinta/10 bg-superficie p-3 sm:p-4">
          <div aria-hidden className="flex items-center gap-2 rounded-full bg-marfil px-4 py-3 text-[15px] text-tinta shadow-[0_1px_2px_rgb(28_27_22/0.06)]">
            <svg viewBox="0 0 20 20" className="size-4 text-tinta/50">
              <circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="m13.2 13.2 3.8 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            fintech
          </div>
          <ul aria-label="Ejemplo de resultados" className="mt-3 flex flex-col gap-2">
            {RESULTADOS.map((r) => (
              <li key={r.nombre} className="flex items-center gap-3 rounded-2xl bg-marfil px-3.5 py-3">
                <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-semibold ${r.color} ${r.texto}`}>
                  {r.ini}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-tight">{r.nombre}</span>
                  <span className="block truncate text-sm text-tinta/65">{r.detalle}</span>
                </span>
                <span className="rounded-full border border-tinta/15 px-2.5 py-0.5 text-xs font-semibold text-tinta/75">{r.tipo}</span>
              </li>
            ))}
          </ul>
          <figcaption className="mt-3 text-center text-xs text-tinta/65">Resultados de ejemplo</figcaption>
        </figure>
      </div>
    </Seccion>
  );
}
