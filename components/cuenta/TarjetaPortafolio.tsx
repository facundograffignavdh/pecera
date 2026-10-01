"use client";

import { useActionState, useState, useTransition } from "react";
import { borrarItemPortafolio, guardarItemPortafolio } from "@/app/cuenta/portafolio";
import { ChipsUnico } from "@/components/Chips";
import { Etiqueta } from "@/components/Etiquetas";
import { Aviso, BOTON_PRIMARIO, INPUT, Tarjeta } from "@/components/cuenta/ui";
import type { Resultado } from "@/lib/errores-base";
import { MAX_PORTAFOLIO, TIPOS_PORTAFOLIO, TONO, tipoPortafolio } from "@/lib/etiquetas";
import type { ItemPortafolio, Rol } from "@/types/pecera";

const INICIAL: Resultado = { ok: false };

const TEXTOS: Record<Rol, { titulo: string; bajada: string; ejemplo: string }> = {
  emprendedor: {
    titulo: "Logros y documentos",
    bajada: "Premios, notas de prensa, clientes y documentos que suman confianza.",
    ejemplo: "Ganadores de Impulso 21 · 2026",
  },
  inversor: {
    titulo: "Tu portafolio",
    bajada: "En qué invertiste, tu tesis y notas de prensa. Es lo primero que mira un founder.",
    ejemplo: "Raíz Verde · pre-seed 2025",
  },
  aliado: {
    titulo: "Casos y servicios",
    bajada: "Clientes, casos de éxito, servicios que ofrecés y material para descargar.",
    ejemplo: "Lanzamiento de Raíz Verde: de 0 a 300 clientes",
  },
};

/** Portafolio del perfil: cada ítem es un link (https) con su tipo y su color. */
export default function TarjetaPortafolio({ items, rol }: { items: ItemPortafolio[]; rol: Rol }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(0);
  const t = TEXTOS[rol];

  return (
    <Tarjeta titulo={t.titulo} etiqueta="Portafolio" bajada={t.bajada}>
      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) =>
            editando === item.id ? (
              <li key={item.id}>
                <FormItem rol={rol} item={item} ejemplo={t.ejemplo} onListo={() => setEditando(null)} />
              </li>
            ) : (
              <li key={item.id}>
                <FilaItem item={item} onEditar={() => setEditando(item.id)} />
              </li>
            )
          )}
        </ul>
      )}
      {items.length < MAX_PORTAFOLIO ? (
        <details className="group rounded-2xl border border-dashed border-tinta/25" open={items.length === 0}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-medium text-tinta [&::-webkit-details-marker]:hidden">
            Sumar un ítem
            <span aria-hidden className="text-xl transition-transform duration-300 ease-pecera group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="px-4 pb-4">
            <FormItem key={nuevo} rol={rol} ejemplo={t.ejemplo} onListo={() => setNuevo((n) => n + 1)} />
          </div>
        </details>
      ) : (
        <p className="text-sm text-tinta/65">Llegaste a {MAX_PORTAFOLIO} ítems: borrá uno para sumar otro.</p>
      )}
    </Tarjeta>
  );
}

function FilaItem({ item, onEditar }: { item: ItemPortafolio; onEditar: () => void }) {
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const tipo = tipoPortafolio(item.tipo);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-tinta/10 bg-marfil px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-snug text-tinta">{item.titulo}</span>
        <Etiqueta clase={tipo.clase}>{tipo.label}</Etiqueta>
      </div>
      {item.descripcion && <p className="text-sm text-tinta/70">{item.descripcion}</p>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={item.visible ? "text-t-verde" : "text-tinta/55"}>{item.visible ? "Visible" : "Oculto"}</span>
        <button type="button" onClick={onEditar} className="font-medium text-tinta underline underline-offset-4">
          Editar
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm(`¿Borrar «${item.titulo}»?`)) return;
            iniciar(async () => setAviso(await borrarItemPortafolio(item.id)));
          }}
          className="text-tinta/55 hover:text-tinta"
        >
          {pendiente ? "Borrando…" : "Borrar"}
        </button>
      </div>
      {aviso && !aviso.ok && <Aviso ok={false}>{aviso.mensaje}</Aviso>}
    </div>
  );
}

function FormItem({
  rol,
  item,
  ejemplo,
  onListo,
}: {
  rol: Rol;
  item?: ItemPortafolio;
  ejemplo: string;
  onListo: () => void;
}) {
  const opciones = TIPOS_PORTAFOLIO.filter((t) => (t.roles as readonly string[]).includes(rol)).map((t) => ({
    valor: t.valor,
    label: t.label,
    tono: TONO[t.tono],
  }));
  const [tipo, setTipo] = useState(item?.tipo ?? opciones[0]?.valor ?? "documento");
  const [visible, setVisible] = useState(item?.visible ?? true);
  const [estado, accion, guardando] = useActionState(async (previo: Resultado, datos: FormData) => {
    const r = await guardarItemPortafolio(previo, datos);
    if (r.ok) onListo();
    return r;
  }, INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-4 pt-1">
      {item && <input type="hidden" name="id" value={item.id} />}
      <ChipsUnico id={`tipo-${item?.id ?? "nuevo"}`} nombre="tipo" legend="Tipo" opciones={opciones} valor={tipo} onCambiar={setTipo} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        Título
        <input name="titulo" required maxLength={80} defaultValue={item?.titulo ?? ""} placeholder={ejemplo} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        <span>
          Descripción <span className="font-normal text-tinta/55">(opcional)</span>
        </span>
        <textarea name="descripcion" rows={2} maxLength={200} defaultValue={item?.descripcion ?? ""} className={`${INPUT} resize-none`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-tinta">
        <span>
          Link <span className="font-normal text-tinta/55">(opcional, https://)</span>
        </span>
        <input
          name="url"
          type="url"
          inputMode="url"
          maxLength={300}
          defaultValue={item?.url ?? ""}
          placeholder="https://drive.google.com/…"
          className={INPUT}
        />
      </label>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-tinta">
        <input type="checkbox" name="visible" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-5 accent-tinta" />
        Mostrarlo en mi perfil
      </label>
      {estado.mensaje && <Aviso ok={estado.ok}>{estado.mensaje}</Aviso>}
      <div className="flex gap-2">
        <button type="submit" disabled={guardando} className={`${BOTON_PRIMARIO} boton flex-1`}>
          {guardando ? "Guardando…" : item ? "Guardar" : "Sumar al portafolio"}
        </button>
        {item && (
          <button type="button" onClick={onListo} className="boton min-h-12 rounded-full border border-tinta/30 px-5 font-medium text-tinta">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
