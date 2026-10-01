import type { Rol } from "@/types/pecera";

/**
 * Qué tan completo está un perfil (0-100) y qué falta, con el paso del formulario
 * donde se completa. Pesa más lo que más contactos genera: foto, contacto y lo
 * propio del rol.
 */

export type ItemCompletitud = { clave: string; label: string; paso: number; hecho: boolean; peso: number };

type Datos = {
  rol: Rol | null;
  foto: boolean;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  experiencia: string;
  educacion: string;
  skills: string[];
  whatsapp: string;
  email: string;
  linkedin: string;
  instagram: string;
  web: string;
  etapa: string;
  industrias: string[];
  rondas_interes: string[];
  especialidades: string[];
  busca: string[];
  ofrece: string[];
};

export function completitud(d: Datos): { porcentaje: number; items: ItemCompletitud[] } {
  const propio =
    d.rol === "inversor"
      ? { label: "Tu tesis (rondas e industrias)", hecho: d.rondas_interes.length > 0 && d.industrias.length > 0 }
      : d.rol === "aliado"
        ? { label: "Tus especialidades", hecho: d.especialidades.length > 0 }
        : { label: "Etapa e industria del proyecto", hecho: !!d.etapa && d.industrias.length > 0 };

  const items: ItemCompletitud[] = [
    { clave: "foto", label: "Foto o logo", paso: 0, hecho: d.foto, peso: 15 },
    { clave: "nombre", label: "Nombre", paso: 0, hecho: !!d.nombre.trim(), peso: 10 },
    { clave: "descripcion", label: "Bio en una línea", paso: 0, hecho: !!d.descripcion.trim(), peso: 10 },
    { clave: "ubicacion", label: "Ubicación", paso: 0, hecho: !!d.ubicacion.trim(), peso: 5 },
    {
      clave: "trayectoria",
      label: "Experiencia o educación",
      paso: 1,
      hecho: !!(d.experiencia.trim() || d.educacion.trim()),
      peso: 5,
    },
    { clave: "skills", label: "Skills", paso: 1, hecho: d.skills.length > 0, peso: 5 },
    { clave: "contacto", label: "WhatsApp o email", paso: 2, hecho: !!(d.whatsapp.trim() || d.email.trim()), peso: 15 },
    { clave: "redes", label: "LinkedIn, Instagram o web", paso: 2, hecho: !!(d.linkedin || d.instagram || d.web), peso: 5 },
    { clave: "propio", label: propio.label, paso: 3, hecho: propio.hecho, peso: 15 },
    { clave: "preferencias", label: "Qué buscás o qué ofrecés", paso: 4, hecho: d.busca.length + d.ofrece.length > 0, peso: 10 },
  ];
  const total = items.reduce((s, i) => s + i.peso, 0);
  const hecho = items.reduce((s, i) => s + (i.hecho ? i.peso : 0), 0);
  return { porcentaje: Math.round((hecho / total) * 100), items };
}
