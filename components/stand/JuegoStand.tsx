"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import TelefonoPais from "@/components/TelefonoPais";
import { dispositivo } from "@/lib/dispositivo";
import {
  INTENTOS,
  type ErroresDatos,
  type EstadoStand,
  type Juego,
  adivinar,
  estadoStand,
  guardarJugador,
  jugadorGuardado,
  miJuego,
  registrar,
  termino,
  validar,
} from "@/lib/stand";
import { boton } from "@/lib/ui";

type Lectura = { carga: "listo"; estado: EstadoStand | null; juego: Juego | null } | { carga: "error"; mensaje: string };

/**
 * El estado del juego y, si este celular ya jugaba, su juego. `estado` null = falta la migración
 * (el juego "arranca pronto"). Si la base ya no tiene al jugador guardado, lo olvida. No tira.
 */
async function leer(): Promise<Lectura> {
  const guardado = jugadorGuardado();
  const [e, j] = await Promise.all([estadoStand(), guardado ? miJuego(guardado, dispositivo()) : null]);
  if (j?.ok && !j.datos) guardarJugador(null);
  const juego = j?.ok ? j.datos : null;
  if (e.ok) return { carga: "listo", estado: e.datos ?? null, juego };
  if (e.noDisponible) return { carga: "listo", estado: null, juego };
  return { carga: "error", mensaje: e.mensaje };
}

/**
 * Juego del stand (/tarjetas): datos → número de 3 cifras (3 intentos) → resultado. El número
 * nunca está acá: la base dice si acertó (lib/stand.ts). Si se recarga la página, retoma el
 * juego de este celular. Va sobre fondo Tinta (`tema-fijo` en la página).
 */
export default function JuegoStand() {
  const [carga, setCarga] = useState<"cargando" | "listo" | "error">("cargando");
  const [errorCarga, setErrorCarga] = useState("");
  const [estado, setEstado] = useState<EstadoStand | null>(null);
  const [juego, setJuego] = useState<Juego | null>(null);

  function aplicar(l: Lectura) {
    if (l.carga === "error") {
      setErrorCarga(l.mensaje);
      setCarga("error");
      return;
    }
    setEstado(l.estado);
    setJuego(l.juego);
    setCarga("listo");
  }

  useEffect(() => {
    let vigente = true;
    leer().then((l) => {
      if (vigente) aplicar(l);
    });
    return () => {
      vigente = false;
    };
  }, []);

  /** Otra persona en este celular (o la base ya no tiene su juego): olvida al jugador y vuelve a leer. */
  function deNuevo() {
    guardarJugador(null);
    setJuego(null);
    setCarga("cargando");
    leer().then(aplicar);
  }

  /** Falló la conexión: vuelve a leer sin olvidar a nadie. */
  function reintentar() {
    setCarga("cargando");
    leer().then(aplicar);
  }

  if (carga === "cargando") {
    return (
      <p role="status" className="mt-10 flex items-center justify-center gap-3 text-sm text-marfil/80">
        <span aria-hidden className="girando size-5 rounded-full border-2 border-marfil/30 border-t-marfil" />
        Cargando el juego…
      </p>
    );
  }
  if (carga === "error") {
    return (
      <Aviso titulo="No pudimos cargar el juego" texto={errorCarga}>
        <button type="button" onClick={reintentar} className={boton("primario", "lg")}>
          Probar de nuevo
        </button>
      </Aviso>
    );
  }
  // Un juego terminado se muestra siempre (el código del ganador, aunque el juego se cierre).
  if (juego && termino(juego)) return <Final juego={juego} premios={estado?.premios ?? 0} onOtraPersona={deNuevo} />;
  if (!estado || !estado.listo) {
    return <Aviso titulo="El juego arranca pronto" texto="Estamos preparando las tarjetas. Volvé en un rato o preguntá en el stand de Pecera." />;
  }
  if (!estado.activo) return <Aviso titulo="El juego está cerrado" texto="Por ahora no se puede jugar. Pasá por el stand de Pecera." />;
  if (juego) return <Adivinar juego={juego} premios={estado.premios} onCambio={setJuego} onPerdido={deNuevo} />;
  if (estado.quedan <= 0) {
    return (
      <Aviso
        titulo={estado.premios > 0 ? `Ya se ganaron las ${estado.premios} tarjetas` : "No hay tarjetas en juego"}
        texto="¡Gracias por venir! Pasá igual por el stand de Pecera y conocé la app."
      >
        <Link href="/" className={boton("primario", "lg")}>
          Conocé Pecera
        </Link>
      </Aviso>
    );
  }
  return (
    <Datos
      estado={estado}
      onListo={(j) => {
        guardarJugador(j.jugador);
        setJuego(j);
      }}
    />
  );
}

