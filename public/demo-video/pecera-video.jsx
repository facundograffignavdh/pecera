const C = { marfil: '#F5F4EC', tinta: '#1C1B16', pecera: '#F87C43', arcilla: '#D95A22', inversor: '#0C6AA8', aliado: '#1F7A52' };
const DISPLAY = "'Fraunces', Georgia, serif";
const SANS = "'Familjen Grotesk', system-ui, sans-serif";
const ROL = { emprendedor: { label: 'Emprendedor', bg: C.arcilla }, inversor: { label: 'Inversor', bg: C.inversor }, aliado: { label: 'Aliado', bg: C.aliado } };
const SW = 392, SH = 859;

// lib/mock-data.ts
const PERFILES = {
  raiz: { nombre: 'Raíz Verde', tipo: 'Startup', rol: 'emprendedor', poster: 'public/posters/pitch_1.jpg', piques: 127,
    descripcion: 'Convertimos la borra de café de bares porteños en sustrato para huertas urbanas. Ocho locales en Chacarita ya nos separan los residuos.',
    subtitulo: 'Convertimos la borra de café en sustrato para huertas.' },
  delta: { nombre: 'Delta Capital', tipo: 'Fondo', rol: 'inversor', poster: 'public/posters/pitch_2.jpg', piques: 84,
    descripcion: 'Fondo semilla enfocado en agtech y logística del Litoral. Tickets de USD 25k a 150k y acompañamiento operativo, no solo plata.',
    subtitulo: 'Buscamos proyectos de agtech y logística del Litoral.' },
  nodo: { nombre: 'Nodo Litoral', tipo: 'Incubadora', rol: 'aliado', poster: 'public/posters/pitch_3.jpg', piques: 56,
    descripcion: 'Incubadora de Paraná. Damos espacio, mentoría legal y contable durante seis meses a proyectos de la región que recién arrancan.',
    subtitulo: 'Acompañamos a proyectos que recién arrancan.' },
};

// ---- motion: the only three easings used ----
const prog = (T, s, d) => clamp((T - s) / d, 0, 1);
const MOTION = {
  enter: (T, s, d = 0.55) => Easing.easeOutQuart(prog(T, s, d)),
  draw: (T, s, d = 0.6) => Easing.easeInOutCubic(prog(T, s, d)),
  pop: (T, s, d = 0.5) => Easing.easeOutBack(prog(T, s, d)),
};
const lerp = (a, b, p) => a + (b - a) * p;
function kf(p, stops, vals) {
  if (p <= stops[0]) return vals[0];
  for (let i = 1; i < stops.length; i++) if (p <= stops[i]) return lerp(vals[i - 1], vals[i], (p - stops[i - 1]) / (stops[i] - stops[i - 1]));
  return vals[vals.length - 1];
}

// ---- components/Iconos.tsx ----
function Icono({ size, color = 'currentColor', grosor = 2.25, style, children }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" style={style}>{children}</svg>;
}
const SOMBRA = { filter: 'drop-shadow(0 1px 2px rgb(28 27 22 / 0.55))' };
const Corazon = ({ lleno, ...p }) => <Icono {...p}><path d="M12 20s-7.5-4.5-7.5-10.5A4.25 4.25 0 0 1 12 7a4.25 4.25 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20z" fill={lleno ? 'currentColor' : 'none'} /></Icono>;
const Sonido = (p) => <Icono {...p}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6" /><path d="M18.5 6.5a8 8 0 0 1 0 11" /></Icono>;
const Subs = (p) => <Icono {...p}><rect x="2.75" y="5.5" width="18.5" height="13" rx="3.5" /><path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6" /><path d="M17 10.2a2.2 2.2 0 1 0 0 3.6" /></Icono>;
const Cerrar = (p) => <Icono {...p} grosor={3}><path d="M7 7l10 10M17 7 7 17" /></Icono>;

const VIDRIO = { background: 'rgba(255,253,246,0.62)', border: '1px solid rgba(255,255,255,0.55)', backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)' };

