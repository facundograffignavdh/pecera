/**
 * Identificador anónimo del celular: un uuid al azar en localStorage, sin datos
 * personales. Lo usan los piques y la medición de vistas y contactos. Si el
 * navegador no deja usar localStorage, vale en memoria mientras dure la página.
 */

const CLAVE_DISPOSITIVO = "pecera:dispositivo";
let dispositivoEnMemoria: string | null = null;

/** uuid v4 a mano: `crypto.randomUUID` no existe fuera de https (ej. la IP de la LAN). */
export function uuidAlAzar(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function dispositivo(): string {
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
