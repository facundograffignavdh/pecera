/**
 * Traspaso de la sesión (función `acreditar_traspaso`): al entrar con Google desde la pared de
 * pitches, con la casilla "Mostrar que visité y di pique" tildada, se acredita lo que ESA visita
 * hizo antes de entrar (perfiles abiertos, pitches vistos 3 s y piques), nada del historial del
 * navegador. La lista la lleva el navegador (sessionStorage, solo desde que existe esto) y la base
 * la valida. NUNCA traba ni cambia el login. Sin imports, para probarlo con Node solo
 * (scripts/pruebas/traspaso.ts).
 */

/** Cookie httpOnly que lleva la lista de `entrar` al callback (10 min, como la del vínculo). */
export const COOKIE_TRASPASO = "pecera-traspaso";
export const TRASPASO_MAX_MS = 2000;
/** Tope por tipo y antigüedad máxima (la base también limita a 10). */
export const TRASPASO_TOPE = 10;
export const TRASPASO_VENTANA_MS = 6 * 60 * 60 * 1000;

export type TipoTraspaso = "perfiles" | "pitches" | "piques";
type Marca = { id: string; ts: number };
export type RegistroSesion = Record<TipoTraspaso, Marca[]>;
export type ListaTraspaso = { mostrar: boolean } & Record<TipoTraspaso, string[]>;

const TIPOS: TipoTraspaso[] = ["perfiles", "pitches", "piques"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Lo que se guarda por tipo en la sesión (después se recorta a 10 y 6 h). */
const TOPE_REGISTRO = 30;

export function registroVacio(): RegistroSesion {
  return { perfiles: [], pitches: [], piques: [] };
}

/** Lee lo guardado; lo roto se descarta. */
export function leerRegistro(guardado: unknown): RegistroSesion {
  const g = (guardado ?? {}) as Partial<Record<TipoTraspaso, unknown>>;
  const r = registroVacio();
  for (const t of TIPOS) {
    const v = g[t];
    if (Array.isArray(v)) {
      r[t] = v.filter((m): m is Marca => !!m && typeof m.id === "string" && UUID.test(m.id) && typeof m.ts === "number");
    }
  }
  return r;
}

/** Anota (o refresca la hora de) un elemento. */
export function anotar(r: RegistroSesion, tipo: TipoTraspaso, id: string, ahora: number): RegistroSesion {
  if (!UUID.test(id)) return r;
  return { ...r, [tipo]: [...r[tipo].filter((m) => m.id !== id), { id, ts: ahora }].slice(-TOPE_REGISTRO) };
}

export function quitar(r: RegistroSesion, tipo: TipoTraspaso, id: string): RegistroSesion {
  return { ...r, [tipo]: r[tipo].filter((m) => m.id !== id) };
}

/** Lo que se manda: de las últimas 6 h, los 10 más recientes por tipo. */
export function armarLista(r: RegistroSesion, mostrar: boolean, ahora: number): ListaTraspaso {
  const recientes = (t: TipoTraspaso) =>
    r[t]
      .filter((m) => m.ts <= ahora && ahora - m.ts <= TRASPASO_VENTANA_MS)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, TRASPASO_TOPE)
      .map((m) => m.id);
  return { mostrar, perfiles: recientes("perfiles"), pitches: recientes("pitches"), piques: recientes("piques") };
}

/** Valida lo que llega del form o de la cookie. null si no sirve. */
export function leerTraspaso(valor: unknown): ListaTraspaso | null {
  if (typeof valor !== "string" || valor.length > 4000) return null;
  try {
    const x = JSON.parse(valor) as Partial<ListaTraspaso>;
    if (typeof x.mostrar !== "boolean") return null;
    const ids = (v: unknown) =>
      Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === "string" && UUID.test(s)))].slice(0, TRASPASO_TOPE) : [];
    return { mostrar: x.mostrar, perfiles: ids(x.perfiles), pitches: ids(x.pitches), piques: ids(x.piques) };
  } catch {
    return null;
  }
}

type ClienteRpc = {
  rpc: (funcion: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
};

/** true si la base lo recibió; false ante cualquier problema. Nunca tira, nunca espera más de `maxMs`. */
export async function acreditarSinFallar(
  cliente: ClienteRpc,
  valor: unknown,
  version: string,
  maxMs = TRASPASO_MAX_MS
): Promise<boolean> {
  const lista = leerTraspaso(valor);
  if (!lista) return false;
  let reloj: ReturnType<typeof setTimeout> | undefined;
  try {
    const vencido = new Promise<null>((listo) => {
      reloj = setTimeout(() => listo(null), maxMs);
    });
    const respuesta = await Promise.race([
      Promise.resolve(
        cliente.rpc("acreditar_traspaso", {
          p_version: version,
          p_mostrar: lista.mostrar,
          p_perfiles: lista.perfiles,
          p_pitches: lista.pitches,
          p_piques: lista.piques,
        })
      ),
      vencido,
    ]);
    return !!respuesta && !respuesta.error;
  } catch {
    return false;
  } finally {
    clearTimeout(reloj);
  }
}
