"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

/**
 * Cardumen de peces de la marca (el mismo pez.svg del isotipo, extruido) con
 * burbujas. Un solo InstancedMesh por tipo de objeto: dos draw calls en total.
 * Todo el movimiento corre con un reloj propio que avanza solo mientras se
 * dibuja, así al volver de una pausa nadie pega un salto.
 */

const PECERA = "#F87C43";
const ARCILLA = "#D95A22";
const TINTA = "#1C1B16";

// El pez del SVG mira a la izquierda: con yaw 0 nada hacia -x.
const MIRA_A_LA_IZQUIERDA = true;

type Pez = {
  rx: number;
  ry: number;
  cy: number;
  z: number;
  velocidad: number;
  fase: number;
  escala: number;
  color: string;
};

// Parámetros fijos (sin Math.random) para que la escena sea siempre la misma.
const PECES: Pez[] = [
  { rx: 1.0, ry: 0.35, cy: 0.55, z: 0.4, velocidad: 0.32, fase: 0.0, escala: 1.0, color: PECERA },
  { rx: 0.85, ry: 0.3, cy: -0.35, z: -0.6, velocidad: 0.27, fase: 2.1, escala: 0.8, color: ARCILLA },
  { rx: 0.95, ry: 0.4, cy: 0.05, z: 1.1, velocidad: 0.36, fase: 4.0, escala: 0.62, color: PECERA },
  { rx: 0.7, ry: 0.28, cy: -0.8, z: 0.2, velocidad: 0.3, fase: 5.3, escala: 0.55, color: PECERA },
  { rx: 0.6, ry: 0.25, cy: 0.95, z: -1.2, velocidad: 0.24, fase: 1.2, escala: 0.5, color: ARCILLA },
  { rx: 0.8, ry: 0.3, cy: -0.05, z: -1.8, velocidad: 0.22, fase: 3.2, escala: 0.45, color: PECERA },
];

const BURBUJAS = 16;

function usePezGeometria() {
  const svg = useLoader(SVGLoader, "/brand/pez.svg");
  return useMemo(() => {
    const formas = svg.paths.flatMap((p) => p.toShapes());
    // El contorno ya es denso (viene de un trazado de bitmap): con un segmento
    // por curva alcanza y la geometría queda liviana.
    const geo = new THREE.ExtrudeGeometry(formas, {
      depth: 160,
      curveSegments: 1,
      bevelEnabled: true,
      bevelThickness: 70,
      bevelSize: 45,
      bevelSegments: 2,
    });
    geo.center();
    // El SVG tiene la y hacia abajo. Girar 180° en X la da vuelta sin invertir
    // las caras (escalar -1 en un solo eje sí las invertiría).
    geo.rotateX(Math.PI);
    geo.computeBoundingBox();
    const ancho = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
    geo.scale(1 / ancho, 1 / ancho, 1 / ancho);
    geo.computeVertexNormals();
    return geo;
  }, [svg]);
}

