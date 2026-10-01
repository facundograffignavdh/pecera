"use client";

import { useEffect } from "react";
import { observarRevelar } from "@/lib/revelar";

/** Activa las entradas `data-revelar` de la página (empresa, perfil). No dibuja nada. */
export default function Revelar() {
  useEffect(() => observarRevelar(), []);
  return null;
}