function iniciales(n) { return n.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join(''); }
function Avatar({ perfil, size }) {
  return <span style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: ROL[perfil.rol].bg, color: C.marfil, fontFamily: DISPLAY, fontWeight: 600, fontSize: size * 0.38 }}>{iniciales(perfil.nombre)}</span>;
}

// ---- phone (components/landing/MaquetaReel.tsx frame, scaled) ----
function Phone({ children, style }) {
  return (
    <div style={{ position: 'absolute', width: SW + 28, height: SH + 28, padding: 14, borderRadius: 66, background: C.tinta, boxSizing: 'border-box',
      boxShadow: '0 4px 8px rgb(28 27 22 / 0.12), 0 50px 110px rgb(28 27 22 / 0.28)', ...style }}>
      <div style={{ position: 'relative', width: SW, height: SH, borderRadius: 54, overflow: 'hidden', background: C.tinta }}>{children}</div>
    </div>
  );
}

// components/Encabezado.tsx
function Encabezado({ variante }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 14, display: 'flex', justifyContent: 'center', zIndex: 5 }}>
      <div style={{ ...VIDRIO, borderRadius: 999, padding: '8px 16px', display: 'flex', alignItems: 'center' }}>
        {variante === 'feed'
          ? <img src="public/brand/isotipo-naranja.png" style={{ width: 43, height: 28, objectFit: 'contain' }} />
          : <img src="public/brand/logo-combinado-tinta.png" style={{ width: 112, height: 24, objectFit: 'contain' }} />}
      </div>
    </div>
  );
}

