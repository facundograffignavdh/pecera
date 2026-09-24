import type { ItemFeed, Perfil, Pitch } from "@/types/pecera";

/**
 * Datos de prueba mientras no hay Supabase. Cuando entre la base real,
 * se reemplaza la implementación de `getFeed()` y los componentes no cambian.
 */

const perfiles: Perfil[] = [
  {
    id: "p1",
    slug: "raiz-verde",
    nombre: "Raíz Verde",
    tipo: "startup",
    rol: "emprendedor",
    descripcion:
      "Convertimos la borra de café de bares porteños en sustrato para huertas urbanas. Ocho locales en Chacarita ya nos separan los residuos.",
    avatar_url: null,
    whatsapp: "+5491144445555",
    email: "hola@raizverde.com.ar",
    linkedin: "https://www.linkedin.com/company/raiz-verde",
    instagram: "https://instagram.com/raizverde.ar",
    web: "https://raizverde.com.ar",
    publicado: true,
  },
  {
    id: "p2",
    slug: "delta-capital",
    nombre: "Delta Capital",
    tipo: "fondo",
    rol: "inversor",
    descripcion:
      "Fondo semilla enfocado en agtech y logística del Litoral. Tickets de USD 25k a 150k y acompañamiento operativo, no solo plata.",
    avatar_url: null,
    whatsapp: null,
    email: "deal@deltacapital.ar",
    linkedin: "https://www.linkedin.com/company/delta-capital-ar",
    instagram: null,
    web: "https://deltacapital.ar",
    publicado: true,
  },
  {
    id: "p3",
    slug: "nodo-litoral",
    nombre: "Nodo Litoral",
    tipo: "incubadora",
    rol: "aliado",
    descripcion:
      "Incubadora de Paraná. Damos espacio, mentoría legal y contable durante seis meses a proyectos de la región que recién arrancan.",
    avatar_url: null,
    whatsapp: "+5493434567890",
    email: "contacto@nodolitoral.org",
    linkedin: null,
    instagram: "https://instagram.com/nodolitoral",
    web: "https://nodolitoral.org",
    publicado: true,
  },
];

const pitches: Pitch[] = [
  {
    id: "v1",
    perfil_id: "p1",
    video_url: "/videos/pitch_1.mp4",
    poster_url: "/posters/pitch_1.jpg",
    orden: 1,
    publicado: true,
  },
  {
    id: "v2",
    perfil_id: "p2",
    video_url: "/videos/pitch_2.mp4",
    poster_url: "/posters/pitch_2.jpg",
    orden: 2,
    publicado: true,
  },
  {
    id: "v3",
    perfil_id: "p3",
    video_url: "/videos/pitch_3.mp4",
    poster_url: "/posters/pitch_3.jpg",
    orden: 3,
    publicado: true,
  },
];

/** Pitches publicados con perfil publicado, ordenados por `orden`. */
export function getFeed(): ItemFeed[] {
  return pitches
    .filter((pitch) => pitch.publicado)
    .sort((a, b) => a.orden - b.orden)
    .flatMap((pitch) => {
      const perfil = perfiles.find((p) => p.id === pitch.perfil_id);
      if (!perfil?.publicado) return [];
      return [{ pitch, perfil }];
    });
}
