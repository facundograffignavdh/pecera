import Image from "next/image";

/**
 * La escena del hero quieta: se ve mientras carga el 3D y queda sola sin
 * WebGL o con "reducir movimiento". Mismos peces y burbujas, sin animación.
 */

const PECES = [
  { left: "14%", top: "18%", width: "34%", giro: -8, espejo: false, opacidad: 1 },
  { left: "56%", top: "44%", width: "27%", giro: 6, espejo: true, opacidad: 1 },
  { left: "24%", top: "62%", width: "20%", giro: -4, espejo: false, opacidad: 0.85 },
  { left: "64%", top: "12%", width: "16%", giro: 10, espejo: true, opacidad: 0.7 },
];

const BURBUJAS = [
  { left: "50%", top: "30%", size: 14 },
  { left: "53%", top: "20%", size: 9 },
  { left: "47%", top: "12%", size: 7 },
  { left: "82%", top: "38%", size: 11 },
  { left: "12%", top: "56%", size: 10 },
  { left: "38%", top: "84%", size: 8 },
];

export default function EscenaEstatica({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className}`} aria-hidden>
      {PECES.map((p, i) => (
        <Image
          key={i}
          src="/brand/pez.svg"
          alt=""
          width={1536}
          height={1374}
          unoptimized
          preload={i === 0}
          className="absolute h-auto"
          style={{
            left: p.left,
            top: p.top,
            width: p.width,
            opacity: p.opacidad,
            transform: `rotate(${p.giro}deg) scaleX(${p.espejo ? -1 : 1})`,
          }}
        />
      ))}
      {BURBUJAS.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full border-2 border-tinta/25"
          style={{ left: b.left, top: b.top, width: b.size, height: b.size }}
        />
      ))}
    </div>
  );
}