// components/Reel.tsx
function Reel({ perfil, T, piqueado = false, piques, latido = 0, tap = null, zoom = 1 }) {
  const rol = ROL[perfil.rol];
  const beat = latido > 0 && latido < 1 ? kf(latido, [0, 0.3, 0.6, 0.8, 1], [1, 1.28, 0.9, 1.06, 1]) : 1;
  const count = piques ?? perfil.piques;
  return (
    <div style={{ position: 'relative', width: SW, height: SH, overflow: 'hidden', background: C.tinta, fontFamily: SANS }}>
      <img src={perfil.poster} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }} />
      {tap && tap.p > 0 && tap.p < 1 && (
        <span style={{ position: 'absolute', left: tap.x, top: tap.y, width: 96, height: 96, color: C.pecera, zIndex: 3,
          opacity: kf(tap.p, [0, 0.15, 0.65, 1], [0, 1, 1, 0]),
          transform: `translate(-50%, calc(-50% - ${kf(tap.p, [0, 0.65, 1], [0, 0, 40])}px)) rotate(-8deg) scale(${kf(tap.p, [0, 0.15, 0.3, 0.65, 1], [0.5, 1.15, 1, 1, 1.1])})` }}>
          <Corazon lleno size={96} style={SOMBRA} />
        </span>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', background: 'linear-gradient(to top, #1C1B16 0%, rgba(28,27,22,0.8) 50%, rgba(28,27,22,0) 100%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 8px 32px 20px', color: C.marfil }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 auto 16px', maxWidth: '32ch', textAlign: 'center', fontSize: 17, fontWeight: 500, lineHeight: 1.6 }}>
              <span style={{ background: 'rgba(28,27,22,0.75)', borderRadius: 4, padding: '2px 8px', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{perfil.subtitulo}</span>
            </p>
          </div>
          <div style={{ width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: piqueado ? C.pecera : C.marfil }}>
                <Corazon lleno={piqueado} size={32} style={{ ...SOMBRA, transform: `scale(${beat})` }} />
              </span>
              <span style={{ marginTop: -4, fontSize: 12, fontWeight: 600, textShadow: '0 1px 2px rgb(28 27 22 / 0.55)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
            </div>
            <span style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Subs size={28} style={SOMBRA} /></span>
            <span style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sonido size={28} style={SOMBRA} /></span>
          </div>
        </div>
        <div style={{ marginTop: 12, paddingRight: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar perfil={perfil} size={48} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>{perfil.nombre}</div>
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 500, background: rol.bg }}>{rol.label}</span>
                <span style={{ color: 'rgba(245,244,236,0.7)' }}>{perfil.tipo}</span>
              </div>
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.625, color: 'rgba(245,244,236,0.9)' }}>{perfil.descripcion}</p>
          <span style={{ marginTop: 16, display: 'inline-flex', borderRadius: 999, background: C.arcilla, padding: '10px 20px', fontWeight: 500, fontSize: 16 }}>Ver perfil</span>
        </div>
      </div>
    </div>
  );
}

// components/PopupPique.tsx + EscenaPique.tsx
function PopupPique({ T, t0, nombre }) {
  const p = MOTION.enter(T, t0, 0.55);
  if (p <= 0) return null;
  const f = MOTION.enter(T, t0, 0.8);
  const r = prog(T, t0 + 0.85, 0.7);
  const a = kf(r, [0, 0.2, 0.42, 0.62, 0.8, 1], [0, 9, -3, 1.8, -0.6, 0]);
  const txt = MOTION.enter(T, t0 + 1.1, 0.45);
  const bub = (d) => { const b = prog(T, t0 + d, 0.9); return { opacity: b <= 0 || b >= 1 ? 0 : kf(b, [0, 0.2, 1], [0, 1, 0]), dy: -18 * b }; };
  const b1 = bub(0.85), b2 = bub(0.98), b3 = bub(1.1);
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8, background: `rgba(28,27,22,${0.45 * p})`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: SANS }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 280, borderRadius: 16, padding: '20px 20px 16px', textAlign: 'center', color: C.tinta, boxSizing: 'border-box',
        background: 'rgba(255,253,246,0.5)', border: '1px solid rgba(255,255,255,0.55)', backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        boxShadow: '0 1px 2px rgb(28 27 22 / 0.12), 0 16px 40px rgb(28 27 22 / 0.22)', opacity: p, transform: `translateY(${14 * (1 - p)}px)` }}>
        <svg viewBox="0 0 200 100" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto', width: 144, height: 72 }}>
          <path d="M-4 52q12.5-5 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0" stroke="#1C1B16" strokeOpacity={0.25} strokeWidth={2} />
          <g stroke="#1C1B16" strokeOpacity={0.4} strokeWidth={1.5}>
            <circle cx="121" cy={74 + b1.dy} r="2.6" opacity={b1.opacity} />
            <circle cx="115" cy={68 + b2.dy} r="1.9" opacity={b2.opacity} />
            <circle cx="124" cy={64 + b3.dy} r="1.5" opacity={b3.opacity} />
          </g>
          <g stroke="#1C1B16">
            <path d="M4 45 22 38" strokeWidth={7} />
            <path d="M22 38 90 18" strokeWidth={4.5} />
            <circle cx="26" cy="44" r="4" strokeWidth={3} />
          </g>
          <g transform={`rotate(${a} 90 18)`}>
            <path d="M90 18 112 13" stroke="#1C1B16" strokeWidth={4} />
            <g transform={`rotate(${a} 112 13)`}>
              <path d="M112 13 132 8" stroke="#1C1B16" strokeWidth={3.25} />
              <g transform={`rotate(${-2 * a} 132 8)`}>
                <path d="M132 8v62" stroke="#1C1B16" strokeOpacity={0.7} strokeWidth={1.25} />
                <g transform={`translate(${70 * (1 - f)} ${5 * (1 - f)})`} opacity={clamp(f * 5, 0, 1)}>
                  <path d="M163 78c4-4 8-8 14-10-2 6-2 14 0 20-6-2-10-6-14-10z" fill="#F7A878" />
                  <path d="M141 70c4-7 12-8 17-1z" fill="#F7A878" />
                  <path d="M129 78c0-8 10-10.5 20-10 8 .5 13 5 16 10-3 5-8 9.5-16 10-10 .5-20-2-20-10z" fill="#F87C43" />
                  <path d="M146 81c3 3 7 4 9.5 2-3-2.5-6.5-3-9.5-2z" fill="#F7A878" />
                  <path d="M141 72.5c1.8 3.5 1.8 7.5 0 11" stroke="#F7A878" strokeWidth={1.5} />
                  <circle cx="135.5" cy="76" r="2" fill="#1C1B16" />
                </g>
                <path d="M132 69v7a4 4 0 0 1-8 0v-2" stroke="#1C1B16" strokeWidth={2.25} />
              </g>
            </g>
          </g>
        </svg>
        <div style={{ opacity: txt, transform: `translateY(${6 * (1 - txt)}px)` }}>
          <div style={{ marginTop: 8, fontFamily: DISPLAY, fontSize: 26, fontWeight: 600, lineHeight: 1.25 }}>¡Te picó!</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 18, lineHeight: 1.25 }}>¡Que no se te escape!</div>
          <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.375 }}>A {nombre} le va a gustar saber que te interesó. Arrancá la charla.</p>
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', borderRadius: 999, background: C.arcilla, padding: '12px 16px', fontSize: 18, fontWeight: 700, color: C.marfil }}>Escribir por WhatsApp</div>
        <p style={{ margin: '12px 0 0', fontSize: 12, whiteSpace: 'nowrap' }}>Un pique es interés, no compromiso.</p>
        <span style={{ position: 'absolute', right: 4, top: 4, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(28,27,22,0.15)', background: 'rgba(245,244,236,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}><Cerrar size={18} /></span>
        </span>
      </div>
    </div>
  );
}

