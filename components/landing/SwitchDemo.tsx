"use client";

import SwitchTransparencia from "@/components/SwitchTransparencia";

/** El mismo switch del Dataroom, para probarlo en la landing. No guarda nada. */
export default function SwitchDemo() {
  return (
    <SwitchTransparencia
      visible={false}
      etiqueta="Ejemplo: Análisis de competencia"
      onCambiar={async (visible) => ({
        ok: true,
        mensaje: visible ? "Ahora se ve en la página de la empresa." : "Volvió a ser privado.",
      })}
    />
  );
}
