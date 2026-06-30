import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Clouds, Cloud } from '@react-three/drei'
import * as THREE from 'three'
import { useBeatStore } from '@/stores/beatStore'
import { QualityConfig } from '@/hooks/useGPUTier'

// ─────────────────────────────────────────────────────────────────────
//  SkyDecor — dawnT-keyed AIR decoration that sits in the upper sky,
//  INSIDE the r=120 SkyDome. Two layers, both keyed off the shared dawn
//  ramp (NOT the scan wavefront — this is sky/air, like the treeline):
//
//    • Clouds  — drei <Clouds>/<Cloud>, 3–5 billboard-volume puffs placed
//      high/far, MeshBasicMaterial, fog=false, depthWrite=false,
//      renderOrder=-8 (between the dome at -10 and scene geometry at 0).
//      Colour lerps cool pre-dawn grey → warm underside with dawnT.
//      HIGH / MEDIUM only (fill-rate heavy).
//
//    • Birds   — instanced near-silhouette "V" shapes crossing -x → +x,
//      wings flapping on sin(uTime*flap + phase), warm sun-side rim, fading
//      in with dawnT, with a small upward startle on the scan beat
//      (beatIndex === 1). Counts 9 / 6 / 3 / omit / omit by tier.
//
//  All colour/dawn math mirrors YardScene's dawnT() exactly so this layer
//  warms in lockstep with the sky, hemi, key and sun. The beat story is
//  tier-identical: nothing here gates the beat/scan/camera contract — only
//  WHICH layers mount and HOW MANY birds render keys off the tier.
//  ZERO per-frame allocations: every THREE.Color / Vector3 temporary is
//  hoisted to module scope or a ref and mutated in place.
// ─────────────────────────────────────────────────────────────────────

// Shared dawn ramp — byte-for-byte the YardScene helper (full golden hour
// lands at progress ≈ 5, the final hero beat).
function dawnT(beatIndex: number, beatT: number): number {
  return Math.min(1, Math.max(0, (beatIndex + beatT - 1.0) / 4.0))
}

// ─── CLOUD COLOUR ENDPOINTS (module-level — zero per-frame allocations) ─
// Cool pre-dawn overcast grey → warm sunrise underside. The warm end is a
// muted RIM_WARM so the puffs "catch the sunrise" without blowing out.
const CLOUD_GREY = new THREE.Color(0x2a3550) // cool pre-dawn grey-blue
const CLOUD_WARM = new THREE.Color(0x99593a) // warm lit underside (RIM_WARM * ~0.6)

// Quantised dawn → cloud colour. drei's <Cloud> only re-reads `color` when the
// prop identity changes (its applyProps effect is keyed on `color`), so we hand
// it a NEW Color per quantised dawn step (a couple dozen times across the whole
// scroll — NOT per frame), keeping the hot path allocation-free while the recolour
// still propagates. Memoised so the same step reuses the same object.
const CLOUD_STEPS = 24
const cloudColorCache: THREE.Color[] = []
function cloudColorForStep(step: number): THREE.Color {
  let c = cloudColorCache[step]
  if (!c) {
    c = new THREE.Color().lerpColors(CLOUD_GREY, CLOUD_WARM, step / CLOUD_STEPS)
    cloudColorCache[step] = c
  }
  return c
}

// ─── Authored cloud placements — high (y) and far, inside the r=120 dome ─
// bounds = the volume each <Cloud> fills; seeds keep the layout stable.
const CLOUD_DEFS: {
  pos: [number, number, number]
  bounds: [number, number, number]
  seg: number
  vol: number
  opacity: number
  speed: number
  seed: number
}[] = [
  { pos: [-26, 22, -42], bounds: [16, 4, 10], seg: 28, vol: 7,  opacity: 0.55, speed: 0.10, seed: 11 },
  { pos: [18,  26, -50], bounds: [20, 5, 12], seg: 34, vol: 8,  opacity: 0.50, speed: 0.08, seed: 27 },
  { pos: [-4,  20, -58], bounds: [22, 4, 12], seg: 30, vol: 9,  opacity: 0.42, speed: 0.06, seed: 43 },
  { pos: [34,  24, -34], bounds: [14, 4, 9],  seg: 24, vol: 6,  opacity: 0.46, speed: 0.11, seed: 58 },
  { pos: [-36, 28, -52], bounds: [18, 5, 11], seg: 30, vol: 7,  opacity: 0.40, speed: 0.07, seed: 72 },
]