function Aviso({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <section className="aparecer mt-8 rounded-3xl bg-marfil px-5 py-6 text-center text-tinta">
      <h2 className="font-display text-2xl font-semibold leading-tight">{titulo}</h2>
      <p className="mt-2 text-sm leading-relaxed text-tinta/80">{texto}</p>
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Paso 1: datos
// ---------------------------------------------------------------------------

const ENTRADA =
  "w-full rounded-xl bg-marfil px-3.5 py-2.5 text-base text-tinta placeholder:text-tinta/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arcilla";
const borde = (mal: boolean) => (mal ? "border-2 border-arcilla" : "border border-tinta/55");

/** Orden en que se enfoca el primer campo con error. */
const ID_CAMPO: Record<keyof ErroresDatos, string> = {
  nombre: "stand-nombre",
  apellido: "stand-apellido",
  telefono: "stand-telefono",
  nfc: "stand-nfc-si",
  consiento: "stand-consiento",
};

function MensajeError({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-sm font-medium text-t-arcilla">
      {texto}
    </p>
  );
}

function Datos({ estado, onListo }: { estado: EstadoStand; onListo: (j: Juego) => void }) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [quiereNfc, setQuiereNfc] = useState<boolean | null>(null);
  const [consiento, setConsiento] = useState(false);
  const [errores, setErrores] = useState<ErroresDatos>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const nuevos = validar({ nombre, apellido, telefono, quiereNfc, consiento });
    setErrores(nuevos);
    setErrorGeneral("");
    const primero = (Object.keys(ID_CAMPO) as (keyof ErroresDatos)[]).find((k) => nuevos[k]);
    if (primero) {
      document.getElementById(ID_CAMPO[primero])?.focus();
      return;
    }
    setEnviando(true);
    const r = await registrar({ nombre, apellido, telefono, quiereNfc: quiereNfc === true, consiento }, dispositivo());
    setEnviando(false);
    if (r.ok) onListo(r.datos);
    else setErrorGeneral(r.mensaje);
  }

  return (
    <section className="aparecer mt-8">
      <p className="text-center text-base leading-relaxed text-marfil/90">
        Dejá tus datos y tenés <strong className="text-marfil">{INTENTOS} intentos</strong> para adivinar el número de 3
        cifras. Quedan <strong className="text-marfil">{estado.quedan}</strong> de {estado.premios} tarjetas NFC.
      </p>

      <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-5 rounded-3xl bg-marfil px-5 py-6 text-tinta">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stand-nombre" className="text-sm font-semibold">
              Nombre
            </label>
            <input
              id="stand-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="given-name"
              maxLength={60}
              enterKeyHint="next"
              aria-invalid={!!errores.nombre || undefined}
              aria-describedby={errores.nombre ? "stand-nombre-error" : undefined}
              className={`${ENTRADA} ${borde(!!errores.nombre)}`}
            />
            <MensajeError id="stand-nombre-error" texto={errores.nombre} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stand-apellido" className="text-sm font-semibold">
              Apellido
            </label>
            <input
              id="stand-apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              autoComplete="family-name"
              maxLength={60}
              enterKeyHint="next"
              aria-invalid={!!errores.apellido || undefined}
              aria-describedby={errores.apellido ? "stand-apellido-error" : undefined}
              className={`${ENTRADA} ${borde(!!errores.apellido)}`}
            />
            <MensajeError id="stand-apellido-error" texto={errores.apellido} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="stand-telefono" className="text-sm font-semibold">
            Teléfono
          </label>
          <TelefonoPais
            id="stand-telefono"
            nombre="telefono"
            valorInicial=""
            onCambiar={setTelefono}
            invalido={!!errores.telefono}
            describedBy={errores.telefono ? "stand-telefono-error" : undefined}
          />
          <MensajeError id="stand-telefono-error" texto={errores.telefono} />
        </div>

        <fieldset className="flex flex-col gap-2" aria-describedby={errores.nfc ? "stand-nfc-error" : undefined}>
          <legend className="text-sm font-semibold">¿Te gustaría tener una tarjeta NFC personalizada con tu logo?</legend>
          <p className="-mt-1 text-sm text-tinta/70">La acercás a un celular y abre tu perfil de Pecera.</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { valor: true, texto: "Sí", id: "stand-nfc-si" },
              { valor: false, texto: "No", id: "stand-nfc-no" },
            ].map((o) => (
              <label
                key={o.id}
                className={`tarjeta-opcion flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 text-base font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-arcilla ${
                  quiereNfc === o.valor ? "border-tinta bg-tinta text-marfil" : errores.nfc ? "border-arcilla" : "border-tinta/25"
                }`}
              >
                <input
                  id={o.id}
                  type="radio"
                  name="nfc"
                  className="sr-only"
                  checked={quiereNfc === o.valor}
                  onChange={() => setQuiereNfc(o.valor)}
                />
                {o.texto}
              </label>
            ))}
          </div>
          <MensajeError id="stand-nfc-error" texto={errores.nfc} />
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              id="stand-consiento"
              type="checkbox"
              checked={consiento}
              onChange={(e) => setConsiento(e.target.checked)}
              aria-invalid={!!errores.consiento || undefined}
              aria-describedby={errores.consiento ? "stand-consiento-error" : undefined}
              className="mt-0.5 size-5 shrink-0 accent-tinta"
            />
            <span>
              Acepto que Pecera guarde estos datos para el juego y para contactarme por la tarjeta NFC.{" "}
              <Link href="/privacidad#juego-stand" target="_blank" className="font-medium underline underline-offset-4">
                Cómo los cuidamos
              </Link>
              .
            </span>
          </label>
          <MensajeError id="stand-consiento-error" texto={errores.consiento} />
        </div>

        <p role="alert" className="text-sm font-medium text-t-arcilla empty:hidden">
          {errorGeneral}
        </p>
        <button type="submit" disabled={enviando} className={`${boton("primario", "lg")} w-full`}>
          {enviando ? "Anotándote…" : "Jugar"}
        </button>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Paso 2: el número
