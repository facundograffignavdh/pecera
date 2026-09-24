import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-marfil px-6 text-center">
      <h1 className="font-display text-3xl font-semibold text-tinta">
        Ese perfil no está acá
      </h1>
      <p className="max-w-sm text-tinta/70">
        Puede que el link esté mal escrito o que todavía no lo hayan publicado.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex rounded-full bg-arcilla px-5 py-2.5 font-medium text-marfil transition-colors duration-200 ease-pecera hover:bg-pecera"
      >
        Ir al feed
      </Link>
    </main>
  );
}