// app/p/[slug]/page.tsx
function Perfil({ perfil, activo = -1, toque = 0 }) {
  const rol = ROL[perfil.rol];
  const canales = ['WhatsApp', 'Email', 'LinkedIn', 'Instagram', 'Sitio web'];
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.marfil, fontFamily: SANS, color: C.tinta }}>
      <Encabezado variante="perfil" />
      <div style={{ padding: '84px 20px 24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(28,27,22,0.7)', whiteSpace: 'nowrap' }}><span>←</span> Volver al feed</div>
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar perfil={perfil} size={72} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>{perfil.nombre}</div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 500, color: C.marfil, background: rol.bg }}>{rol.label}</span>
              <span style={{ color: 'rgba(28,27,22,0.6)' }}>{perfil.tipo}</span>
            </div>
          </div>
        </div>
        <p style={{ margin: '20px 0 0', fontSize: 16, lineHeight: 1.625, color: 'rgba(28,27,22,0.9)' }}>{perfil.descripcion}</p>
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', color: 'rgba(28,27,22,0.5)' }}>Escribile</div>
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {canales.map((c, i) => (
              <span key={c} style={{ position: 'relative', display: 'inline-flex', borderRadius: 999, border: `1px solid ${i === activo ? C.arcilla : 'rgba(28,27,22,0.25)'}`, color: i === activo ? C.arcilla : C.tinta, padding: '8px 16px', fontSize: 14, whiteSpace: 'nowrap' }}>
                {c}
                {i === activo && toque > 0 && toque < 1 && (
                  <span style={{ position: 'absolute', left: '50%', top: '50%', width: 52, height: 52, borderRadius: '50%', background: 'rgba(28,27,22,0.22)', border: '2px solid rgba(255,253,246,0.9)',
                    transform: `translate(-50%,-50%) scale(${kf(toque, [0, 0.25, 0.45, 1], [1.3, 1, 0.85, 1.2])})`, opacity: kf(toque, [0, 0.2, 0.7, 1], [0, 1, 1, 0]) }} />
                )}
              </span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em', color: 'rgba(28,27,22,0.5)' }}>Su pitch</div>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <img src={perfil.poster} style={{ display: 'block', width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', borderRadius: 12 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- kinetic type ----
function TypeLine({ T, t0, text, cps = 18, size = 72, style }) {
  const n = Math.max(0, (T - t0) * cps);
  return (
    <div style={{ fontFamily: SANS, fontSize: size, fontWeight: 500, letterSpacing: '-0.02em', color: C.tinta, whiteSpace: 'pre', ...style }}>
      {text.split('').map((ch, i) => {
        const age = n - i;
        if (age <= 0) return <span key={i} style={{ opacity: 0 }}>{ch}</span>;
        const tail = age < 4;
        return <span key={i} style={{ color: tail ? C.arcilla : C.tinta, opacity: tail ? clamp(0.3 + age * 0.25, 0, 1) : 1 }}>{ch}</span>;
      })}
    </div>
  );
}
function Words({ T, t0, lines, size = 84, stagger = 0.06, style }) {
  let k = 0;
  return (
    <div style={{ fontFamily: SANS, fontSize: size, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.08, color: C.tinta, width: 'max-content', ...style }}>
      {lines.map((ln, li) => (
        <div key={li} style={{ display: 'flex', whiteSpace: 'nowrap', columnGap: '0.26em' }}>
          {ln.map((w, wi) => {
            const p = MOTION.enter(T, t0 + (k++) * stagger, 0.8);
            const acc = w.startsWith('*');
            return <span key={wi} style={{ display: 'inline-block', opacity: p, transform: `translateY(${55 * (1 - p)}%)`,
              ...(acc ? { fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 600, color: C.arcilla, letterSpacing: '-0.01em' } : {}) }}>{acc ? w.slice(1) : w}</span>;
          })}
        </div>
      ))}
    </div>
  );
}
const L = (s) => s.split(' ');
const FULL = { position: 'absolute', inset: 0, overflow: 'hidden' };
const center = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

// ---- sections ----
function S1({ T, CUES }) {
  const c = CUES.Presentamos;
  return (
    <Shot from={c} to={CUES.Hero}>
      <div style={{ ...FULL, ...center, background: C.marfil }}>
        <div style={{ transform: `scale(${lerp(1, 1.06, prog(T, c, 2.6))})` }}>
          <TypeLine T={T} t0={c + 0.3} text="Presentamos Pecera" cps={14} size={80} />
        </div>
      </div>
    </Shot>
  );
}

function Fondo({ T }) {
  const d = Math.sin(T * 0.5) * 4;
  return <div style={{ ...FULL, background: `radial-gradient(circle at ${18 + d}% ${28 - d}%, rgba(248,124,67,0.20), rgba(248,124,67,0) 50%), radial-gradient(circle at ${82 - d}% ${78 + d}%, rgba(12,106,168,0.16), rgba(12,106,168,0) 52%), ${C.marfil}` }} />;
}

function S2({ T, CUES }) {
  const c = CUES.Hero;
  const ph = MOTION.enter(T, c + 0.1, 0.9);
  const drift = prog(T, c, 3.8);
  return (
    <Shot from={c} to={CUES.Feed}>
      <div style={FULL}>
        <Fondo T={T} />
        <div style={{ position: 'absolute', left: 170, top: 330, width: 1000, transform: `translateY(${-14 * drift}px)` }}>
          <Words T={T} t0={c + 0.2} size={92} lines={[L('donde cualquiera puede'), L('descubrir y conectar con'), ['*emprendedores.']]} />
        </div>
        <Phone style={{ left: 1260, top: 96, transform: `translateY(${lerp(420, 0, ph) - 20 * drift}px) rotate(${lerp(-12, -5, ph) + 2 * drift}deg) scale(0.92)`, opacity: clamp(ph * 3, 0, 1) }}>
          <div style={{ position: 'absolute', inset: 0, background: C.marfil, ...center }}>
            <img src="public/brand/logo-combinado-tinta.png" style={{ width: 220, opacity: MOTION.enter(T, c + 0.8, 0.6) }} />
          </div>
        </Phone>
      </div>
    </Shot>
  );
}

function FeedScreen({ T, perfiles, scroll, zoom = 1 }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ transform: `translateY(${-scroll * SH}px)` }}>
        {perfiles.map((p, i) => <Reel key={i} perfil={p} T={T} zoom={zoom} />)}
      </div>
      <Encabezado variante="feed" />
    </div>
  );
}

