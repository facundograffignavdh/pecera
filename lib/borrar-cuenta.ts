/**
 * Eliminar la cuenta: la palabra que confirma (se valida en el cliente y en la
 * action) y la limpieza del navegador después de borrar. El borrado en sí es la
 * función `borrar_mi_cuenta` de la base.
 *
 * Sin "use client" ni imports de cliente: la action usa `confirmaBorrado`.
 */

export const PALABRA_CONFIRMAR = "ELIMINAR";

/** En el celular el teclado puede poner mayúscula solo a la primera: da igual. */
export function confirmaBorrado(texto: string): boolean {
  return texto.trim().toUpperCase() === PALABRA_CONFIRMAR;
}

/** Preferencias del navegador, no datos de la persona: se quedan. */
const SE_QUEDAN = new Set(["pecera:tema", "pecera:subtitulos"]);

/**
 * Borra lo que Pecera guardó en este navegador: la cuenta local (`pecera:cuenta`,
 * con la foto de la píldora), borradores, piques, Mi red, vistas y el uuid del
 * dispositivo. Después se recarga la página entera: nada queda en memoria.
 */
export function limpiarNavegador(): void {
  try {
    const claves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const clave = localStorage.key(i);
      if (clave?.startsWith("pecera:") && !SE_QUEDAN.has(clave)) claves.push(clave);
    }
    for (const clave of claves) localStorage.removeItem(clave);
  } catch {
    // Sin localStorage no hay nada guardado.
  }
  // De la pestaña: el origen de la visita (atribución) y la medición de la sesión.
  try {
    const claves: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const clave = sessionStorage.key(i);
      if (clave?.startsWith("pecera:") && clave !== AVISO_CUENTA_ELIMINADA) claves.push(clave);
    }
    for (const clave of claves) sessionStorage.removeItem(clave);
  } catch {
    // Sin sessionStorage no hay nada guardado.
  }
}

/** Aviso que se muestra una vez al llegar al inicio después de borrar. */
export const AVISO_CUENTA_ELIMINADA = "pecera:cuenta-eliminada";

export function marcarAvisoEliminada(): void {
  try {
    sessionStorage.setItem(AVISO_CUENTA_ELIMINADA, "1");
  } catch {
    // Sin sessionStorage no hay aviso; la cuenta igual se borró.
  }
}
