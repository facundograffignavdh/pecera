export type Rol = "emprendedor" | "inversor" | "aliado";

export type TipoPerfil =
  | "startup"
  | "emprendimiento"
  | "aceleradora"
  | "incubadora"
  | "angel"
  | "fondo"
  | "coach"
  // feria_pro: aliados (y corporativos que invierten) más allá de mentor/coach.
  | "profesional"
  | "empresa"
  | "institucion";

export type Perfil = {
  id: string;
  slug: string;
  nombre: string;
  tipo: TipoPerfil;
  rol: Rol;
  descripcion: string;
  avatar_url: string | null;
  whatsapp: string | null;
  email: string | null;
  linkedin: string | null;
  instagram: string | null;
  web: string | null;
  publicado: boolean;
  // Campos de la migración feria_lista. Opcionales: si la base todavía no la corrió,
  // lib/datos.ts cae a las columnas de siempre y estos no vienen.
  etapa?: string | null;
  ronda?: string | null;
  industrias?: string[];
  cargo?: string | null;
  especialidades?: string[];
  ticket?: string | null;
  rondas_interes?: string[];
  empresa_id?: string | null;
  // Cofounder match (migración feria_pro).
  busca_cofundador?: boolean;
  cofundador_aporta?: string | null;
  cofundador_busca?: string[];
  cofundador_dedicacion?: string | null;
  cofundador_nota?: string | null;
  // Perfil profesional y preferencias (feria_pro).
  ubicacion?: string | null;
  experiencia?: string | null;
  educacion?: string | null;
  skills?: string[];
  busca?: string[];
  ofrece?: string[];
  /** Solo en las consultas que lo piden (perfil público, feed). La principal. */
  empresa?: EmpresaResumen | null;
  /**
   * Todas sus empresas visibles (multi_empresa), la principal primero, con el cargo
   * en cada una. Sin la migración, la principal sola. Lo arma lib/datos.ts.
   */
  empresas?: EmpresaDePerfil[];
};

/** Lo mínimo de una empresa para mostrarla junto a una persona. */
export type EmpresaResumen = { slug: string; nombre: string; logo_url?: string | null };

/** Una empresa de la persona, con su cargo ahí. */
export type EmpresaDePerfil = EmpresaResumen & { id: string | null; cargo: string | null; principal: boolean };

export type Empresa = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string;
  web: string | null;
  linkedin: string | null;
  instagram: string | null;
  industrias: string[];
  etapa: string | null;
  ronda: string | null;
  /** Clave de R2 (o URL ya armada en lib/datos). Opcional: feria_pro. */
  logo_url?: string | null;
  ubicacion?: string | null;
};

/** Un ítem del portafolio de un perfil (inversión, caso, servicio, logro…). */
export type ItemPortafolio = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  url: string | null;
  visible: boolean;
  orden: number;
};

/** Métrica o documento de una empresa (transparencia). */
export type DatoEmpresa = {
  clave: string;
  valor: string | null;
  url: string | null;
  visible: boolean;
};

/** Un bloque de subtítulos, en segundos desde el inicio del video. */
export type Subtitulo = { desde: number; hasta: number; texto: string };

export type Pitch = {
  id: string;
  perfil_id: string;
  video_url: string;
  poster_url: string | null;
  orden: number;
  publicado: boolean;
  /** Del Form de pitches. Si falta, el feed muestra la del perfil. */
  descripcion: string | null;
  /** Cuándo se publicó (para la racha de progreso). */
  created_at?: string;
  /** Solo lo trae el feed. `null` o `[]`: no hay subtítulos para mostrar. */
  subtitulos?: Subtitulo[] | null;
};

/** Un pitch con su perfil ya resuelto: lo que consume el feed. */
export type ItemFeed = {
  pitch: Pitch;
  perfil: Perfil;
  /** Piques del pitch según el último ISR; el cliente lo refresca al montar. */
  piques: number;
  /** Días seguidos con pitch nuevo del perfil (racha de progreso). */
  racha?: number;
  /** Hito en curso de su empresa (Build in Public), si hay. */
  construyendo?: { titulo: string; progreso: number | null; etapa: string | null } | null;
};

/** Vistas y piques de un pitch (solo agregados), para el perfil. */
export type MetricasPitch = { vistas: number; piques: number };
/** Por id de pitch. */
export type Metricas = Record<string, MetricasPitch>;
