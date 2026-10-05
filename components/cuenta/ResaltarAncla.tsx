"use client";

import { useEffect } from "react";
import { resaltar } from "@/lib/resaltar";

/** Al llegar con `#<id>` en la URL, lleva a ese elemento y lo resalta. */
export default function ResaltarAncla({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    const t = setTimeout(() => resaltar(id), 150);
    return () => clearTimeout(t);
  }, [id]);
  return null;
}
