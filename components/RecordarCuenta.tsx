"use client";

import { useEffect } from "react";
import { vincularEsteDispositivo } from "@/app/cuenta/acciones";
import { type CuentaLocal, olvidarCuenta, recordarCuenta } from "@/lib/cuenta-local";
import { dispositivo } from "@/lib/dispositivo";

const CLAVE_VINCULADO = "pecera:vinculado";

/**
 * Sin UI. /cuenta lo monta con lo que leyó del servidor: con sesión guarda el dato
 * chico del perfil para la píldora y el "Editar perfil"; sin sesión lo borra. Cubre
 * el login (el callback vuelve a /cuenta) y cada guardado (la página se refresca).
 * También es el respaldo del vínculo dispositivo ↔ cuenta para las sesiones que ya
 * estaban abiertas antes de que existiera: una vez por cuenta y navegador.
 */
export default function RecordarCuenta({ cuenta }: { cuenta: CuentaLocal | null }) {
  const valor = JSON.stringify(cuenta);
  useEffect(() => {
    const actual = JSON.parse(valor) as CuentaLocal | null;
    if (actual) {
      recordarCuenta(actual);
      vincularUnaVez(actual.perfil?.slug ?? "sin-perfil");
    } else olvidarCuenta();
  }, [valor]);
  return null;
}

/** La marca guarda de qué perfil es: con otra cuenta en el mismo navegador, vuelve a vincular. */
function vincularUnaVez(slug: string) {
  try {
    if (localStorage.getItem(CLAVE_VINCULADO) === slug) return;
  } catch {
    return;
  }
  vincularEsteDispositivo(dispositivo())
    .then((ok) => {
      if (ok) localStorage.setItem(CLAVE_VINCULADO, slug);
    })
    .catch(() => {});
}