// ---------------------------------------------------------------------------

function Adivinar({
  juego,
  premios,
  onCambio,
  onPerdido,
}: {
  juego: Juego;
  premios: number;
  onCambio: (j: Juego) => void;
  onPerdido: () => void;
}) {
  const [digitos, setDigitos] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const [sacudidas, setSacudidas] = useState(0);
  const [probados, setProbados] = useState<string[]>([]);
  const [enfocado, setEnfocado] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const restantes = juego.intentos_restantes;

  async function probar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    if (!/^\d{3}$/.test(digitos)) {
      setAviso({ texto: "Escribí las 3 cifras.", error: true });
      entrada.current?.focus();
      return;
    }
    setEnviando(true);
    setAviso(null);
    const r = await adivinar(juego.jugador, dispositivo(), Number(digitos));
    setEnviando(false);
    if (!r.ok) {
      if (r.motivo === "no encontramos tu juego") onPerdido();
      else setAviso({ texto: r.mensaje, error: true });
      return;
    }
    if (r.datos.resultado === "fallo") {
      const quedan = r.datos.intentos_restantes;
      setProbados((p) => [...p, digitos]);
      setSacudidas((s) => s + 1);
      setDigitos("");
      setAviso({
        texto: `No es ${digitos}. ${quedan === 1 ? "Te queda 1 intento." : `Te quedan ${quedan} intentos.`}`,
        error: false,
      });
      entrada.current?.focus();
    }
    // Con cualquier otro resultado el juego terminó y JuegoStand muestra el final.
    onCambio(r.datos);
  }

  return (
    <section className="aparecer mt-8 text-center">
      <p className="text-base text-marfil/90">
        ¡Dale, <strong className="text-marfil">{juego.nombre}</strong>! Adiviná el número de 3 cifras.
      </p>
      <p className="mt-1 text-sm text-marfil/75">Mirá bien las tarjetas de cartón del stand.</p>

      <form onSubmit={probar} noValidate className="mt-8 flex flex-col items-center gap-6">
        <label htmlFor="stand-numero" className="sr-only">
          Número de 3 cifras
        </label>
        <div className="relative">
          <div key={sacudidas} className={`flex gap-3 ${sacudidas ? "sacudir" : ""}`}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden
                className={`carton flex h-24 w-[4.5rem] items-center justify-center rounded-2xl font-display text-5xl font-semibold tabular-nums text-tinta ${
                  enfocado && i === Math.min(digitos.length, 2) ? "carton-activo" : ""
                }`}
              >
                {digitos[i] ?? ""}
              </span>
            ))}
          </div>
          {/* El campo real queda encima, invisible: teclado numérico y accesible. */}
          <input
            ref={entrada}
            id="stand-numero"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={3}
            enterKeyHint="go"
            value={digitos}
            onChange={(e) => {
              setDigitos(e.target.value.replace(/\D/g, "").slice(0, 3));
              setAviso(null);
            }}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            aria-invalid={aviso?.error || undefined}
            aria-describedby="stand-intentos stand-aviso"
            className="absolute inset-0 size-full cursor-text rounded-2xl opacity-0"
          />
        </div>

        <p id="stand-intentos" className="flex items-center gap-2 text-sm text-marfil/85">
          <span className="inline-flex gap-1.5" aria-hidden>
            {Array.from({ length: INTENTOS }, (_, i) => (
              <span key={i} className={`size-3 rounded-full ${i < restantes ? "bg-naranja" : "bg-marfil/25"}`} />
            ))}
          </span>
          {restantes === 1 ? "Te queda 1 intento" : `Te quedan ${restantes} intentos`}
        </p>

        <p
          id="stand-aviso"
          role="status"
          aria-live="polite"
          className={`min-h-6 text-base font-semibold ${aviso?.error ? "text-naranja" : "text-marfil"}`}
        >
          {aviso?.texto ?? ""}
        </p>

        <button type="submit" disabled={enviando} className={`${boton("primario", "lg")} w-full max-w-xs`}>
          {enviando ? "Probando…" : "Probar"}
        </button>

        {probados.length > 0 && (
          <p className="text-sm text-marfil/75">Ya probaste: {probados.join(" · ")}</p>
        )}
        <p className="text-sm text-marfil/75">
          Quedan {juego.quedan} de {premios} tarjetas
        </p>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Paso 3: el final
