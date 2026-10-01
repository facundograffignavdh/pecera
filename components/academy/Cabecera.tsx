import Link from "next/link";

/** Encabezado de Academy con las dos secciones como pestañas (links: cada una tiene su URL). */
export default function CabeceraAcademy({ actual }: { actual: "essentials" | "docs" }) {
  const pestanas = [
    { id: "essentials", href: "/academy", label: "Startup Essentials" },
    { id: "docs", href: "/academy/docs", label: "Docs" },
  ] as const;
  return (
    <header className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-tinta/55">Academy</p>
        <h1 className="font-display text-3xl font-semibold leading-tight text-tinta text-balance">
          Aprendé. Construí. Prepará tu startup.
        </h1>
        <p className="leading-relaxed text-tinta/80">
          Lo esencial para emprender, con templates que se guardan en el Dataroom de tu empresa.
        </p>
      </div>
      <nav aria-label="Secciones de Academy" className="flex gap-1 rounded-full bg-tinta/[0.06] p-1">
        {pestanas.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            aria-current={actual === p.id ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors duration-200 ease-pecera focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
              actual === p.id ? "bg-naranja text-tinta" : "text-tinta hover:bg-tinta/5"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
