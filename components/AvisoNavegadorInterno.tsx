"use client";

import { useState, useSyncExternalStore } from "react";

const sinCambios = () => () => {};

/** Navegadores internos de redes sociales: Google no deja iniciar sesión ahí. */
const INTERNO = /(Instagram|FBAN|FBAV|LinkedInApp|Line\/|TikTok|musical_ly|Twitter|Snapchat)/i;

function appDe(ua: string): string {
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/LinkedInApp/i.test(ua)) return "LinkedIn";
  if (/TikTok|musical_ly/i.test(ua)) return "TikTok";
  return "esta app";
}

/** Si la página corre en el navegador interno de una red (en el servidor y al hidratar, no). */
export function useNavegadorInterno(): boolean {
  const ua = useSyncExternalStore(sinCambios, () => navigator.userAgent, () => "");
  return INTERNO.test(ua);
}

/**
 * Google bloquea el login dentro del navegador de Instagram, LinkedIn y otras apps
 * ("disallowed_useragent"). Si la persona llegó por un link en una red, se lo
 * avisamos antes de que toque "Entrar con Google" y le damos el link para abrirlo
 * en Chrome o Safari.
 */
export default function AvisoNavegadorInterno({ id }: { id?: string } = {}) {
  const ua = useSyncExternalStore(sinCambios, () => navigator.userAgent, () => "");
  const [copiado, setCopiado] = useState(false);
  if (!INTERNO.test(ua)) return null;
  const esIos = /iphone|ipad|ipod/i.test(ua);

  return (
    <div id={id} tabIndex={id ? -1 : undefined} role="alert" className="flex flex-col gap-2 rounded-2xl border-2 border-arcilla bg-t-arcilla-suave/50 px-4 py-3 text-sm text-tinta">
      <p className="font-semibold">Abrí Pecera en {esIos ? "Safari" : "Chrome"} para entrar</p>
      <p>
        Estás en el navegador de {appDe(ua)} y Google no deja iniciar sesión acá. Tocá el menú (⋯ o ⋮) y elegí «Abrir en
        el navegador», o copiá el link.
      </p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiado(true);
          } catch {
            window.prompt("Copiá el link:", window.location.href);
          }
        }}
        className="boton self-start rounded-full bg-tinta px-4 py-2 font-medium text-marfil"
      >
        {copiado ? "¡Link copiado!" : "Copiar el link"}
      </button>
    </div>
  );
}
