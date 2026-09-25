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
