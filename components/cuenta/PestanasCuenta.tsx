import Link from "next/link";

const PESTANAS = [
  { id: "perfil", label: "Mi perfil", href: "/cuenta" },
  { id: "crm", label: "Mi CRM", href: "/cuenta/crm" },
] as const;

/** "Mi perfil | Mi CRM" arriba de /cuenta y /cuenta/crm (mismo aspecto que las de /cofundadores). */
export default function PestanasCuenta({ actual }: { actual: (typeof PESTANAS)[number]["id"] }) {
  return (
    <nav aria-label="Tu cuenta" className="mx-auto mt-2 grid max-w-md grid-cols-2 gap-1 rounded-full bg-tinta/[0.06] p-1">
      {PESTANAS.map((p) => (
        <Link
          key={p.id}
          href={p.href}
          aria-current={actual === p.id ? "page" : undefined}
          className={`boton flex min-h-11 items-center justify-center rounded-full text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla ${
            actual === p.id ? "bg-tinta text-marfil" : "text-tinta hover:bg-tinta/[0.06]"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
