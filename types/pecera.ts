export type Rol = "emprendedor" | "inversor" | "aliado";

export type TipoPerfil =
  | "startup"
  | "emprendimiento"
  | "aceleradora"
  | "incubadora"
  | "angel"
  | "fondo"
  | "coach";

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
  /** Solo en las consultas que lo piden (perfil público, feed). */
  empresa?: EmpresaResumen | null;
};

/** Lo mínimo de una empresa para mostrarla junto a una persona. */
export type EmpresaResumen = { slug: string; nombre: string };

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
  /** Solo lo trae el feed. `null` o `[]`: no hay subtítulos para mostrar. */
  subtitulos?: Subtitulo[] | null;
};

/** Un pitch con su perfil ya resuelto: lo que consume el feed. */
export type ItemFeed = {
  pitch: Pitch;
  perfil: Perfil;
  /** Piques del pitch según el último ISR; el cliente lo refresca al montar. */
  piques: number;
};
