import type { Documento } from "@/lib/dataroom";
import { campoVisible, formatoValor, plantilla as buscarPlantilla } from "@/lib/plantillas";

/**
 * Un documento del Dataroom para leer (página pública y exportación). Solo lo
 * respondido: una pregunta sin respuesta no se dibuja.
 */
export default function DocumentoLectura({ doc, nivel = 3 }: { doc: Pick<Documento, "tipo" | "titulo" | "plantilla" | "campos" | "cuerpo" | "url">; nivel?: 2 | 3 }) {
  const Titulo = nivel === 2 ? "h2" : "h3";
  const p = buscarPlantilla(doc.plantilla);
  const respuestas = p
    ? p.pasos
        .flatMap((paso) => paso.campos)
        .filter((c) => c.id !== "moneda" && campoVisible(c, doc.campos))
        .map((c) => ({ c, texto: formatoValor(c, doc.campos[c.id], doc.campos), filas: doc.campos[c.id] }))
        .filter((r) => r.texto)
    : [];

  return (
    <article className="sin-corte flex flex-col gap-3">
      <Titulo className="font-display text-lg font-semibold leading-tight text-tinta">{doc.titulo}</Titulo>
      {respuestas.length > 0 && (
        <dl className="flex flex-col gap-3">
          {respuestas.map(({ c, texto, filas }) => (
            <div key={c.id}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-tinta/55">{c.label}</dt>
              {c.tipo === "tabla" && Array.isArray(filas) ? (
                <dd className="mt-1">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr>
                        {(c.columnas ?? []).map((col) => (
                          <th key={col.id} scope="col" className="border-b border-tinta/15 py-1 pr-3 text-xs font-semibold text-tinta/70">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f, i) => (
                        <tr key={i}>
                          {(c.columnas ?? []).map((col) => (
                            <td key={col.id} className="border-b border-tinta/10 py-1.5 pr-3 align-top text-tinta">
                              {f[col.id]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </dd>
              ) : (
                <dd className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-tinta">{texto}</dd>
              )}
            </div>
          ))}
        </dl>
      )}
      {doc.cuerpo && (
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-tinta">
          {doc.cuerpo
            .split(/\n\s*\n/)
            .filter((x) => x.trim())
            .map((parrafo, i) => (
              <p key={i} className="whitespace-pre-line">
                {parrafo.trim()}
              </p>
            ))}
        </div>
      )}
      {doc.url && (
        <p className="text-sm">
          <a href={doc.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-tinta underline underline-offset-4 hover:text-arcilla">
            {doc.tipo === "link" ? "Abrir el documento" : "Link relacionado"} ↗
          </a>
          <span className="block break-all text-xs text-tinta/55">{doc.url}</span>
        </p>
      )}
    </article>
  );
}
