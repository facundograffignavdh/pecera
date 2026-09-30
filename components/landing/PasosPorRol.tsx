"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

type Paso = { titulo: string; texto: string };

/**
 * "Cómo funciona" con pestañas por rol. Los números se encienden en cascada
 * la primera vez que la lista entra en pantalla y en cada cambio de pestaña.
 */
export default function PasosPorRol({
  roles,
}: {
  roles: { nombre: string; pasos: Paso[] }[];
}) {
  const [activo, setActivo] = useState(0);
  const [animando, setAnimando] = useState(false);
  const lista = useRef<HTMLOListElement>(null);
  const pestanas = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  useEffect(() => {
    const el = lista.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setAnimando(true);
        observer.disconnect();
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Los <li> llevan el rol en la key: cambiar de pestaña monta ítems nuevos
  // y sus keyframes corren solos.
  function elegir(i: number) {
    setActivo(i);
    setAnimando(true);
  }

  function alTeclear(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const siguiente = (i + (e.key === "ArrowRight" ? 1 : roles.length - 1)) % roles.length;
    pestanas.current[siguiente]?.focus();
    elegir(siguiente);
  }

  return (
    <div className="mt-10">
      <div
        role="tablist"
        aria-label="Elegí tu rol"
        className="inline-grid grid-cols-2 gap-1.5 rounded-full border border-tinta/15 bg-marfil p-1.5"
      >
        {roles.map((r, i) => (
          <button
            key={r.nombre}
            ref={(el) => {
              pestanas.current[i] = el;
            }}
            id={`${base}-tab-${i}`}
            role="tab"
            type="button"
            aria-selected={i === activo}
            aria-controls={`${base}-panel`}
            tabIndex={i === activo ? 0 : -1}
            onClick={() => elegir(i)}
            onKeyDown={(e) => alTeclear(e, i)}
            className={`min-h-11 rounded-full px-4 text-[15px] font-semibold transition-colors duration-200 ease-pecera sm:px-7 ${
              i === activo ? "bg-tinta text-marfil" : "text-tinta/75 hover:text-tinta"
            }`}
          >
            {r.nombre}
          </button>
        ))}
      </div>

      <ol
        ref={lista}
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${activo}`}
        data-anim={animando || undefined}
        className="pasos mt-10 max-w-3xl"
      >
        {roles[activo].pasos.map((p, i) => (
          <li
            key={`${activo}-${p.titulo}`}
            style={{ "--i": i } as CSSProperties}
            className="paso relative pb-8 pl-16 last:pb-0"
          >
            <span
              aria-hidden
              className="paso-num absolute left-0 top-[-0.2rem] grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-arcilla bg-arcilla font-display text-xl font-bold text-marfil"
            >
              {i + 1}
            </span>
            {i < roles[activo].pasos.length - 1 && (
              <span aria-hidden className="absolute bottom-1 left-[1.35rem] top-11 w-[1.5px] bg-tinta/15" />
            )}
            <h3 className="font-display text-2xl font-semibold">{p.titulo}</h3>
            <p className="mt-1 max-w-[54ch] leading-relaxed text-tinta/80">{p.texto}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
