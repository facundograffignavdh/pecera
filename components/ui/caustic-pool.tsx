"use client"

import * as React from "react"

/**
 * Caustic Pool — shallow water you can stir, lit from above.
 *
 * A wave equation runs on a float texture (ping-ponged each step), and the
 * render pass reads that height field as a lens: the caustic is the area
 * compression of the refracted-ray map, which is the determinant of its
 * Jacobian, so bright veins land exactly where the surface focuses light
 * instead of where a noise function guessed. Everything else — the sand, the
 * absorption with depth, two suns, the Fresnel sky — is lit off the same field.
 *
 * Self-contained: raw WebGL2, React is the only import. No CSS file, no
 * animation library, and nothing here touches the host page — the canvas sizes
 * itself from its own box, not from the window.
 *
 * Needs WebGL2 with float (or half-float) render targets. Where that is
 * missing it paints a still gradient rather than a dead black rectangle.
 *
 * Pecera: traído de la rama claude/epic-faraday-ibnhir. Cambios: grilla 128 y
 * densidad 1 por defecto, pausa fuera de pantalla y fondo configurable.
 */

export type Vec3 = [number, number, number]

/**
 * Everything the piece can be tuned by. Every field is optional on the props;
 * these are the defaults, and a preset is a partial overlay on top of them.
 */
export type CausticParams = {
  // simulation
  propagation: number
  damping: number
  edgeWidth: number
  edgeDamp: number
  clampH: number
  simRate: number
  maxSub: number
  // the brush
  brushRadius: number
  brushBase: number
  brushGain: number
  brushMax: number
  clickStrength: number
  clickRadius: number
  // rain that keeps the pool alive
  ambient: boolean
  ambientCount: number
  ambientStrength: number
  ambientRate: number
  idle: number
  drivenMult: number
  // the attract-mode cursor
  ghost: boolean
  ghostReturn: number
  ghostFade: number
  ghostSpeed: number
  ghostGain: number
  // caustics
  causticA: number
  detFloor: number
  clamp1: number
  contrast: number
  clamp2: number
  floorBase: number
  causticGain: number
  veinThresh: number
  veinGain: number
  veinColor: Vec3
  // water
  baseDepth: number
  depthScale: number
  depthNoise: number
  depthNoiseAmp: number
  absorb: Vec3
  absorbScale: number
  deepColor: Vec3
  deepGain: number
  // refraction
  parallax: number
  nScale: number
  // suns
  sun1: Vec3
  sun2: Vec3
  spec1: number
  spec2: number
  spec2Gain: number
  glintGain: number
  glintColor: Vec3
  // fresnel
  fresnelPow: number
  fresnelGain: number
  skyColor: Vec3
  // sand
  sandHi: Vec3
  sandLo: Vec3
  rippleScale: number
  warpScale: number
  warp: number
  bandFreq: number
  bandSkew: number
  bandGain: number
  grainScale: number
  grainAmp: number
  // noise
  octaves: number
  lacunarity: number
  gain: number
  // post
  exposure: number
  grain: number
  gamma: number
  vigOuter: number
  vigInner: number
  vigDark: number
  vigBright: number
}

