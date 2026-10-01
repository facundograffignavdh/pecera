import { permanentRedirect } from "next/navigation";

/**
 * /docs pasó a ser Academy → Docs. Conceptos (/docs/conceptos) y legales
 * (/docs/legales) siguen en su dirección: sus anclas están en links compartidos.
 */
export default function DocsPage() {
  permanentRedirect("/academy/docs");
}