function Cardumen({ onLista }: { onLista: () => void }) {
  const geometria = usePezGeometria();
  const malla = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const reloj = useRef(0);
  const giros = useRef(PECES.map(() => 0));
  const centro = useRef(new THREE.Vector2());
  const auxiliar = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const m = malla.current;
    if (!m) return;
    const color = new THREE.Color();
    PECES.forEach((p, i) => m.setColorAt(i, color.set(p.color)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  useEffect(() => onLista(), [onLista]);

  useFrame((state, delta) => {
    const m = malla.current;
    if (!m) return;
    // Tope al delta: una pestaña que vuelve de segundo plano no adelanta la escena.
    const dt = Math.min(delta, 1 / 20);
    reloj.current += dt;
    const t = reloj.current;

    // El cardumen se corre un poco hacia el puntero (en celular queda quieto).
    const ancho = viewport.width;
    const alto = viewport.height;
    centro.current.x += (state.pointer.x * ancho * 0.08 - centro.current.x) * Math.min(1, dt * 1.5);
    centro.current.y += (state.pointer.y * alto * 0.06 - centro.current.y) * Math.min(1, dt * 1.5);

    const tamano = Math.min(ancho, alto * 1.4) * 0.26;

    PECES.forEach((p, i) => {
      const a = t * p.velocidad + p.fase;
      const x = centro.current.x + Math.sin(a) * p.rx * ancho * 0.36;
      const y = centro.current.y + p.cy * alto * 0.3 + Math.sin(a * 2) * p.ry * alto * 0.12;
      const vx = Math.cos(a);
      const vy = Math.cos(a * 2);

      // Gira cuando cambia de sentido: de canto a mitad del giro, como un pez de verdad.
      const haciaLaDerecha = vx > 0;
      const objetivo = haciaLaDerecha === MIRA_A_LA_IZQUIERDA ? Math.PI : 0;
      giros.current[i] += (objetivo - giros.current[i]) * Math.min(1, dt * 2.2);

      auxiliar.position.set(x, y, p.z);
      auxiliar.rotation.set(
        0,
        giros.current[i] + Math.sin(t * 7 + p.fase) * 0.14,
        vy * 0.12 * (haciaLaDerecha ? 1 : -1) + Math.sin(t * 3.5 + p.fase) * 0.04
      );
      auxiliar.scale.setScalar(tamano * p.escala);
      auxiliar.updateMatrix();
      m.setMatrixAt(i, auxiliar.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={malla} args={[geometria, undefined, PECES.length]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.5} metalness={0} />
    </instancedMesh>
  );
}

function Burbujas() {
  const malla = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const auxiliar = useMemo(() => new THREE.Object3D(), []);
  // Posición inicial y ritmo de cada burbuja, repartidos sin azar.
  const datos = useMemo(
    () =>
      Array.from({ length: BURBUJAS }, (_, i) => ({
        x: ((i * 0.618) % 1) - 0.5,
        arranque: (i * 0.37) % 1,
        velocidad: 0.08 + ((i * 0.29) % 1) * 0.08,
        radio: 0.5 + ((i * 0.53) % 1) * 0.7,
        z: -1 + ((i * 0.41) % 1) * 2,
      })),
    []
  );
  const reloj = useRef(0);

  useFrame((_, delta) => {
    const m = malla.current;
    if (!m) return;
    reloj.current += Math.min(delta, 1 / 20);
    const t = reloj.current;
    const alto = viewport.height;
    const base = Math.min(viewport.width, alto) * 0.018;

    datos.forEach((b, i) => {
      const avance = (b.arranque + t * b.velocidad) % 1;
      auxiliar.position.set(
        b.x * viewport.width * 0.8 + Math.sin(t * 1.3 + i) * 0.08,
        -alto / 2 + avance * alto * 1.1,
        b.z
      );
      // Crecen al subir y se desvanecen achicándose al llegar arriba.
      const s = base * b.radio * (0.6 + avance * 0.6) * Math.min(1, (1 - avance) * 6);
      auxiliar.scale.setScalar(Math.max(s, 0.0001));
      auxiliar.updateMatrix();
      m.setMatrixAt(i, auxiliar.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={malla} args={[undefined, undefined, BURBUJAS]} frustumCulled={false}>
      <torusGeometry args={[1, 0.16, 8, 20]} />
      <meshBasicMaterial color={TINTA} transparent opacity={0.28} depthWrite={false} />
    </instancedMesh>
  );
}

export default function EscenaPecera({
  activa,
  onLista,
}: {
  /** Fuera de pantalla o con la pestaña oculta no se dibuja nada. */
  activa: boolean;
  /** Primer cuadro con los peces cargados: se puede mostrar. */
  onLista: () => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={activa ? "always" : "never"}
      camera={{ position: [0, 0, 8], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[2, 4, 6]} intensity={2.2} />
      <directionalLight position={[-3, -2, 2]} intensity={0.5} />
      <Burbujas />
      <Suspense fallback={null}>
        <Cardumen onLista={onLista} />
      </Suspense>
    </Canvas>
  );
}
