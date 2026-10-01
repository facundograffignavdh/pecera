"use client";

/**
 * Imprimir o guardar como PDF con el diálogo del navegador (en el celular también:
 * "Compartir → Imprimir" en iOS, "Imprimir → Guardar como PDF" en Android). Sin
 * dependencias: la página tiene su hoja de estilos de impresión.
 */
export default function BotonImprimir({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {children}
    </button>
  );
}
