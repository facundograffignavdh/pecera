"use client";

import { useEffect } from "react";
import { type CuentaLocal, olvidarCuenta, recordarCuenta } from "@/lib/cuenta-local";

/**
 * Sin UI. /cuenta lo monta con lo que leyó del servidor: con sesión guarda el dato
 * chico del perfil para la píldora y el "Editar perfil"; sin sesión lo borra. Cubre
 * el login (el callback vuelve a /cuenta) y cada guardado (la página se refresca).
 */
export default function RecordarCuenta({ cuenta }: { cuenta: CuentaLocal | null }) {
  const valor = JSON.stringify(cuenta);
  useEffect(() => {
    const actual = JSON.parse(valor) as CuentaLocal | null;
    if (actual) recordarCuenta(actual);
    else olvidarCuenta();
  }, [valor]);
  return null;
}
