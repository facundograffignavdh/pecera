"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { guardarProducto, quitarImagenProducto, subirImagenProducto } from "@/app/cuenta/producto";
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import type { Resultado } from "@/lib/errores-base";
import { achicarImagen } from "@/lib/imagen-cliente";
import {
  LADO_IMAGEN_PRODUCTO,
  LIMITES_PRODUCTO,
  MAX_BYTES_IMAGEN_PRODUCTO,
  type Producto,
  TIPOS_PRODUCTO,
} from "@/lib/producto";

const INICIAL: Resultado = { ok: false };

export type ImagenPropia = { clave: string; url: string };

/**
 * Producto / Servicio en /cuenta. Primero lo esencial (qué es y para quién, en una
 * línea); el brief completo y las imágenes, a un toque. Es lo que lee primero quien
 * llega a la página de la empresa y la base del One Pager.
 */
export default function TarjetaProducto({
  producto,
  imagenes,
  slugEmpresa,
}: {
  producto: Producto | null;
  imagenes: ImagenPropia[];
  slugEmpresa: string;
}) {
  const [estado, accion, pendiente] = useActionState(guardarProducto, INICIAL);
  const [caracteristicas, setCaracteristicas] = useState<string[]>(
    producto?.caracteristicas.length ? producto.caracteristicas : [""]
  );
  const conBrief = !!(producto?.problema || producto?.solucion || producto?.para_quien || producto?.como_usar);

  return (
    <Tarjeta
      titulo="Producto o servicio"
      etiqueta="Público"
      bajada="Qué ofrece tu empresa, claro y en concreto. Es lo primero que lee un inversor o un cliente en la página de la empresa."
    >
      <form action={accion} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-tinta">¿Qué ofrecen?</legend>
          <div className="flex gap-2">
            {TIPOS_PRODUCTO.map((t) => (
              <label
                key={t.valor}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 border-tinta/20 px-4 text-sm font-medium text-tinta has-[:checked]:border-tinta has-[:checked]:bg-tinta has-[:checked]:text-marfil has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla"
              >
                <input
                  type="radio"
                  name="tipo"
                  value={t.valor}
                  defaultChecked={(producto?.tipo ?? "producto") === t.valor}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Campo id="prod-nombre" label="Nombre" max={LIMITES_PRODUCTO.nombre}>
          <input
            id="prod-nombre"
            name="nombre"
            required
            maxLength={LIMITES_PRODUCTO.nombre}
            defaultValue={producto?.nombre ?? ""}
            placeholder="Ej.: Sustrato Raíz"
            autoComplete="off"
            className={INPUT}
          />
        </Campo>

        <Campo
          id="prod-propuesta"
          label="En una línea: qué es y para quién"
          max={LIMITES_PRODUCTO.propuesta}
          ayuda="Es el titular de la sección. Sin jerga: que lo entienda alguien de otra industria."
        >
          <textarea
            id="prod-propuesta"
            name="propuesta"
            required
            rows={2}
            maxLength={LIMITES_PRODUCTO.propuesta}
            defaultValue={producto?.propuesta ?? ""}
            placeholder="Ej.: Sustrato con borra de café para huertas de balcón, listo para plantar."
            className={INPUT}
          />
        </Campo>

        <details open={conBrief} className="group rounded-2xl border border-tinta/15 bg-marfil">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-tinta [&::-webkit-details-marker]:hidden">
            Brief: problema, solución y para quién
            <span aria-hidden className="text-xl transition-transform duration-300 ease-pecera group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-tinta/10 p-4">
            <Campo id="prod-problema" label="¿Qué problema resuelve?" max={LIMITES_PRODUCTO.problema}>
              <textarea id="prod-problema" name="problema" rows={3} maxLength={LIMITES_PRODUCTO.problema} defaultValue={producto?.problema ?? ""} className={INPUT} />
            </Campo>
            <Campo id="prod-solucion" label="¿Cómo funciona?" max={LIMITES_PRODUCTO.solucion}>
              <textarea id="prod-solucion" name="solucion" rows={3} maxLength={LIMITES_PRODUCTO.solucion} defaultValue={producto?.solucion ?? ""} className={INPUT} />
            </Campo>
            <Campo id="prod-para-quien" label="¿Para quién es?" max={LIMITES_PRODUCTO.para_quien}>
              <textarea id="prod-para-quien" name="para_quien" rows={2} maxLength={LIMITES_PRODUCTO.para_quien} defaultValue={producto?.para_quien ?? ""} className={INPUT} />
            </Campo>
            <Campo id="prod-como-usar" label="¿Cómo se usa o se contrata?" max={LIMITES_PRODUCTO.como_usar}>
              <textarea id="prod-como-usar" name="como_usar" rows={3} maxLength={LIMITES_PRODUCTO.como_usar} defaultValue={producto?.como_usar ?? ""} className={INPUT} />
            </Campo>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-tinta">Características principales</legend>
              <p className="text-xs text-tinta/70">Hasta {LIMITES_PRODUCTO.caracteristicas}, cortas. Las vacías no se guardan.</p>
              {caracteristicas.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    name="caracteristicas"
                    aria-label={`Característica ${i + 1}`}
                    maxLength={LIMITES_PRODUCTO.caracteristica}
                    value={c}
                    onChange={(e) =>
                      setCaracteristicas((cs) => cs.map((x, j) => (j === i ? e.target.value : x)))
                    }
                    placeholder={i === 0 ? "Ej.: Entrega en 48 h" : ""}
                    autoComplete="off"
                    className={INPUT}
                  />
                  {caracteristicas.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Quitar característica ${i + 1}`}
                      onClick={() => setCaracteristicas((cs) => cs.filter((_, j) => j !== i))}
                      className={`${BOTON_SECUNDARIO} min-w-11 px-0`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {caracteristicas.length < LIMITES_PRODUCTO.caracteristicas && (
                <button
                  type="button"
                  onClick={() => setCaracteristicas((cs) => [...cs, ""])}
                  className={`${BOTON_SECUNDARIO} self-start`}
                >
                  + Sumar característica
                </button>
              )}
            </fieldset>

            <Campo id="prod-demo" label="Link a una demo o video (opcional)" ayuda="Tiene que empezar con https://">
              <input
                id="prod-demo"
                name="demo_url"
                type="url"
                inputMode="url"
                maxLength={LIMITES_PRODUCTO.demo_url}
                defaultValue={producto?.demo_url ?? ""}
                placeholder="https://…"
                autoComplete="off"
                spellCheck={false}
                className={INPUT}
              />
            </Campo>
          </div>
        </details>

        <button type="submit" disabled={pendiente} className={`${BOTON_PRIMARIO} self-start`}>
          {pendiente ? "Guardando…" : producto ? "Guardar cambios" : "Guardar producto"}
        </button>
        {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
      </form>

      {producto ? (
        <Imagenes imagenes={imagenes} />
      ) : (
        <p className="text-sm text-tinta/70">Cuando lo guardes, vas a poder sumar imágenes y capturas.</p>
      )}

      {producto && (
        <a
          href={`/e/${slugEmpresa}/one-pager`}
          target="_blank"
          rel="noopener"
          className={`${BOTON_SECUNDARIO} self-start`}
        >
          Ver el One Pager
        </a>
      )}
    </Tarjeta>
  );
}

function Campo({
  id,
  label,
  max,
  ayuda,
  children,
}: {
  id: string;
  label: string;
  max?: number;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-tinta">
        {label}
        {max && <span className="text-xs font-normal text-tinta/60">hasta {max}</span>}
      </label>
      {children}
      {ayuda && <p className="text-xs text-tinta/70">{ayuda}</p>}
    </div>
  );
}

/** Hasta 4 imágenes. Se achican en el celular y se suben de a una, con su estado. */
function Imagenes({ imagenes }: { imagenes: ImagenPropia[] }) {
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setResultado(null);
    setSubiendo(true);
    let blob: Blob;
    try {
      blob = await achicarImagen(archivo, LADO_IMAGEN_PRODUCTO, MAX_BYTES_IMAGEN_PRODUCTO);
    } catch {
      setSubiendo(false);
      setResultado({ ok: false, mensaje: "No pudimos leer esa imagen. Probá con otra (JPG o PNG)." });
      return;
    }
    const datos = new FormData();
    datos.set("imagen", blob, "imagen.jpg");
    iniciar(async () => {
      try {
        setResultado(await subirImagenProducto(datos));
      } catch {
        setResultado({ ok: false, mensaje: "No pudimos subir la imagen. Revisá tu conexión y probá de nuevo." });
      } finally {
        setSubiendo(false);
      }
    });
  }

  const ocupado = pendiente || subiendo;
  const lleno = imagenes.length >= LIMITES_PRODUCTO.imagenes;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-tinta">
        Imágenes <span className="font-normal text-tinta/60">({imagenes.length}/{LIMITES_PRODUCTO.imagenes})</span>
      </h3>
      <p className="text-xs text-tinta/70">Capturas, fotos del producto, renders o mockups. Se ven en la página de la empresa.</p>
      <ul className="grid grid-cols-2 gap-2">
        {imagenes.map((img, i) => (
          <li key={img.clave} className="relative overflow-hidden rounded-xl bg-tinta/5">
            <Image src={img.url} alt={`Imagen ${i + 1} del producto`} width={640} height={480} className="aspect-[4/3] w-full object-cover" />
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                if (!window.confirm("¿Quitar esta imagen?")) return;
                setResultado(null);
                iniciar(async () => setResultado(await quitarImagenProducto(img.clave)));
              }}
              className="absolute right-1.5 top-1.5 inline-flex min-h-9 items-center rounded-full bg-marfil/95 px-3 text-xs font-semibold text-tinta disabled:opacity-60"
            >
              Quitar
            </button>
          </li>
        ))}
        {!lleno && (
          <li>
            <label
              className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-tinta/25 text-center text-sm font-medium text-tinta transition-colors duration-200 ease-pecera hover:border-tinta/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla ${
                ocupado ? "pointer-events-none opacity-60" : ""
              }`}
            >
              <span aria-hidden className="text-2xl leading-none">+</span>
              {ocupado ? "Subiendo…" : "Sumar imagen"}
              <input type="file" accept="image/*" onChange={elegir} disabled={ocupado} className="sr-only" />
            </label>
          </li>
        )}
      </ul>
      <p role="status" className="sr-only">
        {ocupado ? "Subiendo imagen…" : ""}
      </p>
      {resultado?.mensaje && <Aviso ok={resultado.ok}>{resultado.mensaje}</Aviso>}
    </div>
  );
}