// ─── CLOUD LAYER ──────────────────────────────────────────────────────
// drei batches every <Cloud> into one InstancedMesh (the <Clouds> parent),
// re-reading each segment's `color` per frame. To recolour with dawnT
// without per-frame React churn we quantise the dawn ramp and only push a
// new (stable, in-place-mutated) Color through the `color` prop when the
// quantised step actually changes — keeping the hot path allocation-free.
function CloudLayer() {
  const beatIndex = useBeatStore((s) => s.beatIndex)
  const beatT     = useBeatStore((s) => s.beatT)

  // Quantised dawn step → re-render (and thus a fresh cloud colour) only when
  // the step actually changes. No per-frame state churn, no per-frame allocation.
  const [step, setStep] = useState(0)
  const stepRef = useRef(0)

  useFrame(() => {
    const dawn = dawnT(beatIndex, beatT)
    const next = Math.round(dawn * CLOUD_STEPS)
    if (next !== stepRef.current) {
      stepRef.current = next
      setStep(next)
    }
  })

  const color = cloudColorForStep(step)

  return (
    <Clouds
      material={THREE.MeshBasicMaterial}
      limit={200}
      frustumCulled={false}
      renderOrder={-8}
    >
      {CLOUD_DEFS.map((c, i) => (
        <Cloud
          key={i}
          position={c.pos}
          bounds={c.bounds}
          segments={c.seg}
          volume={c.vol}
          opacity={c.opacity}
          speed={c.speed}
          seed={c.seed}
          concentrate="outside"
          color={color}
        />
      ))}
    </Clouds>
  )
}

// ─── BIRD COUNT per tier (HIGH 9 / MEDIUM 6 / MOBILE_HIGH 3 / else omit) ─
function birdCount(tier: QualityConfig['tier']): number {
  switch (tier) {
    case 'HIGH':        return 9
    case 'MEDIUM':      return 6
    case 'MOBILE_HIGH': return 3
    default:            return 0
  }
}

// ─── BIRD COLOURS (module-level) ──────────────────────────────────────
const BIRD_SILHOUETTE = new THREE.Color(0x1a1d22) // near-black body
const BIRD_RIM        = new THREE.Color(0xff8a3a) // warm sun-side rim (RIM_WARM)

// One bird = a two-triangle "V": a shared apex with a left and a right wing
// tip. Local frame: +X = flight direction (−x→+x crossing), wings sweep back
// in −X and out in ±Z; the flap tilts the tips in ±Y. Built once.
function buildBirdGeometry(): THREE.BufferGeometry {
  // 4 verts: apex(0), leftTip(1), rightTip(2), tail(3) → two wing quads as
  // tris (apex-tip-tail) so a flat V reads from above and the sides.
  const positions = new Float32Array([
    0.0,  0.0,  0.0,  // 0 apex / head
   -0.5,  0.0, -0.55, // 1 left wing tip (−z)
   -0.5,  0.0,  0.55, // 2 right wing tip (+z)
   -0.7,  0.0,  0.0,  // 3 tail
  ])
  // aWing: −1 on the left tip, +1 on the right tip, 0 on apex/tail — drives
  // the per-vertex flap displacement so only the tips beat.
  const aWing = new Float32Array([0.0, -1.0, 1.0, 0.0])
  const uvs   = new Float32Array([0.5, 1.0, 0.0, 0.0, 1.0, 0.0, 0.5, 0.0])
  const index = [0, 1, 3, 0, 3, 2]

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aWing',    new THREE.BufferAttribute(aWing, 1))
  geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
}

// Per-bird instance authored data — lane height, depth, crossing speed,
// scale and a flap phase so the flock never beats in unison.
interface Bird {
  y: number
  z: number
  speed: number
  scale: number
  phase: number
  flap: number
}

function buildBirds(count: number): Bird[] {
  let seed = 0x6d2b79f5
  const rand = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 100000) / 100000
  }
  const out: Bird[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      y: 9 + rand() * 6,            // high, above the action / UI cards
      z: -34 + rand() * 22,         // far + behind, never occluding subjects
      speed: 1.4 + rand() * 1.1,    // world-units / sec across the lane
      scale: 1.0 + rand() * 1.0,
      phase: rand(),                // crossing offset so they spread along −x→+x
      flap: 7.0 + rand() * 4.0,     // wingbeat frequency
    })
  }
  return out
}

// Flight lane span: birds cross from −SPAN to +SPAN (world X), looping.
const BIRD_SPAN = 46