function Swipe({ T, t0 }) {
  const p = prog(T, t0 - 0.25, 0.95);
  if (p <= 0 || p >= 1) return null;
  const m = MOTION.draw(T, t0, 0.6);
  return <span style={{ position: 'absolute', left: SW / 2 + 40, top: lerp(600, 260, m), width: 56, height: 56, marginLeft: -28, borderRadius: '50%', background: 'rgba(28,27,22,0.28)', border: '2px solid rgba(255,253,246,0.9)', zIndex: 6, opacity: kf(p, [0, 0.2, 0.8, 1], [0, 1, 1, 0]) }} />;
}

function S3({ T, CUES }) {
  const c = CUES.Feed;
  const s1 = c + 1.5, s2 = c + 3.1;
  const scroll = MOTION.draw(T, s1) + MOTION.draw(T, s2);
  const ph = MOTION.enter(T, c, 0.7);
  const drift = prog(T, c, 4.8);
  return (
    <Shot from={c} to={CUES.Fundadores}>
      <div style={FULL}>
        <Fondo T={T} />
        <Phone style={{ left: 300, top: 96, transform: `translateY(${lerp(60, 0, ph)}px) scale(${lerp(0.96, 1, ph) + 0.02 * drift})` }}>
          <FeedScreen T={T} perfiles={[PERFILES.raiz, PERFILES.delta, PERFILES.nodo]} scroll={scroll} zoom={1 + 0.05 * drift} />
          <Swipe T={T} t0={s1} />
          <Swipe T={T} t0={s2} />
        </Phone>
        <div style={{ position: 'absolute', left: 900, top: 290 }}>
          <TypeLine T={T} t0={c + 0.2} text="como en tus redes, pero con la feria." cps={34} size={38} style={{ marginBottom: 36, color: C.tinta }} />
          <Words T={T} t0={c + 0.6} size={104} lines={[L('Deslizá entre'), L('pitches de'), ['*90', '*segundos.']]} />
        </div>
      </div>
    </Shot>
  );
}

