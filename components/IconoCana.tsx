/** Caña de pescar del Pique: caña, reel, sedal y anzuelo. Toma el color de `currentColor`. */
export default function IconoCana({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 21 17 3" />
      <circle cx="8.5" cy="18" r="1.8" />
      <path d="M17 3q3 1 3 4v8" />
      <path d="M20 15a2.2 2.2 0 0 1-4.4 0" />
    </svg>
  );
}
