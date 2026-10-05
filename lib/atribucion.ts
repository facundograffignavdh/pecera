/**
 * De dónde llegó la persona, sin cookies de terceros, IP ni geolocalización. Las
 * tarjetas NFC del stand se graban con `/p/<slug>?src=nfc&t=s16` (número de stand) y
 * los links de campaña con `utm_source`, `utm_medium` y `utm_campaign`.
 *   - first-touch: el primer origen de este navegador (localStorage, no se pisa)
 *   - last-touch:  el último origen de esta pestaña (sessionStorage)
 * Los parámetros se sacan de la URL apenas se leen (`?equipo=1` también: marca el
 * dispositivo como del equipo, ver Medicion).
 */

export type Toque = {
  fuente: string | null;
  medio: string | null;
  campania: string | null;
  tarjeta: string | null;
  /** ms epoch */
  ts: number;
};

const CLAVE_PRIMERO = "pecera:origen-primero";
const CLAVE_ULTIMO = "pecera:origen";
const PARAMETROS = ["src", "t", "utm_source", "utm_medium", "utm_campaign", "equipo"];

/** Mismo formato que exige la base (`^[a-z0-9_.-]{1,40}$`); lo que no entra, vacío. */
export function normalizar(valor: string | null): string | null {
  if (!valor) return null;
  const limpio = valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return limpio || null;
}

/** El número de stand: s + número (s16). Cualquier otra cosa no es una tarjeta. */
export function tarjetaValida(valor: string | null): string | null {
  const t = valor?.trim().toLowerCase() ?? "";
  return /^s[0-9]{1,4}$/.test(t) ? t : null;
}

function leerJson<T>(almacen: Storage, clave: string): T | null {
  try {
    const v = JSON.parse(almacen.getItem(clave) ?? "null");
    return v && typeof v === "object" ? (v as T) : null;
  } catch {
    return null;
  }
}

function escribirJson(almacen: Storage, clave: string, valor: unknown) {
  try {
    almacen.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento: se pierde la atribución, nada más.
  }
}

/** Lo que trajo esta carga de página (si trajo algo), para el perfil que la recibe. */
let llegada: (Toque & { ruta: string }) | null = null;
let equipoPedido = false;

/**
 * Lee los parámetros de la URL actual, guarda el origen y los saca de la URL. Se
 * puede llamar muchas veces: después de la primera ya no hay nada que leer.
 */
export function leerAtribucion() {
  if (typeof window === "undefined") return;
  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    return;
  }
  if (!PARAMETROS.some((p) => url.searchParams.has(p))) return;

  const q = url.searchParams;
  const fuente = normalizar(q.get("src") ?? q.get("utm_source"));
  if (q.get("equipo") === "1") equipoPedido = true;

  if (fuente) {
    const toque: Toque = {
      fuente,
      medio: normalizar(q.get("utm_medium")),
      campania: normalizar(q.get("utm_campaign")),
      tarjeta: fuente === "nfc" ? tarjetaValida(q.get("t")) : null,
      ts: Date.now(),
    };
    try {
      escribirJson(window.sessionStorage, CLAVE_ULTIMO, toque);
      if (!leerJson<Toque>(window.localStorage, CLAVE_PRIMERO)) {
        escribirJson(window.localStorage, CLAVE_PRIMERO, toque);
      }
    } catch {
      // Navegador sin almacenamiento.
    }
    llegada = { ...toque, ruta: url.pathname };
  }

  for (const p of PARAMETROS) q.delete(p);
  try {
    window.history.replaceState(null, "", `${url.pathname}${q.size ? `?${q}` : ""}${url.hash}`);
  } catch {
    // Si no se puede reescribir, los parámetros quedan a la vista; no pasa nada más.
  }
}

/** El origen con el que llegó esta página, una sola vez y solo para esa ruta. */
export function tomarLlegada(ruta: string): Toque | null {
  leerAtribucion();
  if (!llegada || llegada.ruta !== ruta) return null;
  const t = llegada;
  llegada = null;
  return t;
}

/** ¿La URL traía `?equipo=1`? Se responde una sola vez. */
export function tomarEquipo(): boolean {
  leerAtribucion();
  const pedido = equipoPedido;
  equipoPedido = false;
  return pedido;
}

export function ultimoToque(): Toque | null {
  try {
    return leerJson<Toque>(window.sessionStorage, CLAVE_ULTIMO);
  } catch {
    return null;
  }
}

export function primerToque(): Toque | null {
  try {
    return leerJson<Toque>(window.localStorage, CLAVE_PRIMERO);
  } catch {
    return null;
  }
}

/** Al empezar una sesión nueva, un last-touch viejo ya no explica esta visita. */
export function olvidarToqueViejo(antesDe: number) {
  const t = ultimoToque();
  if (!t || t.ts >= antesDe) return;
  try {
    window.sessionStorage.removeItem(CLAVE_ULTIMO);
  } catch {
    // Nada que borrar.
  }
}
