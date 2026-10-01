/**
 * Producto / Servicio de una empresa. Límites espejo EXACTO de los CHECK de
 * `empresa_productos` (migración pitch_build_producto_newsletter).
 */

export const TIPOS_PRODUCTO = [
  { valor: "producto", label: "Producto" },
  { valor: "servicio", label: "Servicio" },
] as const;
export type TipoProducto = (typeof TIPOS_PRODUCTO)[number]["valor"];

export const LIMITES_PRODUCTO = {
  nombre: 80,
  propuesta: 140,
  problema: 400,
  solucion: 400,
  para_quien: 280,
  como_usar: 400,
  demo_url: 300,
  caracteristica: 80,
  caracteristicas: 6,
  imagenes: 4,
} as const;

export type Producto = {
  tipo: TipoProducto;
  nombre: string;
  propuesta: string;
  problema: string | null;
  solucion: string | null;
  para_quien: string | null;
  caracteristicas: string[];
  como_usar: string | null;
  demo_url: string | null;
  /** Claves de R2 en la base; URLs listas cuando sale de lib/datos.ts. */
  imagenes: string[];
};

export function esTipoProducto(valor: string): valor is TipoProducto {
  return TIPOS_PRODUCTO.some((t) => t.valor === valor);
}

/** Lado mayor de las imágenes del producto, achicadas en el celular. */
export const LADO_IMAGEN_PRODUCTO = 1280;
export const MAX_BYTES_IMAGEN_PRODUCTO = 600 * 1024;