export const CAUSTIC_DEFAULTS: CausticParams = {
  propagation: 0.245,
  damping: 0.996,
  edgeWidth: 0.045,
  edgeDamp: 0.9,
  clampH: 1.6,
  simRate: 60,
  maxSub: 4,

  brushRadius: 0.032,
  brushBase: 0.012,
  brushGain: 0.9,
  brushMax: 0.09,
  clickStrength: 0.22,
  clickRadius: 0.05,

  ambient: true,
  ambientCount: 4,
  ambientStrength: 0.018,
  ambientRate: 1,
  idle: 2.2,
  drivenMult: 0.45,

  ghost: true,
  ghostReturn: 10,
  ghostFade: 1.5,
  ghostSpeed: 4,
  ghostGain: 2,

  causticA: 9,
  detFloor: 0.06,
  clamp1: 6,
  contrast: 1.22,
  clamp2: 8,
  floorBase: 0.34,
  causticGain: 0.3,
  veinThresh: 1,
  veinGain: 0.1,
  veinColor: [140, 204, 217],

  baseDepth: 1.05,
  depthScale: 1.4,
  depthNoise: 2,
  depthNoiseAmp: 0.25,
  absorb: [107, 33, 20],
  absorbScale: 1.7,
  deepColor: [5, 26, 37],
  deepGain: 0.3,

  parallax: 2.4,
  nScale: 8.5,

  sun1: [0.3, 0.45, 0.82],
  sun2: [-0.5, 0.15, 0.78],
  spec1: 150,
  spec2: 70,
  spec2Gain: 0.35,
  glintGain: 0.85,
  glintColor: [255, 247, 224],

  fresnelPow: 4,
  fresnelGain: 0.22,
  skyColor: [41, 77, 102],

  sandHi: [219, 179, 120],
  sandLo: [158, 117, 77],
  rippleScale: 6.5,
  warpScale: 3,
  warp: 0.6,
  bandFreq: 9,
  bandSkew: 4,
  bandGain: 0.06,
  grainScale: 240,
  grainAmp: 0.045,

  octaves: 4,
  lacunarity: 2.03,
  gain: 0.5,

  exposure: 1.55,
  grain: 0.022,
  gamma: 0.4545,
  vigOuter: 1.28,
  vigInner: 0.32,
  vigDark: 0.6,
  vigBright: 1.05,
}

/** Overlays on the defaults. Names are the water, not the numbers. */
export const CAUSTIC_PRESETS: Record<string, Partial<CausticParams>> = {
  tidepool: {},
  "deep-ocean": {
    causticA: 12, contrast: 1.5, veinGain: 0.16, veinColor: [120, 190, 235],
    floorBase: 0.22, causticGain: 0.26, baseDepth: 1.6, depthScale: 1.9,
    absorb: [70, 30, 14], absorbScale: 2.4, deepColor: [4, 22, 40], deepGain: 0.55,
    sandHi: [150, 160, 150], sandLo: [70, 90, 95], skyColor: [30, 66, 104],
    fresnelGain: 0.3, exposure: 1.35, glintColor: [220, 240, 255], glintGain: 0.7,
  },
  "golden-hour": {
    causticA: 8, contrast: 1.15, veinGain: 0.12, veinColor: [255, 214, 150],
    floorBase: 0.42, causticGain: 0.34, baseDepth: 0.9, depthScale: 1.1,
    absorb: [120, 55, 20], absorbScale: 1.4, deepColor: [24, 20, 12], deepGain: 0.28,
    sandHi: [240, 196, 130], sandLo: [176, 118, 66], sun1: [0.55, 0.18, 0.72],
    glintColor: [255, 236, 190], glintGain: 1.1, skyColor: [90, 70, 45],
    fresnelGain: 0.2, exposure: 1.75,
  },
  "ink-bath": {
    causticA: 16, contrast: 1.8, clamp2: 10, veinGain: 0.22, veinColor: [235, 240, 255],
    floorBase: 0.1, causticGain: 0.42, baseDepth: 1.4, depthScale: 2.2,
    absorb: [120, 120, 120], absorbScale: 2.6, deepColor: [3, 4, 6], deepGain: 0.35,
    sandHi: [120, 122, 128], sandLo: [24, 26, 30], grainAmp: 0.02,
    glintColor: [255, 255, 255], glintGain: 1.2, skyColor: [40, 44, 52],
    fresnelGain: 0.26, exposure: 1.9, grain: 0.05,
  },
  "alien-pool": {
    causticA: 11, contrast: 1.4, veinGain: 0.2, veinColor: [180, 255, 120],
    floorBase: 0.3, causticGain: 0.32, baseDepth: 1.2, depthScale: 1.6,
    absorb: [90, 20, 110], absorbScale: 2, deepColor: [30, 6, 44], deepGain: 0.5,
    sandHi: [120, 210, 150], sandLo: [40, 80, 120], glintColor: [200, 255, 220],
    glintGain: 0.9, skyColor: [70, 40, 110], fresnelGain: 0.28, exposure: 1.6,
  },
}