function S4({ T, CUES }) {
  const c = CUES.Fundadores;
  return (
    <Shot from={c} to={CUES.Pique}>
      <div style={{ ...FULL, ...center, background: C.marfil }}>
        <div style={{ transform: `scale(${lerp(1, 1.05, prog(T, c, 2.2))})` }}>
          <TypeLine T={T} t0={c + 0.15} text="Mirá a cada participante contar su idea." cps={30} size={72} />
        </div>
      </div>
    </Shot>
  );
}

function S5({ T, CUES }) {
  const c = CUES.Pique;
  const tap = c + 1.0, pop = c + 1.55;
  const cam = MOTION.draw(T, c + 1.4, 2.4);
  const ph = MOTION.enter(T, c, 0.7);
  const piqueado = T >= tap;
  return (
    <Shot from={c} to={CUES.Pregunta}>
      <div style={FULL}>
        <Fondo T={T} />
        <div style={{ position: 'absolute', left: 170, top: 360 }}>
          <Words T={T} t0={c + 0.2} size={100} lines={[L('¿Te interesa?'), ['Dale', '*pique.']]} />
        </div>
        <div style={{ position: 'absolute', left: 1120, top: 96, width: SW + 28, height: SH + 28, transform: `translateY(${lerp(80, 0, ph)}px) scale(${lerp(1, 1.14, cam)})`, transformOrigin: '50% 55%' }}>
          <Phone style={{ left: 0, top: 0 }}>
            <Reel perfil={PERFILES.raiz} T={T} piqueado={piqueado} piques={piqueado ? 128 : 127}
              latido={prog(T, tap, 0.45)} tap={{ x: 190, y: 360, p: prog(T, tap, 0.9) }} zoom={1 + 0.04 * prog(T, c, 4.2)} />
            <Encabezado variante="feed" />
            <PopupPique T={T} t0={pop} nombre="Raíz Verde" />
          </Phone>
        </div>
      </div>
    </Shot>
  );
}