// ─── BIRD VERTEX SHADER — flap + warm rim, instanced ──────────────────
// Each instance carries flight params in instanceMatrix-adjacent uniforms?
// No: instancing here is hand-rolled via InstancedBufferAttributes so we can
// give every bird its own X (crossing), flap phase and startle without a
// per-frame JS loop. The wavefront/beat contract is untouched — birds key
// off uDawn (dawnT) for fade and uStartle (beat-1 burst) only.
const BIRD_VERTEX = /* glsl */ `
  attribute float aWing;
  attribute vec3  aSeed;      // x = y-height, y = z-depth, z = scale
  attribute vec3  aMotion;    // x = baseX phase, y = flap freq, z = flap phase

  uniform float uTime;
  uniform float uSpan;        // half flight-lane width
  uniform float uStartle;     // 0..1 upward burst on the scan beat

  varying float vRim;
  varying float vWing;

  void main() {
    float height = aSeed.x;
    float depth  = aSeed.y;
    float scale  = aSeed.z;

    // Crossing position: each bird marches −span → +span and wraps. aMotion.x
    // offsets where in the lane it currently is so the flock is spread out.
    float lane  = fract(uTime * 0.045 + aMotion.x);  // 0..1 across the lane
    float baseX = mix(-uSpan, uSpan, lane);

    // Wing flap: only the tips (|aWing| = 1) beat; apex/tail stay put.
    float flap  = sin(uTime * aMotion.y + aMotion.z * 6.2831);
    vec3 p = position * scale;
    p.y += aWing * flap * 0.32 * scale;             // tips rise/fall

    // Gentle bob + a startle burst upward when the scan sweeps (uStartle).
    float bob     = sin(uTime * 1.7 + aMotion.z * 6.2831) * 0.25 * scale;
    float startle = uStartle * (1.5 + aMotion.z * 1.2);

    vec3 world = vec3(baseX, height + bob + startle, depth);
    world += p;

    // Warm rim: tips catch the low sun on the +x (sunward) side → brighter
    // where the wing is raised and toward the leading edge.
    vRim  = clamp(0.35 + 0.65 * max(0.0, flap), 0.0, 1.0);
    vWing = abs(aWing);

    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

// ─── BIRD FRAGMENT — near-silhouette body + warm rim, dawn fade ───────
const BIRD_FRAGMENT = /* glsl */ `
  uniform vec3  uBody;
  uniform vec3  uRim;
  uniform float uDawn;        // dawnT : birds fade in with the dawn

  varying float vRim;
  varying float vWing;

  void main() {
    // Mostly silhouette; a warm rim licks the wing tips as they beat.
    vec3 color = mix(uBody, uRim, vRim * vWing * (0.25 + 0.55 * uDawn));
    // Fade the whole flock in with the dawn ramp (sky/air decoration).
    float alpha = clamp(uDawn * 1.3, 0.0, 1.0);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

// ─── BIRD FLOCK ───────────────────────────────────────────────────────
function BirdFlock({ quality }: { quality: QualityConfig }) {
  const count = birdCount(quality.tier)

  const beatIndex = useBeatStore((s) => s.beatIndex)
  const beatT     = useBeatStore((s) => s.beatT)

  const birds = useMemo(() => buildBirds(count), [count])

  const geometry = useMemo(() => {
    const base = buildBirdGeometry()
    const geo  = new THREE.InstancedBufferGeometry()
    // Copy the base attributes/index onto the instanced geometry.
    geo.index = base.index
    geo.attributes = base.attributes
    geo.instanceCount = count

    const seeds  = new Float32Array(count * 3)
    const motion = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const b = birds[i]
      seeds[i * 3 + 0]  = b.y
      seeds[i * 3 + 1]  = b.z
      seeds[i * 3 + 2]  = b.scale
      motion[i * 3 + 0] = b.phase
      motion[i * 3 + 1] = b.flap
      motion[i * 3 + 2] = b.phase
    }
    geo.setAttribute('aSeed',   new THREE.InstancedBufferAttribute(seeds, 3))
    geo.setAttribute('aMotion', new THREE.InstancedBufferAttribute(motion, 3))
    return geo
  }, [birds, count])

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   BIRD_VERTEX,
    fragmentShader: BIRD_FRAGMENT,
    uniforms: {
      uTime:    { value: 0 },
      uSpan:    { value: BIRD_SPAN },
      uStartle: { value: 0 },
      uDawn:    { value: 0 },
      uBody:    { value: BIRD_SILHOUETTE.clone() },
      uRim:     { value: BIRD_RIM.clone() },
    },
    transparent: true,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  }), [])

  useFrame((_, delta) => {
    const u = material.uniforms
    u.uTime.value += delta
    // Smoothly track the shared dawn ramp (fade-in) — plain-number lerp.
    const dawn = dawnT(beatIndex, beatT)
    u.uDawn.value += (dawn - u.uDawn.value) * Math.min(1, delta * 1.5)
    // Startle burst: a brief upward kick the instant the scan sweeps (beat 1).
    const startleTarget = beatIndex === 1 ? Math.max(0, 1 - beatT * 1.4) : 0
    u.uStartle.value += (startleTarget - u.uStartle.value) * Math.min(1, delta * 4)
  })

  if (count < 1) return null

  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={-7} />
}

// ─── EXPORT — mount with one line from YardScene's SceneContent ───────
export default function SkyDecor({ quality }: { quality: QualityConfig }) {
  // Clouds are fill-rate heavy → HIGH / MEDIUM only. Birds carry their own
  // per-tier count gate (omitted on MOBILE_LOW / MINIMAL). Neither touches
  // the beat / scan / camera contract — pure dawnT-keyed air decoration.
  const showClouds = quality.tier === 'HIGH' || quality.tier === 'MEDIUM'

  return (
    <>
      {showClouds && <CloudLayer />}
      <BirdFlock quality={quality} />
    </>
  )
}