// ---------------------------------------------------------------------------

function Final({ juego, premios, onOtraPersona }: { juego: Juego; premios: number; onOtraPersona: () => void }) {
  const otra = (
    <button
      type="button"
      onClick={onOtraPersona}
      className="mt-4 inline-flex min-h-11 items-center px-2 text-sm text-marfil/85 underline underline-offset-4 hover:text-marfil"
    >
      ¿Juega otra persona en este celular?
    </button>
  );

  if (juego.gano) {
    return (
      <section className="aparecer mt-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-naranja">¡Acertaste!</p>
        <h2 className="mt-2 font-display text-4xl font-semibold leading-tight text-marfil">
          Ganaste una de las {premios} tarjetas NFC
        </h2>
        <Image
          src="/nfc/tarjeta-pecera.webp"
          alt="Tarjeta NFC de Pecera"
          width={1200}
          height={751}
          className="flotar mx-auto mt-6 h-auto w-full max-w-xs rounded-2xl shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
        />
        <div className="mt-6 rounded-3xl bg-marfil px-5 py-5 text-tinta">
          <p className="text-sm font-semibold">Tu código</p>
          <p className="mt-1 font-mono text-5xl font-bold tracking-[0.2em]">{juego.codigo}</p>
          <p className="mt-3 text-sm leading-relaxed text-tinta/80">
            Mostrá esta pantalla en el stand de Pecera para retirarla. Sacale una captura por las dudas.
          </p>
        </div>
        {otra}
      </section>
    );
  }

  const acerto = juego.acerto;
  return (
    <section className="aparecer mt-8 rounded-3xl bg-marfil px-5 py-6 text-center text-tinta">
      <h2 className="font-display text-3xl font-semibold leading-tight">
        {acerto ? "¡Acertaste el número!" : "Esta vez no salió"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-tinta/80">
        {acerto
          ? `Justo se terminaron las ${premios} tarjetas. Pasá igual por el stand de Pecera: te queremos conocer.`
          : `Usaste tus ${INTENTOS} intentos. ¡Gracias por jugar! Pasá por el stand de Pecera y conocé la app.`}
      </p>
      <div className="mt-5 flex justify-center">
        <Link href="/" className={boton("primario", "lg")}>
          Conocé Pecera
        </Link>
      </div>
      <div className="[&>button]:text-tinta/80 [&>button:hover]:text-tinta">{otra}</div>
    </section>
  );
}