function S6({ T, CUES }) {
  const c = CUES.Pregunta, burst = c + 1.25;
  const out = MOTION.enter(T, burst - 0.1, 0.25);
  const b = MOTION.enter(T, burst, 0.6);
  const bf = prog(T, burst, 0.6);
  const dots = Array.from({ length: 12 }, (_, i) => i);
  return (
    <Shot from={c} to={CUES.Perfil}>
      <div style={{ ...FULL, ...center, background: C.marfil }}>
        <div style={{ opacity: 1 - out, transform: `scale(${lerp(1, 1.05, prog(T, c, 1.3)) * (1 - 0.3 * out)})` }}>
          <TypeLine T={T} t0={c + 0.15} text="¿Te picó alguno?" cps={18} size={84} />
        </div>
        {bf > 0 && bf < 1 && (
          <div style={{ position: 'absolute', left: 960, top: 540 }}>
            <span style={{ position: 'absolute', width: 40, height: 40, margin: -20, borderRadius: '50%', background: C.pecera, transform: `scale(${kf(bf, [0, 0.3, 1], [0, 1.3, 0])})` }} />
            {dots.map((i) => {
              const a = (i / 12) * Math.PI * 2, rr = (i % 2 ? 70 : 110) * b, s = i % 2 ? 12 : 18;
              return <span key={i} style={{ position: 'absolute', width: s, height: s, margin: -s / 2, borderRadius: '50%', background: C.pecera, transform: `translate(${Math.cos(a) * rr}px, ${Math.sin(a) * rr}px) scale(${1 - bf})` }} />;
            })}
          </div>
        )}
      </div>
    </Shot>
  );
}

const PILLS = [
  { t: 'Quién es', bg: 'rgba(217,90,34,0.12)', fg: C.arcilla, icon: null },
  { t: 'Su pitch de 90 s', bg: 'rgba(12,106,168,0.12)', fg: C.inversor, icon: Sonido },
  { t: 'Subtítulos', bg: 'rgba(31,122,82,0.13)', fg: C.aliado, icon: Subs },
  { t: 'Sus piques', bg: 'rgba(248,124,67,0.2)', fg: C.arcilla, icon: Corazon },
  { t: 'Cómo escribirle', bg: 'rgba(28,27,22,0.08)', fg: C.tinta, icon: null },
];
function S7({ T, CUES }) {
  const c = CUES.Perfil, step = 0.5, t1 = c + 0.35;
  const shown = PILLS.reduce((a, _, i) => a + MOTION.draw(T, t1 + i * step, 0.4), 0);
  return (
    <Shot from={c} to={CUES.Escribile}>
      <div style={{ ...FULL, background: C.marfil }}>
        <div style={{ position: 'absolute', left: 700, top: 540, transform: `translateY(${-shown * 50}px)` }}>
          <div style={{ fontFamily: SANS, fontSize: 36, color: 'rgba(28,27,22,0.6)', marginBottom: 22, opacity: MOTION.enter(T, c, 0.4) }}>Cada perfil te muestra</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18, borderLeft: '2px solid rgba(28,27,22,0.14)', paddingLeft: 28 }}>
            {PILLS.map((pl, i) => {
              const p = MOTION.pop(T, t1 + i * step, 0.5);
              const I = pl.icon;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 26px', borderRadius: 16, background: pl.bg, color: pl.fg, fontFamily: SANS, fontSize: 56, fontWeight: 500, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                  opacity: clamp(p * 2, 0, 1), transform: `scale(${lerp(0.6, 1, p)})`, transformOrigin: '0% 50%' }}>
                  {pl.t}{I && <I size={44} lleno={I === Corazon} />}
                </div>
              );
            })}
            <div style={{ fontFamily: SANS, fontSize: 30, color: 'rgba(28,27,22,0.55)', opacity: MOTION.enter(T, t1 + 5 * step, 0.4) }}>y más</div>
          </div>
        </div>
      </div>
    </Shot>
  );
}

