"use client";

import { useState, useTransition } from "react";
import { quitarLogo, subirLogo } from "@/app/cuenta/logo";
import { Aviso, BOTON_SECUNDARIO } from "@/components/cuenta/ui";
import LogoEntidad from "@/components/LogoEntidad";
import type { Resultado } from "@/lib/errores-base";
import { achicarLogo } from "@/lib/imagen-cliente";

/**
 * Logo de la empresa en /cuenta. Se achica en el celular (PNG, conserva la
 * transparencia) y se ve en la empresa, el directorio, los portfolios y el One Pager.
 */
export default function LogoEmpresa({ nombre, logoUrl }: { nombre: string; logoUrl: string | null }) {
  const [pendiente, iniciar] = useTransition();
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setResultado(null);
    setProcesando(true);
    let blob: Blob;
    try {
      blob = await achicarLogo(archivo, 512, 400 * 1024);
    } catch {
      setProcesando(false);
      setResultado({ ok: false, mensaje: "No pudimos leer esa imagen. Probá con un PNG o JPG." });
      return;
    }
    const datos = new FormData();
    datos.set("logo", blob, "logo.png");
    iniciar(async () => {
      try {
        setResultado(await subirLogo(datos));
      } catch {
        setResultado({ ok: false, mensaje: "No pudimos subir el logo. Revisá tu conexión y probá de nuevo." });
      } finally {
        setProcesando(false);
      }
    });
  }

  const ocupado = pendiente || procesando;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <LogoEntidad nombre={nombre} logoUrl={logoUrl} tamano="xl" />
        <div className="flex flex-col gap-1.5">
          <label className={`${BOTON_SECUNDARIO} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-arcilla ${ocupado ? "pointer-events-none opacity-60" : ""}`}>
            {ocupado ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={elegir} disabled={ocupado} className="sr-only" />
          </label>
          {logoUrl && !ocupado && (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("¿Sacar el logo?")) return;
                iniciar(async () => setResultado(await quitarLogo()));
              }}
              className="self-start text-xs font-medium text-tinta underline underline-offset-4"
            >
              Sacar logo
            </button>
          )}
          <p className="text-xs text-tinta/65">PNG con fondo transparente queda mejor.</p>
        </div>
      </div>
      <p role="status" className="sr-only">{ocupado ? "Subiendo logo…" : ""}</p>
      {resultado?.mensaje && <Aviso ok={resultado.ok}>{resultado.mensaje}</Aviso>}
    </div>
  );
}
