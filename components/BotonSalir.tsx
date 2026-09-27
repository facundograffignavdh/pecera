"use client";

import { salir } from "@/app/cuenta/acciones";
import { olvidarCuenta } from "@/lib/cuenta-local";

/** Borra el dato local de la cuenta antes de cerrar la sesión en el servidor. */
export default function BotonSalir() {
  return (
    <form
      action={async () => {
        olvidarCuenta();
        await salir();
      }}
      className="border-t border-tinta/15 pt-6"
    >
      <button
        type="submit"
        className="min-h-11 w-full rounded-full border border-tinta/55 px-5 text-sm font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-arcilla hover:text-arcilla focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
