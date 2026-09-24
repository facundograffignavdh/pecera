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

export type Pitch = {
  id: string;
  perfil_id: string;
  video_url: string;
  poster_url: string | null;
  orden: number;
  publicado: boolean;
};

/** Un pitch con su perfil ya resuelto: lo que consume el feed. */
export type ItemFeed = {
  pitch: Pitch;
  perfil: Perfil;
};