const MAX_DROPS = 12
type Kind = "f" | "i" | "c" | "v"
type Slot = [keyof CausticParams, Kind]

/** Which parameters reach the step shader, and as what. */
const UPDATE_UNIFORMS: Slot[] = [
  ["propagation", "f"], ["damping", "f"], ["edgeWidth", "f"], ["edgeDamp", "f"], ["clampH", "f"],
]

/** Which reach the render shader. `c` is a 0-255 colour, `v` a raw vec3. */
const RENDER_UNIFORMS: Slot[] = [
  ["causticA", "f"], ["detFloor", "f"], ["clamp1", "f"], ["contrast", "f"], ["clamp2", "f"],
  ["floorBase", "f"], ["causticGain", "f"], ["veinThresh", "f"], ["veinGain", "f"], ["veinColor", "c"],
  ["baseDepth", "f"], ["depthScale", "f"], ["depthNoise", "f"], ["depthNoiseAmp", "f"],
  ["absorb", "c"], ["absorbScale", "f"], ["deepColor", "c"], ["deepGain", "f"],
  ["parallax", "f"], ["nScale", "f"],
  ["sun1", "v"], ["sun2", "v"], ["spec1", "f"], ["spec2", "f"], ["spec2Gain", "f"],
  ["glintGain", "f"], ["glintColor", "c"],
  ["fresnelPow", "f"], ["fresnelGain", "f"], ["skyColor", "c"],
  ["sandHi", "c"], ["sandLo", "c"], ["rippleScale", "f"], ["warpScale", "f"], ["warp", "f"],
  ["bandFreq", "f"], ["bandSkew", "f"], ["bandGain", "f"], ["grainScale", "f"], ["grainAmp", "f"],
  ["octaves", "i"], ["lacunarity", "f"], ["gain", "f"],
  ["exposure", "f"], ["grain", "f"], ["gamma", "f"],
  ["vigOuter", "f"], ["vigInner", "f"], ["vigDark", "f"], ["vigBright", "f"],
]

const uName = (k: string) => "u" + k[0].toUpperCase() + k.slice(1)
const glslType = (kind: Kind) => (kind === "i" ? "int" : kind === "f" ? "float" : "vec3")
const declare = (slots: Slot[]) =>
  slots.map(([k, kind]) => "uniform " + glslType(kind) + " " + uName(k) + ";").join("\n")

const VERT = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

