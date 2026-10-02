"use client";

import { createContext, useContext } from "react";
import { conEmpresa } from "@/lib/cuenta";

/**
 * La empresa con la que se trabaja en esta pantalla de /cuenta (multi_empresa). La
 * pone la página del servidor; los forms la mandan como `empresa_id` y los links la
 * llevan en `?empresa=`. Sin proveedor (base sin multi_empresa), null: las actions
 * usan la única empresa.
 */
type Actual = { id: string; slug: string } | null;

const Contexto = createContext<Actual>(null);

export function EmpresaActual({ empresa, children }: { empresa: Actual; children: React.ReactNode }) {
  return <Contexto value={empresa}>{children}</Contexto>;
}

export function useEmpresaActual(): Actual {
  return useContext(Contexto);
}

/** Id de la empresa actual (o "" sin proveedor), para pasar a las actions. */
export function useEmpresaId(): string {
  return useContext(Contexto)?.id ?? "";
}

/** La ruta con la empresa actual. */
export function useConEmpresa(): (href: string) => string {
  const actual = useContext(Contexto);
  return (href) => conEmpresa(href, actual?.slug);
}

/** El campo oculto `empresa_id` de los forms. */
export function CampoEmpresa() {
  const id = useEmpresaId();
  return <input type="hidden" name="empresa_id" value={id} />;
}