function S8({ T, CUES }) {
  const c = CUES.Escribile, swap = c + 2.3, tap = c + 3.3;
  const rot = MOTION.draw(T, c + 0.2, 1.5);
  const out1 = MOTION.enter(T, swap - 0.3, 0.4);
  const cam = MOTION.draw(T, c + 2.6, 2.2);
  return (
    <Shot from={c} to={CUES.Cierre}>
      <div style={FULL}>
        <Fondo T={T} />
        <div style={{ position: 'absolute', left: 170, top: 380, opacity: 1 - out1, transform: `translateY(${-30 * out1}px)` }}>
          <Words T={T} t0={c + 0.2} size={92} lines={[L('Y cuando encontrás'), L('a quien buscabas,')]} />
        </div>
        {T >= swap - 0.1 && (
          <div style={{ position: 'absolute', left: 170, top: 380 }}>
            <Words T={T} t0={swap} size={100} lines={[L('escribile directo'), ['*desde', '*tu', '*celular.']]} />
          </div>
        )}
        <div style={{ position: 'absolute', left: 1180, top: 96, width: SW + 28, height: SH + 28, perspective: 1800 }}>
          <div style={{ width: '100%', height: '100%', transform: `translateX(${lerp(260, 0, rot)}px) rotateY(${lerp(-80, -6, rot)}deg) rotateZ(${lerp(6, 2, rot)}deg) scale(${lerp(1, 1.1, cam)})`, transformOrigin: '50% 40%' }}>
            <Phone style={{ left: 0, top: 0 }}>
              <Perfil perfil={PERFILES.raiz} activo={T >= tap ? 0 : -1} toque={prog(T, tap - 0.15, 0.9)} />
            </Phone>
          </div>
        </div>
      </div>
    </Shot>
  );
}

function S9({ T, CUES, total, showLegal }) {
  const c = CUES.Cierre;
  const p = MOTION.pop(T, c + 0.1, 0.7);
  const fade = 1 - MOTION.enter(T, total - 0.45, 0.4);
  return (
    <Shot from={c} to={total + 1}>
      <div style={{ ...FULL, ...center, flexDirection: 'column', background: C.marfil }}>
        <div style={{ opacity: fade, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${lerp(1, 1.03, prog(T, c, 3.4))})` }}>
          <img src="public/brand/logo-combinado-tinta.png" style={{ width: 620, opacity: clamp(p * 2, 0, 1), transform: `scale(${lerp(0.9, 1, p)})` }} />
          <TypeLine T={T} t0={c + 0.75} text="Los pitches de la feria en 90 segundos." cps={34} size={40} style={{ marginTop: 44 }} />
          {showLegal && (
            <p style={{ marginTop: 56, maxWidth: 1000, textAlign: 'center', fontFamily: SANS, fontSize: 20, lineHeight: 1.5, color: 'rgba(28,27,22,0.6)', opacity: MOTION.enter(T, c + 1.6, 0.6) }}>
              Pecera es una capa de descubrimiento y conexión. No capta fondos del público, no custodia activos ni realiza oferta pública de valores o asesoramiento financiero.
            </p>
          )}
        </div>
      </div>
    </Shot>
  );
}

function Piece({ showLegal }) {
  const { T, CUES, time, authoredTotal } = useComposition();
  const props = { T, CUES };
  return (
    <div data-screen-label={`t=${Math.floor(time || 0)}s`} style={{ position: 'absolute', inset: 0, background: C.marfil, overflow: 'hidden' }}>
      <S1 {...props} /><S2 {...props} /><S3 {...props} /><S4 {...props} /><S5 {...props} />
      <S6 {...props} /><S7 {...props} /><S8 {...props} /><S9 {...props} total={authoredTotal} showLegal={showLegal} />
    </div>
  );
}

function PeceraVideo() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS || { motionEditor: true, showLegal: true });
  return (
    <React.Fragment>
      <CompositionStage width={1920} height={1080} bg={C.marfil} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <Piece showLegal={t.showLegal} />
      </CompositionStage>
      <TweaksPanel>
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
        <TweakToggle label="Leyenda legal al cierre" value={t.showLegal} onChange={(v) => setTweak('showLegal', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}
window.PeceraVideo = PeceraVideo;