/** One step of the wave equation, plus whatever drops were queued this frame. */
const UPDATE = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uAspect;
uniform int uDropCount;
uniform vec4 uDrops[${MAX_DROPS}];
${declare(UPDATE_UNIFORMS)}
in vec2 vUv;
out vec4 o;
void main(){
  vec2 uv = vUv;
  float c = texture(uState, uv).r, p = texture(uState, uv).g;
  float l = texture(uState, uv - vec2(uTexel.x, 0.0)).r;
  float r = texture(uState, uv + vec2(uTexel.x, 0.0)).r;
  float u = texture(uState, uv + vec2(0.0, uTexel.y)).r;
  float d = texture(uState, uv - vec2(0.0, uTexel.y)).r;
  float nv = (2.0 * c - p) + (l + r + u + d - 4.0 * c) * uPropagation;
  nv *= uDamping;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropCount) break;
    vec2 dp = uv - uDrops[i].xy;
    dp.x *= uAspect;
    float rr = uDrops[i].w;
    nv += uDrops[i].z * exp(-dot(dp, dp) / (rr * rr));
  }
  vec2 e = min(uv, 1.0 - uv);
  nv *= mix(uEdgeDamp, 1.0, smoothstep(0.0, uEdgeWidth, min(e.x, e.y)));
  o = vec4(clamp(nv, -uClampH, uClampH), c, 0.0, 1.0);
}`

const RENDER = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAspect;
${declare(RENDER_UNIFORMS)}
in vec2 vUv;
out vec4 frag;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 8; i++) { if (i >= uOctaves) break; s += a * vnoise(p); p *= uLacunarity; a *= uGain; }
  return s;
}
vec3 sand(vec2 uv){
  vec2 p = uv * vec2(uAspect, 1.0);
  float rip = fbm(p * uRippleScale + fbm(p * uWarpScale) * uWarp);
  float band = 0.5 + 0.5 * sin(rip * uBandFreq + p.x * uBandSkew);
  vec3 b = mix(uSandHi, uSandLo, rip);
  b = mix(b, b * (1.0 + uBandGain), band);
  return b + (vnoise(p * uGrainScale) - 0.5) * uGrainAmp;
}
void main(){
  vec2 uv = vUv, t = uTexel;
  float hc = texture(uState, uv).r;
  float hl = texture(uState, uv - vec2(t.x, 0.0)).r, hr = texture(uState, uv + vec2(t.x, 0.0)).r;
  float hu = texture(uState, uv + vec2(0.0, t.y)).r, hd = texture(uState, uv - vec2(0.0, t.y)).r;
  float hpp = texture(uState, uv + t).r, hmm = texture(uState, uv - t).r;
  float hpm = texture(uState, uv + vec2(t.x, -t.y)).r, hmp = texture(uState, uv + vec2(-t.x, t.y)).r;
  float hx = (hr - hl) * 0.5, hy = (hu - hd) * 0.5;
  float hxx = hr - 2.0 * hc + hl, hyy = hu - 2.0 * hc + hd, hxy = (hpp - hpm - hmp + hmm) * 0.25;

  // The caustic is the area compression of the refracted-ray map: bright where
  // the surface focuses light, which is the determinant of its Jacobian.
  float jxx = 1.0 - uCausticA * hxx, jyy = 1.0 - uCausticA * hyy, jxy = -uCausticA * hxy;
  float det = jxx * jyy - jxy * jxy;
  float ca = clamp(1.0 / max(abs(det), uDetFloor), 0.0, uClamp1);
  ca = clamp(pow(ca, uContrast), 0.0, uClamp2);

  vec2 land = uv + vec2(hx, hy) * uParallax;
  vec3 col = sand(land) * (uFloorBase + ca * uCausticGain);
  col += uVeinColor * max(ca - uVeinThresh, 0.0) * uVeinGain;

  float depth = clamp(uBaseDepth - hc * uDepthScale + fbm(land * uDepthNoise) * uDepthNoiseAmp, 0.2, 3.0);
  col *= exp(-uAbsorb * depth * uAbsorbScale);
  col += uDeepColor * depth * uDeepGain;

  vec3 N = normalize(vec3(-hx * uNScale, -hy * uNScale, 1.0)), V = vec3(0.0, 0.0, 1.0);
  vec3 s1 = normalize(uSun1 + vec3(0.0, 0.0, 1e-4));
  vec3 s2 = normalize(uSun2 + vec3(0.0, 0.0, 1e-4));
  float sp = pow(max(dot(N, normalize(s1 + V)), 0.0), uSpec1)
           + pow(max(dot(N, normalize(s2 + V)), 0.0), uSpec2) * uSpec2Gain;
  col += sp * uGlintColor * uGlintGain;
  col = mix(col, uSkyColor, pow(1.0 - N.z, uFresnelPow) * uFresnelGain);
  col *= mix(uVigDark, uVigBright, smoothstep(uVigOuter, uVigInner, length((uv - 0.5) * vec2(uAspect, 1.0))));
  col = vec3(1.0) - exp(-col * uExposure);
  col += (hash(uv * uResolution + fract(uTime)) - 0.5) * uGrain;
  frag = vec4(pow(max(col, vec3(0.0)), vec3(uGamma)), 1.0);
}`

/** The three numbers the brush needs; the rest of the params are irrelevant. */
export type Brush = { brushBase: number; brushGain: number; brushMax: number }

// #region ghost
/**
 * The attract-mode cursor: an invisible hand that stirs the water before anyone
 * has touched it, and again after a long idle. Its path is a sum of sines whose
 * frequencies share no common multiple, so it wanders without ever repeating a
 * loop — the giveaway that would read as a screensaver.
 */
