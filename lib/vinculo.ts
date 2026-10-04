/**
 * Vínculo dispositivo ↔ cuenta al iniciar sesión (función `vincular_dispositivo`):
 * sirve para saber qué rol tiene quien inicia una conexión, solo en métricas
 * agregadas. NUNCA puede trabar ni romper el login: sin cookie, con error de la base
 * o si tarda, se sigue como si nada. Sin imports, para poder probarlo con Node solo
 * (scripts/pruebas/vinculo.ts).
 */

/** Cookie httpOnly que lleva el uuid del dispositivo de `entrar` al callback (10 min). */
export const COOKIE_VINCULO = "pecera-vinculo";
export const VINCULO_MAX_MS = 2000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function dispositivoValido(valor: unknown): string | null {
  return typeof valor === "string" && UUID.test(valor) ? valor : null;
}

type ClienteRpc = {
  rpc: (funcion: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
};

/** true si quedó vinculado; false ante cualquier problema. Nunca tira, nunca espera más de `maxMs`. */
export async function vincularSinFallar(
  cliente: ClienteRpc,
  dispositivo: unknown,
  maxMs = VINCULO_MAX_MS
): Promise<boolean> {
  const d = dispositivoValido(dispositivo);
  if (!d) return false;
  let reloj: ReturnType<typeof setTimeout> | undefined;
  try {
    const vencido = new Promise<null>((listo) => {
      reloj = setTimeout(() => listo(null), maxMs);
    });
    const respuesta = await Promise.race([Promise.resolve(cliente.rpc("vincular_dispositivo", { p_dispositivo: d })), vencido]);
    return !!respuesta && !respuesta.error;
  } catch {
    return false;
  } finally {
    clearTimeout(reloj);
  }
}
