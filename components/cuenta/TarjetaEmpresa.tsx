/**
 * Una empresa de la sesión, como la devuelven mi_empresa_v2 / mis_empresas. La lista
 * del perfil propio está en EmpresasDueno y la administración en PanelEmpresa.
 */
export type MiEmpresa = {
  id: string;
  slug: string;
  nombre: string;
  /** null: creada con lo básico (persona_empresa), sin descripción todavía. */
  descripcion: string | null;
  web: string | null;
  linkedin: string | null;
  instagram: string | null;
  industrias: string[];
  etapa: string | null;
  ronda: string | null;
  /** URL ya armada (mi_empresa_v2); null sin logo o sin la migración feria_pro. */
  logo_url?: string | null;
  ubicacion?: string | null;
  codigo: string | null;
  es_dueno: boolean;
  visible: boolean;
  miembros: number;
};

/** "A1B2C3D4" → "A1B2-C3D4": se dicta y se copia más fácil. */
export const formatoCodigo = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;