export function ghostPos(t: number, speed: number) {
  const TAU = 6.283185307
  const x = 0.5 + 0.3 * Math.sin(t * 0.037 * TAU * speed) + 0.12 * Math.sin(t * 0.011 * TAU * speed + 1.7)
  const y = 0.5 + 0.28 * Math.cos(t * 0.043 * TAU * speed) + 0.13 * Math.cos(t * 0.017 * TAU * speed + 4.1)
  return [Math.min(Math.max(x, 0.06), 0.94), Math.min(Math.max(y, 0.06), 0.94)]
}

/**
 * How hard the brush hits, given how far the pointer moved since the last
 * sample. Still pointers barely disturb the surface; fast ones cut a wake, up
 * to a ceiling — without which a flick across the canvas detonates the pool.
 */
export function brushStrength(distance: number, p: Brush) {
  return Math.min(p.brushBase + distance * p.brushGain, p.brushMax)
}

/** Ease a 0..1 envelope toward a target at a fixed rate per second. */
export function approach(current: number, target: number, step: number, seconds: number) {
  const rate = step / Math.max(seconds, 0.05)
  return current + Math.max(-rate, Math.min(rate, target - current))
}
// #endregion

export type CausticPoolProps = {
  /**
   * Explicit height. The canvas fills this box, so it must be a definite
   * length — "100%" only works if every ancestor has one too, which an
   * installed page usually does not.
   */
  height?: string
  /** A named preset, layered over the defaults. */
  preset?: keyof typeof CAUSTIC_PRESETS
  /** Overrides layered over the preset. */
  params?: Partial<CausticParams>
  /**
   * Simulation grid. 512 is lovely and costs four times 256; 128 by default, for
   * low-end phones.
   */
  resolution?: 128 | 256 | 512
  /**
   * Cap on the canvas device-pixel ratio. The render pass is a full-screen shader,
   * so this is the expensive knob; 1 by default (the water is soft anyway).
   */
  densidad?: number
  /**
   * What shows before the first frame and where WebGL2 is missing: a CSS
   * background, so the page never flashes a black box.
   */
  fondo?: string
  /** Pointer stirs the water. */
  interactive?: boolean
  /**
   * How touch is shared with the page. "scroll" keeps vertical scrolling and
   * draws on horizontal drags; "draw" takes the gesture outright, which is
   * right for a full-bleed piece and wrong inside an article.
   */
  touch?: "scroll" | "draw"
  className?: string
}

const FONDO_POR_DEFECTO =
  "radial-gradient(120% 90% at 40% 25%, #2a6b7d 0%, #16495c 35%, #0a2635 70%, #05070a 100%)"

