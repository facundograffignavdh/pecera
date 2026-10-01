"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * El feed manda `?desde=<pitch.id>` para que el volver caiga en el mismo reel.
 * Sin ese dato (link compartido, entrada directa) vuelve al feed completo.
 */
export default function VolverAlFeed() {
  const desde = useSearchParams().get("desde");
  return <EnlaceVolver href={desde ? `/#${desde}` : "/"} />;
}

export function EnlaceVolver({ href, texto = "Volver al feed" }: { href: string; texto?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm text-tinta/70 transition-colors duration-200 ease-pecera hover:text-arcilla"
    >
      <span aria-hidden>&larr;</span> {texto}
    </Link>
  );
}
