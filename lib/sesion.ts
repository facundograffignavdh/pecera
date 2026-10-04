import { leerAtribucion, olvidarToqueViejo } from "@/lib/atribucion";
import { uuidAlAzar } from "@/lib/dispositivo";

/**
 * Sesión de medición: un uuid al azar que rota después de 30 minutos sin actividad.
 * Vive en localStorage (compartida entre pestañas). No identifica a nadie: sirve
 * para contar visitas y armar el embudo.
 */

const CLAVE_SESION = "pecera:sesion";
export const INACTIVIDAD_MS = 30 * 60 * 1000;

type Guardada = { id: string; ultimo: number };

let enMemoria: Guardada | null = null;

function leer(): Guardada | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_SESION) ?? "null");
    if (v && typeof v.id === "string" && typeof v.ultimo === "number") return v;
  } catch {
    // Sin localStorage: la de memoria.
  }
  return enMemoria;
}

function guardar(s: Guardada) {
  enMemoria = s;
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
  } catch {
    // Queda en memoria.
  }
}

/**
 * La sesión vigente; si venció (o no había), arranca una nueva y avisa con
 * `nueva: true` para que se registre `sesion_iniciada`. Cada llamada cuenta como
 * actividad. Lee la atribución antes, así la sesión nueva sale con su origen.
 */
export function sesionActual(): { id: string; nueva: boolean } {
  leerAtribucion();
  const ahora = Date.now();
  const previa = leer();
  if (previa && ahora - previa.ultimo < INACTIVIDAD_MS) {
    guardar({ id: previa.id, ultimo: ahora });
    return { id: previa.id, nueva: false };
  }
  olvidarToqueViejo(ahora - INACTIVIDAD_MS);
  const id = uuidAlAzar();
  guardar({ id, ultimo: ahora });
  return { id, nueva: true };
}