export default function CausticPool({
  height = "100svh",
  preset = "tidepool",
  params,
  resolution = 128,
  densidad = 1,
  fondo = FONDO_POR_DEFECTO,
  interactive = true,
  touch = "scroll",
  className = "",
}: CausticPoolProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = React.useState(false)
  const [generation, setGeneration] = React.useState(0)
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  // Defaults < preset < explicit params. Rebuilt only when one of them changes.
  const P = React.useMemo<CausticParams>(
    () => ({ ...CAUSTIC_DEFAULTS, ...(CAUSTIC_PRESETS[preset] ?? {}), ...(params ?? {}) }),
    [preset, params],
  )
  // The loop reads through a ref, so tuning a value never restarts WebGL.
  const paramsRef = React.useRef(P)
  React.useEffect(() => {
    paramsRef.current = P
  }, [P])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: "high-performance",
    })
    if (!gl) {
      setFailed(true)
      return
    }
    // Rendering into a float texture is the whole technique; without it there
    // is nothing to fall back to but a picture of water.
    const float = gl.getExtension("EXT_color_buffer_float")
    const half = gl.getExtension("EXT_color_buffer_half_float")
    if (!float && !half) {
      setFailed(true)
      return
    }
    gl.getExtension("OES_texture_half_float_linear")

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)
      if (!s) return null
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("caustic-pool:", gl.getShaderInfoLog(s))
        return null
      }
      return s
    }
    const link = (vs: string, fs: string) => {
      const v = compile(gl.VERTEX_SHADER, vs)
      const f = compile(gl.FRAGMENT_SHADER, fs)
      const p = v && f ? gl.createProgram() : null
      if (!p || !v || !f) return null
      gl.attachShader(p, v)
      gl.attachShader(p, f)
      gl.linkProgram(p)
      gl.deleteShader(v)
      gl.deleteShader(f)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("caustic-pool:", gl.getProgramInfoLog(p))
        return null
      }
      return p
    }

    const stepProgram = link(VERT, UPDATE)
    const drawProgram = link(VERT, RENDER)
    if (!stepProgram || !drawProgram) {
      setFailed(true)
      return
    }

    const findUniforms = (p: WebGLProgram, slots: Slot[], fixed: string[]) => {
      const tuned = slots.map(([k, kind]) => [gl.getUniformLocation(p, uName(k)), k, kind] as const)
      const named: Record<string, WebGLUniformLocation | null> = {}
      for (const n of fixed) named[n] = gl.getUniformLocation(p, n)
      return { tuned, named }
    }
    const stepU = findUniforms(stepProgram, UPDATE_UNIFORMS, [
      "uState", "uTexel", "uAspect", "uDropCount", "uDrops",
    ])
    const drawU = findUniforms(drawProgram, RENDER_UNIFORMS, [
      "uState", "uTexel", "uResolution", "uTime", "uAspect",
    ])

    const upload = (u: typeof stepU, p: CausticParams) => {
      for (const [loc, key, kind] of u.tuned) {
        const value = p[key]
        if (kind === "c") {
          const c = value as Vec3
          gl.uniform3f(loc, c[0] / 255, c[1] / 255, c[2] / 255)
        } else if (kind === "v") {
          const c = value as Vec3
          gl.uniform3f(loc, c[0], c[1], c[2])
        } else if (kind === "i") {
          gl.uniform1i(loc, (value as number) | 0)
        } else {
          gl.uniform1f(loc, value as number)
        }
      }
    }

    // ---- ping-pong float targets -------------------------------------------
    const grid = resolution
    const makeTarget = () => {
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, grid, grid, 0, gl.RGBA, gl.HALF_FLOAT, null)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      return { tex, fbo }
    }
    const targets = [makeTarget(), makeTarget()]
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      setFailed(true)
      return
    }
    for (const t of targets) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo)
      gl.viewport(0, 0, grid, grid)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    let read = 0
    const vao = gl.createVertexArray()

    // ---- sizing, from the element rather than the window --------------------
    let cssW = 1
    let cssH = 1
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, densidad)
      cssW = Math.max(canvas.clientWidth, 1)
      cssH = Math.max(canvas.clientHeight, 1)
      const w = Math.floor(cssW * dpr)
      const h = Math.floor(cssH * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    // ---- drops --------------------------------------------------------------
    const dropData = new Float32Array(MAX_DROPS * 4)
    let queued: number[][] = []
    const drop = (x: number, y: number, strength: number, radius: number) => {
      if (queued.length < MAX_DROPS) queued.push([x, y, strength, radius])
    }
    const flushDrops = () => {
      const n = Math.min(queued.length, MAX_DROPS)
      for (let i = 0; i < n; i++) dropData.set(queued[i], i * 4)
      queued = []
      return n
    }

    type Source = {
      px: number; py: number; ax: number; ay: number
      sx: number; sy: number; phx: number; phy: number
      next: number; period: number
    }
    let sources: Source[] = []
    const seedSources = (n: number) => {
      sources = []
      for (let i = 0; i < n; i++) {
        sources.push({
          px: 0.2 + 0.6 * Math.random(), py: 0.2 + 0.6 * Math.random(),
          ax: 0.1 + 0.1 * Math.random(), ay: 0.1 + 0.1 * Math.random(),
          sx: 0.05 + 0.08 * Math.random(), sy: 0.05 + 0.08 * Math.random(),
          phx: Math.random() * 6.28, phy: Math.random() * 6.28,
          next: Math.random() * 1.2, period: 0.7 + Math.random() * 1.1,
        })
      }
    }
    let sourceCount = paramsRef.current.ambientCount
    seedSources(sourceCount)

    const t0 = performance.now()
    const clock = () => (performance.now() - t0) / 1000

    let pointerX = 0.5
    let pointerY = 0.5
    let pointerSeen = false
    let pointerDown = false
    let lastTouched = -1e9

    const toUv = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect()
      return [
        Math.min(Math.max((e.clientX - r.left) / Math.max(r.width, 1), 0), 1),
        Math.min(Math.max(1 - (e.clientY - r.top) / Math.max(r.height, 1), 0), 1),
      ]
    }
    const onMove = (e: PointerEvent) => {
      if (!interactive) return
      const p = paramsRef.current
      const [x, y] = toUv(e)
      // The first move has no previous sample: measuring against the centre
      // would land a full-strength wake wherever the pointer happened to enter.
      if (pointerSeen && (pointerDown || e.pointerType === "mouse")) {
        const dist = Math.hypot(x - pointerX, y - pointerY)
        drop(x, y, brushStrength(dist, p), p.brushRadius)
      }
      pointerX = x
      pointerY = y
      pointerSeen = true
      lastTouched = clock()
    }
    const onDown = (e: PointerEvent) => {
      if (!interactive) return
      const p = paramsRef.current
      const [x, y] = toUv(e)
      pointerDown = true
      drop(x, y, p.clickStrength, p.clickRadius)
      pointerX = x
      pointerY = y
      pointerSeen = true
      lastTouched = clock()
    }
    const onUp = () => {
      pointerDown = false
    }
    const onLeave = () => {
      pointerDown = false
      pointerSeen = false
    }

    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointerup", onUp)
    canvas.addEventListener("pointercancel", onUp)
    canvas.addEventListener("pointerleave", onLeave)

    const onLost = (e: Event) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onRestored = () => setGeneration((g) => g + 1)
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    // ---- ambient rain and the ghost ----------------------------------------
    let ghostEnv = 0
    let ghostX = 0.5
    let ghostY = 0.5
    let ghostSeeded = false

    const stirAmbient = (t: number, step: number) => {
      const p = paramsRef.current
      if (!p.ambient) return
      if (p.ambientCount !== sourceCount) {
        seedSources(p.ambientCount)
        sourceCount = p.ambientCount
      }
      const idle = t - lastTouched > p.idle
      for (const s of sources) {
        s.next -= step
        if (s.next > 0) continue
        s.next = (s.period / Math.max(p.ambientRate, 0.05)) * (0.7 + Math.random() * 0.6)
        const x = Math.min(Math.max(s.px + s.ax * Math.sin(t * s.sx * 6.28 + s.phx), 0.06), 0.94)
        const y = Math.min(Math.max(s.py + s.ay * Math.cos(t * s.sy * 6.28 + s.phy), 0.06), 0.94)
        drop(x, y, p.ambientStrength * (idle ? 1 : p.drivenMult), 0.03 + Math.random() * 0.02)
      }
    }

    const stirGhost = (t: number, step: number) => {
      const p = paramsRef.current
      const engaged = p.ghost && t - lastTouched > p.ghostReturn
      ghostEnv = approach(ghostEnv, engaged ? 1 : 0, step, p.ghostFade)
      const [gx, gy] = ghostPos(t, p.ghostSpeed)
      if (!ghostSeeded) {
        ghostX = gx
        ghostY = gy
        ghostSeeded = true
      }
      if (ghostEnv > 0.001) {
        const dist = Math.hypot(gx - ghostX, gy - ghostY)
        const mag = brushStrength(dist, p) * ghostEnv * p.ghostGain
        if (mag > 1e-4) drop(gx, gy, mag, p.brushRadius)
      }
      ghostX = gx
      ghostY = gy
    }

    // ---- loop ---------------------------------------------------------------
    const stepOnce = (step: number) => {
      const t = clock()
      stirAmbient(t, step)
      stirGhost(t, step)
      const count = flushDrops()
      const src = targets[read]
      const dst = targets[read ^ 1]

      gl.useProgram(stepProgram)
      gl.bindVertexArray(vao)
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo)
      gl.viewport(0, 0, grid, grid)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, src.tex)
      gl.uniform1i(stepU.named.uState, 0)
      gl.uniform2f(stepU.named.uTexel, 1 / grid, 1 / grid)
      gl.uniform1f(stepU.named.uAspect, cssW / cssH)
      gl.uniform1i(stepU.named.uDropCount, count)
      gl.uniform4fv(stepU.named.uDrops, dropData)
      upload(stepU, paramsRef.current)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      read ^= 1
    }

    const paint = () => {
      gl.useProgram(drawProgram)
      gl.bindVertexArray(vao)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, targets[read].tex)
      gl.uniform1i(drawU.named.uState, 0)
      gl.uniform2f(drawU.named.uTexel, 1 / grid, 1 / grid)
      gl.uniform2f(drawU.named.uResolution, canvas.width, canvas.height)
      gl.uniform1f(drawU.named.uTime, clock())
      gl.uniform1f(drawU.named.uAspect, cssW / cssH)
      upload(drawU, paramsRef.current)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let raf = 0
    let last = performance.now()
    let accumulated = 0
    const frame = (now: number) => {
      raf = 0
      const p = paramsRef.current
      let dt = (now - last) / 1000
      if (dt > 0.25) dt = 0.25
      last = now
      const step = 1 / Math.max(p.simRate, 1)

      // Fixed-step integration: the wave equation is only stable at the rate it
      // was tuned for, so a slow frame takes several steps rather than one big
      // one — capped, or a stalled tab wakes up and detonates the pool.
      accumulated += dt
      let taken = 0
      while (accumulated >= step && taken < p.maxSub) {
        stepOnce(step)
        accumulated -= step
        taken++
      }
      if (taken === 0 && accumulated > 0) {
        stepOnce(step)
        accumulated = 0
      }

      paint()
      raf = requestAnimationFrame(frame)
    }

    // Flat water is a single flat colour: the first frames would have nothing
    // in them, which is how a still capture of this comes back blank. Throw a
    // handful of drops in and run the wave out before the first paint, so the
    // pool is already lit the moment anyone sees it.
    const seed = () => {
      for (let i = 0; i < 6; i++) {
        drop(
          0.2 + 0.6 * Math.random(),
          0.2 + 0.6 * Math.random(),
          0.05 + 0.07 * Math.random(),
          0.035 + 0.03 * Math.random(),
        )
        // Only MAX_DROPS ride along per step, so spend them over several.
        if (i % 3 === 2) stepOnce(1 / 60)
      }
      for (let i = 0; i < 26; i++) stepOnce(1 / 60)
    }
    seed()

    // Only runs while it is on screen and the tab is visible: off screen it would
    // burn battery for nobody. Resuming resets the clock so the pool does not jump.
    let onScreen = true
    const run = () => {
      const want = onScreen && !document.hidden
      if (want && !raf) {
        last = performance.now()
        accumulated = 0
        raf = requestAnimationFrame(frame)
      } else if (!want && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      run()
    })
    if (reduced) {
      paint()
    } else {
      visibility.observe(canvas)
      document.addEventListener("visibilitychange", run)
      run()
    }

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      visibility.disconnect()
      document.removeEventListener("visibilitychange", run)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("pointercancel", onUp)
      canvas.removeEventListener("pointerleave", onLeave)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      for (const t of targets) {
        gl.deleteFramebuffer(t.fbo)
        gl.deleteTexture(t.tex)
      }
      gl.deleteVertexArray(vao)
      gl.deleteProgram(stepProgram)
      gl.deleteProgram(drawProgram)
    }
  }, [resolution, densidad, interactive, reduced, generation])

  return (
    <div className={"relative w-full overflow-hidden " + className} style={{ height, background: fondo }}>
      {failed ? (
        // No float targets: a still picture of the same water beats a black box.
        <div className="absolute inset-0" style={{ background: fondo }} />
      ) : (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={
            "absolute inset-0 block h-full w-full " +
            (interactive ? "cursor-crosshair " : "") +
            (touch === "draw" ? "touch-none" : "touch-pan-y")
          }
        />
      )}
    </div>
  )
}
