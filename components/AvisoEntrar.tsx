"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { dispositivo } from "@/lib/dispositivo";

const sinCambios = () => () => {};

/**
 * Va adentro de cada form de "Entrar con Google": manda el uuid anónimo de este
 * navegador (campo oculto `dispositivo`, ver `entrar`) y avisa para qué se usa
 * (Ley 25.326, art. 6). `tono="oscuro"` sobre fondos Tinta.
 */
export default function AvisoEntrar({ tono = "claro" }: { tono?: "claro" | "oscuro" }) {
  const valor = useSyncExternalStore(sinCambios, dispositivo, () => "");
  return (
    <>
      <input type="hidden" name="dispositivo" value={valor} />
      <p className={`text-xs leading-relaxed ${tono === "oscuro" ? "text-marfil/85" : "text-tinta/70"}`}>
        Al entrar, unimos este navegador con tu cuenta para saber qué tipo de perfil inicia conexiones. Solo se usa en
        métricas agregadas: nunca mostramos quién contactó a quién.{" "}
        <Link href="/privacidad#medicion" target="_blank" className="underline underline-offset-2">
          Más en Privacidad
        </Link>
        .
      </p>
    </>
  );
}
