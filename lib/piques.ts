import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import type { ItemFeed } from "@/types/pecera";

/**
 * Piques ("me picó"), recordados en el celular. El dispositivo se identifica con
 * un uuid al azar: nada de datos personales. Si el navegador no deja usar
 * localStorage, todo vale en memoria mientras dure la página.
 */

const CLAVE_DISPOSITIVO = "pecera:dispositivo";
const CLAVE_PIQUES = "pecera:piques";
const SIN_PIQUES: ReadonlySet<string> = new Set();

const oyentes = new Set<() => void>();
let enMemoria: ReadonlySet<string> | null = null;
let dispositivoEnMemoria: string | null = null;

/** uuid v4 a mano: `crypto.randomUUID` no existe fuera de https (ej. la IP de la LAN). */
function uuidAlAzar(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function dispositivo(): string {
  try {
    const guardado = localStorage.getItem(CLAVE_DISPOSITIVO);
    if (guardado) return guardado;
    const nuevo = dispositivoEnMemoria ?? uuidAlAzar();
    localStorage.setItem(CLAVE_DISPOSITIVO, nuevo);
    dispositivoEnMemoria = nuevo;
    return nuevo;
  } catch {
    dispositivoEnMemoria ??= uuidAlAzar();
    return dispositivoEnMemoria;
  }
}

function leerGuardados(): ReadonlySet<string> {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE_PIQUES) ?? "[]");
    return new Set(Array.isArray(valor) ? valor.filter((id) => typeof id === "string") : []);
  } catch {
    return SIN_PIQUES;
  }
}

/** Snapshot estable: el mismo Set hasta que algo cambie. */
function leer(): ReadonlySet<string> {
  enMemoria ??= leerGuardados();
  return enMemoria;
}

function guardar(mios: ReadonlySet<string>) {
  enMemoria = mios;
  try {
    localStorage.setItem(CLAVE_PIQUES, JSON.stringify([...mios]));
  } catch {
    // Sin localStorage queda en memoria.
  }
  for (const avisar of oyentes) avisar();
}

function marcar(id: string, dado: boolean) {
  const mios = new Set(leer());
  if (dado) mios.add(id);
  else mios.delete(id);
  guardar(mios);
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  // Otra pestaña dio o quitó un pique.
  const alCambiar = (e: StorageEvent) => {
    if (e.key !== CLAVE_PIQUES) return;
    enMemoria = null;
    avisar();
  };
  window.addEventListener("storage", alCambiar);
  return () => {
    oyentes.delete(avisar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function usePiques(items: ItemFeed[]) {
  const mios = useSyncExternalStore(suscribir, leer, () => SIN_PIQUES);
  const [conteos, setConteos] = useState(
    () => new Map(items.map((item) => [item.pitch.id, item.piques]))
  );
  // Por pitch, el número del último pedido: una respuesta vieja no pisa a una nueva.
  const secuencia = useRef(new Map<string, number>());
  const enVuelo = useRef(new Set<string>());

  // El ISR puede tener hasta 60 s: pedimos los conteos frescos al montar, así
  // un pique propio de antes de recargar ya figura en el número.
  useEffect(() => {
    let cancelado = false;
    supabase.rpc("conteo_piques").then(({ data, error }) => {
      if (cancelado || error) return;
      const filas = (data ?? []) as Array<{ pitch_id: string; total: number }>;
      const frescos = new Map(filas.map((fila) => [fila.pitch_id, fila.total]));
      setConteos((previos) => {
        const nuevos = new Map(previos);
        for (const id of previos.keys()) {
          if (!enVuelo.current.has(id)) nuevos.set(id, frescos.get(id) ?? 0);
        }
        return nuevos;
      });
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const fijarConteo = useCallback((id: string, cambio: (n: number) => number) => {
    setConteos((previos) => new Map(previos).set(id, cambio(previos.get(id) ?? 0)));
  }, []);

  /** Optimista: cambia al instante y confirma con el total que devuelve la base. */
  const cambiar = useCallback(
    (id: string, dar: boolean) => {
      marcar(id, dar);
      fijarConteo(id, (n) => Math.max(0, n + (dar ? 1 : -1)));

      const numero = (secuencia.current.get(id) ?? 0) + 1;
      secuencia.current.set(id, numero);
      enVuelo.current.add(id);

      supabase
        .rpc(dar ? "dar_pique" : "quitar_pique", {
          p_pitch: id,
          p_dispositivo: dispositivo(),
        })
        .then(({ data, error }) => {
          if (secuencia.current.get(id) !== numero) return;
          enVuelo.current.delete(id);
          if (error) {
            // Sin red o con el límite de frecuencia: vuelve a como estaba.
            marcar(id, !dar);
            fijarConteo(id, (n) => Math.max(0, n + (dar ? -1 : 1)));
            return;
          }
          fijarConteo(id, () => Number(data));
        });
    },
    [fijarConteo]
  );

  /** Botón de la caña. Devuelve `true` si el pique quedó dado. */
  const alternar = useCallback(
    (id: string) => {
      const dar = !leer().has(id);
      cambiar(id, dar);
      return dar;
    },
    [cambiar]
  );

  /** Doble toque: da el pique, nunca lo quita. `true` si recién se dio. */
  const dar = useCallback(
    (id: string) => {
      if (leer().has(id)) return false;
      cambiar(id, true);
      return true;
    },
    [cambiar]
  );

  return { mios, conteos, alternar, dar };
}
