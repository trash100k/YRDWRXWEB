import * as React from 'react'
import { useRef, useMemo, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Float, Html, Environment, Lightformer, ContactShadows, Instances, Instance,
  PerformanceMonitor, AdaptiveDpr, AdaptiveEvents,
} from '@react-three/drei'
import {
  EffectComposer, Bloom, Vignette, ChromaticAberration, DepthOfField, Noise,
  N8AO, ToneMapping, HueSaturation, BrightnessContrast,
  wrapEffect as wrapEffectImpl,
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, Effect, EffectAttribute } from 'postprocessing'
import * as THREE from 'three'
import { useBeatStore } from '@/stores/beatStore'
import { YARD_LABELS } from '@/data/beats'
import { QualityConfig } from '@/hooks/useGPUTier'
import GrassMesh from './GrassMesh'
import FlowerBeds from './FlowerBeds'
import House from './House'
import Fence from './Fence'
import WaterFeature from './WaterFeature'
import SkyDecor from './SkyDecor'
import {
  SKY_VERTEX_SHADER, SKY_FRAGMENT_SHADER,
  PARTICLE_VERTEX_SHADER, PARTICLE_FRAGMENT_SHADER,
  RING_VERTEX_SHADER, RING_FRAGMENT_SHADER,
  WAKE_VERTEX_SHADER, WAKE_FRAGMENT_SHADER,
  FLARE_VERTEX_SHADER, FLARE_FRAGMENT_SHADER,
  MIST_VERTEX_SHADER, MIST_FRAGMENT_SHADER,
  DUST_VERTEX_SHADER, DUST_FRAGMENT_SHADER,
  GOD_RAY_VERTEX_SHADER, GOD_RAY_FRAGMENT_SHADER,
  AURA_VERTEX_SHADER, AURA_FRAGMENT_SHADER,
  GLSL_NOISE_CHUNK,
} from './shaders'

// ─── colors ──────────────────────────────────────────────────────────
const C = {
  BEFORE_GRASS:  new THREE.Color(0x3d4e35),
  AFTER_GRASS:   new THREE.Color(0x05a845),
  HEDGE:         new THREE.Color(0x243d1a),
  HEDGE_AFTER:   new THREE.Color(0x3a7828),
  HOUSE:         new THREE.Color(0x2d3a52),
  ROOF:          new THREE.Color(0x1c2235),
  CONCRETE:      new THREE.Color(0x52545c),
  MULCH:         new THREE.Color(0x4a3520),
  TRUNK:         new THREE.Color(0x3d2a12),
  CANOPY:        new THREE.Color(0x243818),
  CANOPY_AFTER:  new THREE.Color(0x2e7820),
  FOREST:        new THREE.Color(0x05a845),
  SCAN_GLOW:     new THREE.Color(0x2ad16a),
  WINDOW_WARM:   new THREE.Color(0x4a7ab0),
}

// World-space sun position — shared by the sky disc, lens flare and god rays.
const SUN_POS = new THREE.Vector3(12, 10, 8)
const SUN_DIR = SUN_POS.clone().normalize()

// ─── SHARED UNIT GEOMETRIES for drei <Instances> ─────────────────────
// One geometry per primitive shape, scaled per-instance, so repeated trees /
// hedges / backdrop cones collapse to a handful of instanced draw calls. Each
// is authored at unit scale (box 1³, sphere r=1, cone base-r=1 h=1 with its
// base at y=0) so a per-instance scale maps cleanly to world dimensions.
const UNIT_BOX_GEO = new THREE.BoxGeometry(1, 1, 1)
const UNIT_SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8)
const UNIT_CANOPY_GEO = new THREE.SphereGeometry(1, 11, 9)
const UNIT_TRUNK_GEO = (() => {
  // Trunk: a tapered cylinder, unit height, base anchored at y=0 so a
  // per-instance scale.y sets trunk height and grows from the ground.
  const g = new THREE.CylinderGeometry(0.10, 0.24, 1, 7)
  g.translate(0, 0.5, 0)
  return g
})()
const UNIT_CONE_GEO = (() => {
  // Cone: base radius 1, unit height, base at y=0.
  const g = new THREE.ConeGeometry(1, 1, 7)
  g.translate(0, 0.5, 0)
  return g
})()

// Hoisted rotation axes for per-instance sway tilt (zero per-frame allocations).
const AXIS_X = new THREE.Vector3(1, 0, 0)
const AXIS_Z = new THREE.Vector3(0, 0, 1)

function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.min(1, Math.max(0, t)) }
function clamp01(x: number) { return Math.min(1, Math.max(0, x)) }
function smoothstep(t: number) { const x = clamp01(t); return x * x * (3 - 2 * x) }

// Shared dawn ramp: full golden hour lands at progress ≈ 5 (the final hero beat),
// so the sky / lights keep warming through every beat instead of saturating by beat 2.
function dawnT(beatIndex: number, beatT: number) {
  return clamp01(((beatIndex + beatT) - 1.0) / 4.0)
}

// ─── DAWN COLOR TEMPORARIES (module-level — zero per-frame allocations) ──
const SKY_TOP_NIGHT  = new THREE.Color(0x020510)
const SKY_TOP_DAWN   = new THREE.Color(0x0c0820)
const SKY_BOT_NIGHT  = new THREE.Color(0x050c1a)
const SKY_BOT_DAWN   = new THREE.Color(0x0d0e1c)
const SKY_HOR_NIGHT  = new THREE.Color(0x0a1428)
const SKY_HOR_DAWN   = new THREE.Color(0x160a04)

const KEY_COOL       = new THREE.Color(0xb0c8e0)
// Warm-key/cool-fill split: at full dawn the key reads as cool SKY FILL from
// the shadow side while the warm sun owns the key. Keeping the key cool
// (0xc9d4e8) restores dimensionality the old warm-on-warm pairing flattened.
const KEY_WARM       = new THREE.Color(0xc9d4e8)
const HEMI_SKY_NIGHT = new THREE.Color(0x080f20)
const HEMI_SKY_DAY   = new THREE.Color(0x5a8ab0)
const HEMI_GND_NIGHT = new THREE.Color(0x0c0f08)
const HEMI_GND_DAY   = new THREE.Color(0x2a5a0a)
const RIM_COOL       = new THREE.Color(0x1a3050)
const RIM_WARM       = new THREE.Color(0xff8a3a)

const FOG_NIGHT      = new THREE.Color(0x0a1428)
const FOG_WARM       = new THREE.Color(0x140a06)

// ─── CAMERA RIG — one authored pose per beat ─────────────────────────
interface CameraRig { pos: [number, number, number]; look: [number, number, number] }
const CAMERA_RIGS: CameraRig[] = [
  { pos: [9,  6.5, 11],  look: [0,   1.4, -1] }, // beat0 — wider/higher, look biased to house so the push-in has somewhere to go
  { pos: [6,  5,   7.5], look: [0,   1.2, 1.5] },// beat1 — locked push-in; wavefront approaches along the lower third
  { pos: [4.5,5,   5.5], look: [1.5, 3.2, 1] }, // beat2 — tighter rack onto the JobCard
  { pos: [3,  8.5, 9.5], look: [0,   0.8, 3] }, // beat3 — higher/wider-back crane over Oak St, look on the ribbon plane
  { pos: [5,  3.2, 5.8], look: [3.2, 1.8, 2] }, // beat4 — fractionally lower, look biased onto the invoice/pulse
  { pos: [12, 10.5,15.5],look: [2,   1.6, 1] }, // beat5 — wide+high golden hero, look biased +x so the flare fires
]
// Per-beat target FOV: compression on beat4, openness on the beat5 reveal.
const CAMERA_FOV = [40, 40, 40, 40, 38, 44]

// Per-beat handheld breathing amplitude (x/y/z). Beat 1 is hard-cut to 0.05 in
// CameraController so the scan push-in reads clean — that cut is NOT keyed here.
const CAMERA_BREATHE: [number, number, number][] = [
  [0.30, 0.15, 0.30], // beat0 — documentary dawn handheld
  [0.30, 0.15, 0.30], // beat1 — overridden by the 0.05 hard-cut below
  [0.22, 0.12, 0.22], // beat2 — calmer on the tight rack
  [0.30, 0.15, 0.30], // beat3 — open crane
  [0.30, 0.15, 0.30], // beat4 — intimate low push
  [0.30, 0.15, 0.30], // beat5 — life in the held hero frame
]

// Max camera displacement per frame on the two flagged comfort transitions
// (2→3 crane, 3→4 descent-reversal). A violent scroll-fling makes the eased
// TARGET leap; clamping the follower's per-frame move prevents a whip-pan.
const MAX_DISPLACEMENT = 0.6

// ─── SKY DOME ────────────────────────────────────────────────────────
function SkyDome() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    uniforms: {
      uSkyTop:   { value: new THREE.Color(0x020510) },
      uSkyBot:   { value: new THREE.Color(0x050c1a) },
      uHorizon:  { value: new THREE.Color(0x0a1428) },
      uAfter:    { value: 0.0 },
      uScanGlow: { value: 0.0 },
      uSunDir:   { value: SUN_DIR.clone() },
    },
    side:       THREE.BackSide,
    depthWrite: false,
  }), [])

  useFrame((_, delta) => {
    const afterT    = dawnT(beatIndex, beatT)
    const scanGlow  = beatIndex === 1 ? beatT * 0.88 : 0

    material.uniforms.uAfter.value    = lerp(material.uniforms.uAfter.value, afterT, delta * 1.0)
    material.uniforms.uScanGlow.value = lerp(material.uniforms.uScanGlow.value, scanGlow, delta * 3.5)

    // Night: deep navy → Dawn: keep dark but shift warmer (additive bands do the color drama)
    material.uniforms.uSkyTop.value.lerpColors(SKY_TOP_NIGHT, SKY_TOP_DAWN, afterT)
    material.uniforms.uSkyBot.value.lerpColors(SKY_BOT_NIGHT, SKY_BOT_DAWN, afterT)
    material.uniforms.uHorizon.value.lerpColors(SKY_HOR_NIGHT, SKY_HOR_DAWN, afterT)
  })

  return (
    <mesh renderOrder={-10}>
      <sphereGeometry args={[120, 18, 10]} />
      <primitive object={material} />
    </mesh>
  )
}

// ─── CAMERA CONTROLLER — per-beat authored rig ───────────────────────
function CameraController() {
  const { camera } = useThree()
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  // Per-frame temporaries — hoisted to refs, mutated in place (zero allocations).
  const lookRef    = useRef(new THREE.Vector3(0, 1.5, 0))
  const tmpPos     = useRef(new THREE.Vector3())
  const tmpLook    = useRef(new THREE.Vector3())
  const tmpBreathe = useRef(new THREE.Vector3())
  // Displacement-clamp temporaries (zero per-frame allocations).
  const prevPos    = useRef(new THREE.Vector3())
  const tmpDelta   = useRef(new THREE.Vector3())
  const hasPrev    = useRef(false)

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()

    const beat   = Math.min(beatIndex, 5)
    const next   = Math.min(beat + 1, 5)
    const from   = CAMERA_RIGS[beat]
    const to     = CAMERA_RIGS[next]

    // beat5 glides outward on an ease-out curve; every other beat uses smoothstep.
    const blend  = beat === 5
      ? 1 - Math.pow(1 - clamp01(beatT), 3)
      : smoothstep(beatT)

    // Composed position target = authored rig interpolation + tiny bounded breathing.
    tmpPos.current.set(
      lerp(from.pos[0], to.pos[0], blend),
      lerp(from.pos[1], to.pos[1], blend),
      lerp(from.pos[2], to.pos[2], blend),
    )

    // Per-beat handheld breathing amplitude (distinct character per shot).
    const amp = CAMERA_BREATHE[beat]
    tmpBreathe.current.set(
      Math.sin(t * 0.12) * amp[0],
      Math.sin(t * 0.2)  * amp[1],
      Math.sin(t * 0.12) * amp[2],
    )
    // beat1: lock azimuth (no orbital rotation) and keep any wobble ≤ 0.05 units.
    if (beatIndex === 1) {
      const w = 0.05
      tmpBreathe.current.set(Math.sin(t * 0.12) * w, Math.sin(t * 0.2) * w, Math.sin(t * 0.12) * w)
    }
    tmpPos.current.add(tmpBreathe.current)

    tmpLook.current.set(
      lerp(from.look[0], to.look[0], blend),
      lerp(from.look[1], to.look[1], blend),
      lerp(from.look[2], to.look[2], blend),
    )

    // Converge position + lookAt at the SAME rate so the rig settles and holds.
    const rate = 1 - Math.exp(-delta * 3)
    camera.position.lerp(tmpPos.current, rate)

    // Per-frame displacement clamp on the two flagged comfort transitions
    // (2→3 crane, 3→4 descent). The follower already limits speed, but a fast
    // scroll-fling can leap the target; cap the actual move so a violent scroll
    // can't whip-pan. Applied only on those transitions to leave every other
    // shot's eased motion untouched.
    const flaggedTransition = beatIndex === 2 || beatIndex === 3
    if (flaggedTransition && hasPrev.current) {
      tmpDelta.current.copy(camera.position).sub(prevPos.current)
      const moved = tmpDelta.current.length()
      if (moved > MAX_DISPLACEMENT) {
        tmpDelta.current.multiplyScalar(MAX_DISPLACEMENT / moved)
        camera.position.copy(prevPos.current).add(tmpDelta.current)
      }
    }
    prevPos.current.copy(camera.position)
    hasPrev.current = true

    lookRef.current.lerp(tmpLook.current, rate)
    camera.lookAt(lookRef.current)

    // Per-beat FOV: lerp toward target, only touch the projection matrix when it moves.
    const targetFov = lerp(CAMERA_FOV[beat], CAMERA_FOV[next], blend)
    const perspCam  = camera as THREE.PerspectiveCamera
    if (Math.abs(perspCam.fov - targetFov) > 0.001) {
      perspCam.fov = lerp(perspCam.fov, targetFov, rate)
      perspCam.updateProjectionMatrix()
    }
  })

  return null
}

// ─── DAWN ENVIRONMENT — drei IBL fill (HIGH/MEDIUM only) ──────────────
// Image-based ambient built from <Lightformer>s so the house windows,
// concrete and metal frames actually REFLECT a dawn sky instead of reading
// matte. Resolution scales by tier.
//
// frames={1} bakes the cube ONCE per mount — never frames={Infinity} on a
// frameloop="always" scene (that re-renders the env cube every frame and tanks
// perf). To make the ground-bounce beat-reactive WITHOUT a per-frame re-bake we
// QUANTISE dawnT into a few steps (DAWN_STEPS) and re-key the <Environment> on a
// step change: a fresh mount re-bakes the cube exactly DAWN_STEPS times across
// the whole scroll (cheap), so the ground-bounce greens with dawnT in lockstep
// with the analytic forest fill — same store, no second source of truth. The
// analytic key/sun/rim still carry the full lighting arc; the env is reflection
// fill, never gated on the beat/scan/camera contract.
const DAWN_STEPS = 6
const GROUND_BOUNCE_COOL = new THREE.Color(0x1c3a12)
const GROUND_BOUNCE_WARM = new THREE.Color(0x2e6a1e)
const groundBounceCache: string[] = []
function groundBounceForStep(step: number): string {
  let c = groundBounceCache[step]
  if (!c) {
    c = '#' + new THREE.Color()
      .lerpColors(GROUND_BOUNCE_COOL, GROUND_BOUNCE_WARM, step / DAWN_STEPS)
      .getHexString()
    groundBounceCache[step] = c
  }
  return c
}

function DawnEnvironment({ quality }: { quality: QualityConfig }) {
  const resolution = quality.tier === 'HIGH' ? 256 : 128
  const beatIndex  = useBeatStore(s => s.beatIndex)
  const beatT      = useBeatStore(s => s.beatT)

  // Quantised dawn step → re-key (and thus a fresh bake) only when the step
  // actually changes. No per-frame state churn, no per-frame allocation.
  const [step, setStep] = useState(0)
  const stepRef = useRef(0)
  useFrame(() => {
    const next = Math.round(dawnT(beatIndex, beatT) * DAWN_STEPS)
    if (next !== stepRef.current) {
      stepRef.current = next
      setStep(next)
    }
  })

  const bounceColor   = groundBounceForStep(step)
  const bounceBoost   = lerp(0.35, 0.9, step / DAWN_STEPS)

  return (
    // key forces a fresh single-frame bake whenever the dawn step changes.
    <Environment key={step} resolution={resolution} frames={1} background={false}>
      {/* Cool pre-dawn sky-dome fill */}
      <Lightformer intensity={0.5} form="ring" color="#2a3a5a"
        scale={[40, 40, 1]} position={[0, 20, -20]} target={[0, 0, 0]} />
      {/* Warm horizon band where the sun rises (matches SUN_POS azimuth, +x/+z) */}
      <Lightformer intensity={1.2} form="rect" color="#ff9a4a"
        scale={[18, 5, 1]} position={[14, 4, 10]} rotation-y={-Math.PI / 4} />
      {/* Beat-reactive ground bounce — greens/brightens with the quantised dawn */}
      <Lightformer intensity={bounceBoost} form="rect" color={bounceColor}
        scale={[30, 30, 1]} rotation-x={Math.PI / 2} position={[0, -2, 0]} />
      {/* Sky fill from camera-left to balance the key */}
      <Lightformer intensity={0.4} form="rect" color="#6a86b0"
        scale={[20, 12, 1]} position={[-16, 8, -4]} rotation-y={Math.PI / 3} />
    </Environment>
  )
}

// ─── LIGHTING ────────────────────────────────────────────────────────
function SceneLighting({ quality }: { quality: QualityConfig }) {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const keyRef     = useRef<THREE.DirectionalLight>(null)
  const rimRef     = useRef<THREE.DirectionalLight>(null)
  const fillRef    = useRef<THREE.PointLight>(null)
  const hemiRef    = useRef<THREE.HemisphereLight>(null)
  const sunRef     = useRef<THREE.DirectionalLight>(null)
  const forestRef  = useRef<THREE.PointLight>(null)

  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  // Shadow map sized to the quality tier (0 → shadows disabled at the Canvas level).
  const shadowSize = quality.shadowMapSize > 0 ? quality.shadowMapSize : 1024
  // IBL fill (Environment) is ADDITIVE reflection/spec polish on HIGH/MEDIUM —
  // never the primary fill. The analytic ambient/hemi/key/sun rig below carries
  // the FULL lighting arc identically on every tier, so deleting the
  // <DawnEnvironment> would leave the scene just as readable. (Previously this
  // gate slashed ambient 0.55→0.12 and halved the hemi on HIGH/MED, leaning on
  // the env as the dominant fill — which rendered mobile near-black and couldn't
  // be verified headless. Both lifts are now tier-independent again.)
  const hasIBL = quality.tier === 'HIGH' || quality.tier === 'MEDIUM'

  useFrame((_, delta) => {
    if (!keyRef.current || !fillRef.current || !ambientRef.current || !hemiRef.current ||
        !sunRef.current || !forestRef.current || !rimRef.current) return

    const progress   = beatIndex + beatT
    const scanActive = progress > 0.8 && progress < 2.2
    // Single shared, beat-continuous dawn ramp — sky, hemi, key and sun warm in lockstep.
    const afterT     = dawnT(beatIndex, beatT)
    const heroBoost  = beatIndex === 5 ? smoothstep(beatT) : 0

    // Green fill bounce — moves toward the JobCard region on beat2 (quote).
    const targetFill = progress >= 1.0
      ? 3.2
      : scanActive ? lerp(0, 3.2, (progress - 0.8) / 0.7) : 0
    fillRef.current.intensity = lerp(fillRef.current.intensity, targetFill, delta * 2.5)
    const fillTargetX = beatIndex === 2 ? 1.5 : 8
    const fillTargetZ = beatIndex === 2 ? 1   : 4
    fillRef.current.position.x = lerp(fillRef.current.position.x, fillTargetX, delta * 1.6)
    fillRef.current.position.z = lerp(fillRef.current.position.z, fillTargetZ, delta * 1.6)

    // Secondary forest point — ramps on the shared dawn curve.
    forestRef.current.intensity = lerp(forestRef.current.intensity, lerp(0, 1.4, afterT), delta * 1.8)

    // Key light: cross-fades down as the warm sun takes over shadow duty.
    keyRef.current.intensity = lerp(keyRef.current.intensity, lerp(1.6, 0.5, afterT), delta * 1.5)
    keyRef.current.color.lerpColors(KEY_COOL, KEY_WARM, afterT)

    // Hemisphere: night → warm afternoon — the strong IBL-independent sky/ground
    // fill, identical on every tier (env is additive polish, not the fill).
    hemiRef.current.color.lerpColors(HEMI_SKY_NIGHT, HEMI_SKY_DAY, afterT)
    hemiRef.current.groundColor.lerpColors(HEMI_GND_NIGHT, HEMI_GND_DAY, afterT)
    const hemiTarget = lerp(0.45, 1.3, afterT)
    hemiRef.current.intensity = lerp(hemiRef.current.intensity, hemiTarget, delta * 1.5)

    // Warm sun: dominant shadow caster as it ramps in; pushes to a golden hero on beat5.
    const sunTarget = lerp(0, 1.8, afterT) + heroBoost * 0.6 // → ~2.4 at full beat5
    sunRef.current.intensity = lerp(sunRef.current.intensity, sunTarget, delta * 1.8)

    // Rim: cool edge → warm edge across the arc; flare the hero silhouette on beat5.
    rimRef.current.intensity = lerp(0.65, 1.4, afterT) + heroBoost * 0.5
    rimRef.current.color.lerpColors(RIM_COOL, RIM_WARM, afterT)

    // ── Single shadow caster per frame (S1) ──────────────────────────────
    // Both directional casters share an IDENTICAL frustum and the intensities
    // already cross-fade, so handing the shadow baton at the afterT=0.5 mid-
    // point is invisible — but it halves the shadow-map render to exactly one
    // depth pass. Gated by activeShadowCasters (0 ⇒ neither casts on mobile-low).
    const allowShadows = quality.activeShadowCasters > 0
    keyRef.current.castShadow = allowShadows && afterT < 0.5
    sunRef.current.castShadow = allowShadows && afterT >= 0.5
  })

  return (
    <>
      {/* Additive reflection/spec polish on HIGH/MED only — NOT the fill. */}
      {hasIBL && <DawnEnvironment quality={quality} />}
      {/* Robust IBL-independent ambient floor — identical on every tier so the
          dawn yard reads cleanly even with <DawnEnvironment> removed entirely. */}
      <ambientLight ref={ambientRef} color={0x18202e} intensity={0.48} />
      <hemisphereLight ref={hemiRef} args={[0x080f20, 0x0c0f08, 0.45]} position={[0, 20, 0]} />
      {/* Pre-dawn key caster — cross-fades out as the sun rises (identical frustum, no double shadows). */}
      <directionalLight
        ref={keyRef}
        color={0xb0c8e0}
        intensity={1.6}
        position={[-8, 12, -5]}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <directionalLight ref={rimRef} color={0x1a3050} intensity={0.65} position={[10, 7, -9]} />
      {/* Warm dawn sun — takes over shadow casting with an identical frustum to the key. */}
      <directionalLight
        ref={sunRef}
        color={0xffb060}
        intensity={0}
        position={[12, 10, 8]}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <pointLight ref={fillRef} color={0x20a050} intensity={0} distance={34} position={[8, 4, 4]} />
      <pointLight ref={forestRef} color={0x1a8840} intensity={0} distance={20} position={[-4, 3, -3]} />
    </>
  )
}

// ─── SCAN PLANE ──────────────────────────────────────────────────────
function ScanPlane() {
  const lineRef  = useRef<THREE.Mesh>(null)
  const glowRef  = useRef<THREE.Mesh>(null)
  const scanZ    = useRef(-12)

  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame((_, delta) => {
    if (!lineRef.current || !glowRef.current) return
    const lmat = lineRef.current.material as THREE.MeshBasicMaterial
    const gmat = glowRef.current.material as THREE.MeshBasicMaterial

    if (beatIndex === 1) {
      const t = 1 - Math.pow(1 - beatT, 2.5)
      scanZ.current += (lerp(-10, 10, t) - scanZ.current) * Math.min(1, delta * 4)
      lmat.opacity  = Math.min(0.85, beatT * 3)
      gmat.opacity  = Math.min(0.55, beatT * 2)
    } else if (beatIndex >= 2) {
      scanZ.current = 12
      lmat.opacity  = Math.max(0, lmat.opacity - delta * 3)
      gmat.opacity  = Math.max(0, gmat.opacity - delta * 3)
    } else {
      scanZ.current = -12
      lmat.opacity  = 0
      gmat.opacity  = 0
    }

    lineRef.current.position.z = scanZ.current
    glowRef.current.position.z = scanZ.current
  })

  return (
    <>
      {/* Bright core line */}
      <mesh ref={lineRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.10, -12]}>
        <planeGeometry args={[26, 0.14]} />
        <meshBasicMaterial color={0xaaffcc} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Wide soft halo */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, -12]}>
        <planeGeometry args={[26, 3.2]} />
        <meshBasicMaterial color={0x2ad16a} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// ─── VERTICAL SCAN CURTAIN ───────────────────────────────────────────
function ScanCurtain() {
  const meshRef  = useRef<THREE.Mesh>(null)
  const scanZ    = useRef(-12)

  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshBasicMaterial

    if (beatIndex === 1) {
      const t = 1 - Math.pow(1 - beatT, 2.5)
      scanZ.current += (lerp(-10, 10, t) - scanZ.current) * Math.min(1, delta * 4)
      mat.opacity = Math.min(0.18, beatT * 0.6)
    } else if (beatIndex >= 2) {
      scanZ.current = 12
      mat.opacity = Math.max(0, mat.opacity - delta * 4)
    } else {
      scanZ.current = -12
      mat.opacity = 0
    }

    meshRef.current.position.z = scanZ.current
  })

  return (
    <mesh ref={meshRef} position={[0, 3.5, -12]}>
      <planeGeometry args={[26, 7]} />
      <meshBasicMaterial color={0x2ad16a} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ─── GROUND ──────────────────────────────────────────────────────────
function Ground() {
  const beatIndex    = useBeatStore(s => s.beatIndex)
  const scanZ        = useBeatStore(s => s.scanZ)
  const scanProgress = useBeatStore(s => s.scanProgress)
  const shaderUnis   = useRef<{
    uGroundPulse: { value: number }
    uGroundTime: { value: number }
    uScanZ: { value: number }
    uScanProgress: { value: number }
  } | null>(null)

  const groundMat = useMemo(() => {
    // Procedural normal map — multi-frequency value noise
    const sz   = 128
    const data = new Uint8Array(sz * sz * 4)
    for (let y = 0; y < sz; y++) {
      for (let x = 0; x < sz; x++) {
        const i = (y * sz + x) * 4
        const fx = x / sz, fy = y / sz
        const n  = (Math.sin(fx * 47.3 + 3.1) * Math.cos(fy * 53.7 + 1.7)
                  + Math.sin(fx * 113.9 + 8.4) * Math.cos(fy * 97.1 + 4.2) * 0.5
                  + Math.sin(fx * 211.3 + 2.9) * Math.cos(fy * 193.7 + 6.8) * 0.25) / 1.75
        data[i] = Math.round(n * 28 + 128)
        data[i + 1] = Math.round(n * 28 + 128)
        data[i + 2] = 255
        data[i + 3] = 255
      }
    }
    const normalTex = new THREE.DataTexture(data, sz, sz, THREE.RGBAFormat)
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping
    normalTex.repeat.set(8, 6)
    normalTex.needsUpdate = true

    const mat = new THREE.MeshStandardMaterial({
      color: C.BEFORE_GRASS,
      roughness: 0.95,
      metalness: 0,
      emissive: C.AFTER_GRASS,
      emissiveIntensity: 1.0,
      normalMap: normalTex,
    })
    mat.normalScale.set(0.35, 0.35)

    // onBeforeCompile injects two things driven by the SAME scan wavefront the
    // grass uses, so ground + grass green along one continuous edge instead of
    // the old per-section / hard-threshold pop:
    //   • a post-scan ground ripple (vertex displacement)
    //   • a smoothstep-on-(worldZ - uScanZ) greening edge that mixes the same
    //     before/after color pair the grass shader uses, and gates emissive so
    //     only the greened band glows.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uGroundPulse   = { value: 0 }
      shader.uniforms.uGroundTime    = { value: 0 }
      shader.uniforms.uScanZ         = { value: -12 }
      shader.uniforms.uScanProgress  = { value: 0 }
      shader.uniforms.uBeforeGreen   = { value: C.BEFORE_GRASS.clone() }
      shader.uniforms.uAfterGreen    = { value: C.AFTER_GRASS.clone() }
      shaderUnis.current = shader.uniforms as typeof shaderUnis.current

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        uniform float uGroundPulse;
        uniform float uGroundTime;
        varying float vGroundWorldZ;`
      )
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vGroundWorldZ = (modelMatrix * vec4(transformed, 1.0)).z;
        float _r   = length(transformed.xz);
        float _rip = (sin(_r * 1.35 - uGroundTime * 2.1) * 0.5 + 0.5)
                     * uGroundPulse * 0.045
                     * max(0.0, 1.0 - _r / 11.0);
        transformed.y += _rip;`
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        uniform float uScanZ;
        uniform float uScanProgress;
        uniform vec3  uBeforeGreen;
        uniform vec3  uAfterGreen;
        varying float vGroundWorldZ;`
      )
      // Same edge as the grass vertex shader: green = 1 behind the wavefront,
      // 0 ahead of it, sharpened by uScanProgress so the band tracks the sweep.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float _greened = 1.0 - smoothstep(-0.5, 2.0, vGroundWorldZ - uScanZ);
        _greened = clamp(_greened * uScanProgress * 2.0, 0.0, 1.0);
        diffuseColor.rgb = mix(uBeforeGreen, uAfterGreen, _greened);`
      )
      // Gate the emissive glow to the greened band so unscanned ground stays dark.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance *= _greened * 0.06;`
      )
    }

    return mat
  }, [])

  useFrame((_, delta) => {
    // Roughness still eases on whether the wavefront has reached the lawn; the
    // greening color/emissive now live in-shader on the shared edge.
    const reached = beatIndex >= 2 || (beatIndex === 1 && scanProgress > 0.5)
    groundMat.roughness = lerp(groundMat.roughness, reached ? 0.78 : 0.95, delta)

    if (shaderUnis.current) {
      shaderUnis.current.uGroundTime.value    += delta
      shaderUnis.current.uScanZ.value          = scanZ
      shaderUnis.current.uScanProgress.value   = scanProgress
      shaderUnis.current.uGroundPulse.value    = lerp(
        shaderUnis.current.uGroundPulse.value, reached ? 0.65 : 0, delta * 1.5
      )
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={groundMat}>
      <planeGeometry args={[22, 18, 40, 40]} />
    </mesh>
  )
}

// ─── HEDGES ──────────────────────────────────────────────────────────
// Per-cluster anchor positions — index-aligned with the sub-groups below so
// each cluster's growth keys off the wavefront reaching its own Z.
const HEDGE_CLUSTERS: { pos: [number, number, number] }[] = [
  { pos: [-4,   0, -5]   },
  { pos: [-7.5, 0, -1]   },
  { pos: [2,    0, -5.5] },
  { pos: [0,    0, -5.3] },
  { pos: [6,    0, -2.5] },
]

// Per-cluster geometry: one base box + N canopy spheres. Dimensions are folded
// into per-instance scale (unit box / unit sphere shared across all clusters →
// two instanced draw calls total instead of ~25 meshes). Sphere radius is the
// uniform per-instance scale; box uses non-uniform per-axis scale.
interface HedgeBox  { cluster: number; pos: [number, number, number]; box: [number, number, number] }
interface HedgeBall { cluster: number; pos: [number, number, number]; r: number }

const HEDGE_BOXES: HedgeBox[] = [
  { cluster: 0, pos: [-4,   0.9,  -5],   box: [7,   1.8, 1.2] },
  { cluster: 1, pos: [-7.5, 1.1,  -1],   box: [1.0, 2.2, 6] },
  { cluster: 2, pos: [2,    0.7,  -5.5], box: [4,   1.4, 0.9] },
  { cluster: 3, pos: [0,    0.35, -5.3], box: [9.4, 0.7, 0.7] },
  { cluster: 4, pos: [6,    0.8,  -2.5], box: [1.6, 1.6, 3.2] },
]

const HEDGE_BALLS: HedgeBall[] = [
  { cluster: 0, pos: [-1.8,  0.7, -4.8],  r: 0.7 },
  { cluster: 0, pos: [-5.5,  0.6, -5.2],  r: 0.55 },
  { cluster: 0, pos: [-4,    0.8, -4.7],  r: 0.45 },
  { cluster: 1, pos: [-7.2,  0.9, -2.8],  r: 0.6 },
  { cluster: 1, pos: [-7.7,  0.7,  0.2],  r: 0.5 },
  { cluster: 2, pos: [3.5,   0.5, -5.4],  r: 0.5 },
  // Foundation strip shrubs (cluster 3) — alternating radii.
  { cluster: 3, pos: [-4,    0.35,-5.2],  r: 0.4 },
  { cluster: 3, pos: [-2.4,  0.35,-5.2],  r: 0.52 },
  { cluster: 3, pos: [-0.8,  0.35,-5.2],  r: 0.4 },
  { cluster: 3, pos: [2.6,   0.35,-5.2],  r: 0.52 },
  { cluster: 3, pos: [4.2,   0.35,-5.2],  r: 0.4 },
  { cluster: 4, pos: [6.2,   0.7, -3.5],  r: 0.62 },
  { cluster: 4, pos: [5.8,   0.6, -1.5],  r: 0.55 },
  { cluster: 4, pos: [6.3,   0.8, -2.3],  r: 0.48 },
]

function Hedges() {
  const boxMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: C.HEDGE, roughness: 0.88, emissive: C.HEDGE_AFTER, emissiveIntensity: 0,
  }), [])
  const ballMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: C.HEDGE, roughness: 0.88, emissive: C.HEDGE_AFTER, emissiveIntensity: 0,
  }), [])

  const boxRefs  = useRef<(THREE.Object3D | null)[]>([])
  const ballRefs = useRef<(THREE.Object3D | null)[]>([])
  const beatIndex = useBeatStore(s => s.beatIndex)
  const scanZ     = useBeatStore(s => s.scanZ)

  // One growth value per cluster (0.15 = sprout, 1.0 = full) — each emerges as
  // the shared scan wavefront passes its Z, exactly like before; the wavefront
  // coupling is UNCHANGED, only retargeted onto Instance refs.
  const growthRef = useRef<number[]>(HEDGE_CLUSTERS.map(() => 0.15))

  useFrame((_, delta) => {
    const afterScan = beatIndex >= 1
    boxMat.color.lerp(afterScan ? C.HEDGE_AFTER : C.HEDGE, delta * 1.2)
    boxMat.emissiveIntensity = lerp(boxMat.emissiveIntensity, afterScan ? 0.09 : 0, delta * 1.5)
    ballMat.color.copy(boxMat.color)
    ballMat.emissiveIntensity = boxMat.emissiveIntensity

    // Advance per-cluster growth (same fast-up / slow-down cadence as before).
    for (let i = 0; i < HEDGE_CLUSTERS.length; i++) {
      const clusterZ = HEDGE_CLUSTERS[i].pos[2]
      const passed = afterScan && scanZ > clusterZ - 1.5
      const target = passed ? 1.0 : 0.15
      const speed  = passed ? 5.5 : 2.0
      growthRef.current[i] = lerp(growthRef.current[i], target, delta * speed)
    }

    // Retarget growth onto each instance: scale.y AND position.y scale about the
    // cluster ground origin (y=0) so clusters rise from the lawn exactly as the
    // old grp.scale.y did — boxes use non-uniform scale, balls uniform.
    HEDGE_BOXES.forEach((b, i) => {
      const inst = boxRefs.current[i]
      if (!inst) return
      const g = growthRef.current[b.cluster]
      inst.scale.set(b.box[0], b.box[1] * g, b.box[2])
      inst.position.set(b.pos[0], b.pos[1] * g, b.pos[2])
    })
    HEDGE_BALLS.forEach((b, i) => {
      const inst = ballRefs.current[i]
      if (!inst) return
      const g = growthRef.current[b.cluster]
      inst.scale.set(b.r, b.r * g, b.r)
      inst.position.set(b.pos[0], b.pos[1] * g, b.pos[2])
    })
  })

  return (
    <group>
      {/* Cluster boxes — one instanced draw (unit box scaled per instance). */}
      <Instances geometry={UNIT_BOX_GEO} material={boxMat} limit={HEDGE_BOXES.length}
        castShadow receiveShadow frustumCulled={false}>
        {HEDGE_BOXES.map((b, i) => (
          <Instance key={i} ref={el => { boxRefs.current[i] = el as THREE.Object3D | null }}
            position={b.pos} scale={b.box} />
        ))}
      </Instances>
      {/* Canopy spheres — one instanced draw (unit sphere scaled per instance). */}
      <Instances geometry={UNIT_SPHERE_GEO} material={ballMat} limit={HEDGE_BALLS.length}
        castShadow frustumCulled={false}>
        {HEDGE_BALLS.map((b, i) => (
          <Instance key={i} ref={el => { ballRefs.current[i] = el as THREE.Object3D | null }}
            position={b.pos} scale={b.r} />
        ))}
      </Instances>
    </group>
  )
}

// ─── HARDSCAPE — driveway, mulch beds, walkway (house lives in House.tsx) ─
// The detailed parametric house (body/roof/trim/gutters/shutters/posts/windows
// /mullions/garage panels) now lives in <House/> at the same world transform.
// Structures keeps only the ground-level hardscape it always anchored to (the
// driveway carve-out, mulch strips and walkway the grass reject-samples around).
function Structures() {
  return (
    <>
      {/* Driveway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2.8, 0.005, 1]} receiveShadow>
        <planeGeometry args={[4.2, 9]} />
        <meshStandardMaterial color={C.CONCRETE} roughness={0.88} metalness={0.04} />
      </mesh>

      {/* Mulch beds */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7.2, 0.008, -2.5]} receiveShadow>
        <planeGeometry args={[1.6, 5]} />
        <meshStandardMaterial color={C.MULCH} roughness={1.0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2.5, 0.008, -4.8]} receiveShadow>
        <planeGeometry args={[8, 1.4]} />
        <meshStandardMaterial color={C.MULCH} roughness={1.0} />
      </mesh>

      {/* Foundation mulch strip across the full house front (z ≈ -5.3) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, -5.3]} receiveShadow>
        <planeGeometry args={[10, 1.0]} />
        <meshStandardMaterial color={C.MULCH} roughness={1.0} />
      </mesh>

      {/* Concrete walkway — driveway edge to the front door */}
      <mesh rotation={[-Math.PI / 2, 0, 0.18]} position={[0.0, 0.006, -3.2]} receiveShadow>
        <planeGeometry args={[1.1, 4.4]} />
        <meshStandardMaterial color={C.CONCRETE} roughness={0.9} metalness={0.04} />
      </mesh>

    </>
  )
}

// ─── BARE PATCHES — dissolve/heal post-scan ───────────────────────────
const PATCH_DEFS = [
  { pos: [3.2,  0.015, 2.5]  as [number,number,number], sx: 1.2, sz: 0.7 },
  { pos: [-1.0, 0.015, 4.2]  as [number,number,number], sx: 0.8, sz: 0.5 },
  { pos: [4.5,  0.015, -0.5] as [number,number,number], sx: 0.6, sz: 0.9 },
]

function BarePatches() {
  const matsRef   = useRef<THREE.MeshStandardMaterial[]>([])
  const scaleRef  = useRef<number[]>(PATCH_DEFS.map(() => 1))
  const beatIndex = useBeatStore(s => s.beatIndex)

  useFrame((_, delta) => {
    const afterScan = beatIndex >= 2
    PATCH_DEFS.forEach((_, i) => {
      const mat = matsRef.current[i]
      if (!mat) return
      scaleRef.current[i] = lerp(scaleRef.current[i], afterScan ? 0 : 1, delta * (afterScan ? 1.4 : 2))
      mat.opacity = scaleRef.current[i]
    })
  })

  return (
    <>
      {PATCH_DEFS.map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={p.pos}
          scale={[p.sx, p.sz, 1]} receiveShadow>
          <circleGeometry args={[0.9, 12]} />
          <meshStandardMaterial ref={el => { if (el) matsRef.current[i] = el }}
            color={0x5a4d35} roughness={1.0} transparent opacity={1} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

// ─── TREES — multi-layer canopy, animated sway + scan-driven emergence ─
// [x, z, trunkH, r1, r2, r3] — three stacked canopy spheres per tree.
const TREES = [
  { x: 6.5,  z: -3,  h: 4.4, r1: 1.25, r2: 0.95, r3: 0.60 },
  { x: 7.8,  z: 1,   h: 3.6, r1: 1.05, r2: 0.80, r3: 0.50 },
  { x: -7.2, z: 3,   h: 5.0, r1: 1.35, r2: 1.05, r3: 0.65 },
  { x: -5.5, z: -2,  h: 3.2, r1: 0.85, r2: 0.65, r3: 0.40 },
  { x: 5.0,  z: 4.5, h: 2.9, r1: 0.78, r2: 0.58, r3: 0.35 },
  { x: -2.0, z: 6,   h: 2.5, r1: 0.65, r2: 0.48, r3: 0.30 },
] as const

// Canopy instances flattened across all trees, each carrying its tree index,
// base-relative LOCAL offset (so sway can tilt about the trunk base) and radius.
interface CanopyInstance { tree: number; off: [number, number, number]; r: number }
const TREE_CANOPIES: CanopyInstance[] = TREES.flatMap((tr, i) => [
  { tree: i, off: [0,            tr.h + tr.r1 * 0.45,                             0],            r: tr.r1 },
  { tree: i, off: [tr.r2 * 0.2,  tr.h + tr.r1 * 0.9 + tr.r2 * 0.5,                tr.r2 * -0.1], r: tr.r2 },
  { tree: i, off: [0,            tr.h + tr.r1 * 0.9 + tr.r2 * 1.0 + tr.r3 * 0.4,  0],            r: tr.r3 },
])

function Trees() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const scanZ     = useBeatStore(s => s.scanZ)

  // Per-tree growth tracking (0 = tiny, 1 = full size) — UNCHANGED math,
  // retargeted from group transforms onto per-instance refs.
  const growthRef = useRef(new Array(TREES.length).fill(0.05))

  const canopyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: C.CANOPY, roughness: 0.86, emissive: C.CANOPY_AFTER, emissiveIntensity: 0,
  }), [])
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: C.TRUNK, roughness: 1.0,
  }), [])

  const trunkRefs  = useRef<(THREE.Object3D | null)[]>([])
  const canopyRefs = useRef<(THREE.Object3D | null)[]>([])

  // Hoisted per-frame temporaries (zero allocations in useFrame).
  const tmpOff = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()
    const afterScan = beatIndex >= 1

    canopyMat.color.lerp(afterScan ? C.CANOPY_AFTER : C.CANOPY, delta * 1.0)
    canopyMat.emissiveIntensity = lerp(canopyMat.emissiveIntensity, afterScan ? 0.10 : 0, delta * 1.2)

    // Advance per-tree growth + sway angles (same cadence as before).
    for (let i = 0; i < TREES.length; i++) {
      const tz     = TREES[i].z
      const passed = beatIndex >= 1 && scanZ > tz - 1.5
      const target = passed ? 1.0 : 0.05
      const speed  = passed ? 5.5 : 2.0
      growthRef.current[i] = lerp(growthRef.current[i], target, delta * speed)
    }

    // Trunks: rise from the ground (scale.y), sway tilt about the base.
    TREES.forEach((tr, i) => {
      const inst = trunkRefs.current[i]
      if (!inst) return
      const g  = growthRef.current[i]
      const sz = Math.sin(t * 0.7 + i * 1.5) * 0.018
      const sx = Math.sin(t * 0.5 + i * 1.1) * 0.012
      inst.position.set(tr.x, 0, tr.z)
      inst.scale.set(lerp(0.25, 1.0, g), tr.h * g, lerp(0.25, 1.0, g))
      inst.rotation.set(sx, 0, sz)
    })

    // Canopies: grow + sway. The whole tree tilts about its trunk base, so each
    // canopy's world position is base + R(sway)·(scaledLocalOffset). Replicating
    // the old group-rotation keeps the canopy reading as one swaying mass.
    TREE_CANOPIES.forEach((cp, i) => {
      const inst = canopyRefs.current[i]
      if (!inst) return
      const tr = TREES[cp.tree]
      const g  = growthRef.current[cp.tree]
      const sz = Math.sin(t * 0.7 + cp.tree * 1.5) * 0.018
      const sx = Math.sin(t * 0.5 + cp.tree * 1.1) * 0.012
      const sxz = lerp(0.25, 1.0, g)
      // Scaled local offset about the trunk base (y grows, x/z restrained).
      tmpOff.current.set(cp.off[0] * sxz, cp.off[1] * g, cp.off[2] * sxz)
      // Tilt the offset by the small sway rotation (Z then X — small-angle order
      // is visually negligible) so the canopy arcs with the trunk.
      tmpOff.current.applyAxisAngle(AXIS_Z, sz)
      tmpOff.current.applyAxisAngle(AXIS_X, sx)
      inst.position.set(tr.x + tmpOff.current.x, tmpOff.current.y, tr.z + tmpOff.current.z)
      inst.scale.setScalar(cp.r * sxz)
      inst.rotation.set(sx, 0, sz)
    })
  })

  return (
    <group>
      {/* Trunks — one instanced draw (unit tapered cylinder, base at y=0). */}
      <Instances geometry={UNIT_TRUNK_GEO} material={trunkMat} limit={TREES.length}
        castShadow frustumCulled={false}>
        {TREES.map((_, i) => (
          <Instance key={i} ref={el => { trunkRefs.current[i] = el as THREE.Object3D | null }} />
        ))}
      </Instances>
      {/* Canopies — one instanced draw (unit sphere scaled per instance). */}
      <Instances geometry={UNIT_CANOPY_GEO} material={canopyMat} limit={TREE_CANOPIES.length}
        castShadow frustumCulled={false}>
        {TREE_CANOPIES.map((_, i) => (
          <Instance key={i} ref={el => { canopyRefs.current[i] = el as THREE.Object3D | null }} />
        ))}
      </Instances>
    </group>
  )
}

// ─── DISTANT BACKDROP — aerial-haze treeline ring + ground skirt ──────
// A dark, horizon-tinted ring of large cones/spheres wrapping behind and to
// the sides, plus an oversized ground skirt that fades the lawn into the
// horizon. Both are excluded from shadow casting/receiving and never enter
// the shadow-camera bounds (their geometry lives far outside the ±16 frustum).
const BACKDROP_HAZE = new THREE.Color(0x0a1422)   // aerial-haze horizon tint
const BACKDROP_TREE = new THREE.Color(0x0c1a14)   // near-black hazed treeline
const BACKDROP_SKIRT = new THREE.Color(0x0a1626)  // ground → horizon fade

interface Hill { x: number; z: number; r: number; h: number; cone: boolean }

// Inner treeline ring (radius 40–60) + a SECOND hazier far ring (radius 75–95)
// so the horizon reads as receding layers, not one wall. Both arc behind/around
// the house and never enter the ±16 shadow frustum (no shadow flags).
function buildRing(N: number, radMin: number, radMax: number, base: number,
                   rWide: number, hTall: number, zBias: number): Hill[] {
  const arr: Hill[] = []
  for (let i = 0; i < N; i++) {
    const a = Math.PI * (0.62 + (i / (N - 1)) * 1.76) // ~112°..430°
    const rad = base + Math.sin(i * 2.3) * 9
    const radius = Math.max(radMin, Math.min(radMax, rad + 8))
    const x = Math.cos(a) * radius
    const z = Math.sin(a) * radius + zBias
    const r = rWide + (Math.sin(i * 1.7) * 0.5 + 0.5) * rWide
    const h = hTall + (Math.sin(i * 0.9) * 0.5 + 0.5) * hTall * 2
    arr.push({ x, z, r, h, cone: i % 2 === 0 })
  }
  return arr
}

function DistantBackdrop() {
  const coneMat  = useRef<THREE.MeshStandardMaterial>(null)
  const ballMat  = useRef<THREE.MeshStandardMaterial>(null)
  const skirtRef = useRef<THREE.MeshStandardMaterial>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  // Inner ring (the original 26-hill treeline) + a second, farther, hazier ring.
  const inner = useMemo(() => buildRing(26, 40, 60, 42, 7, 4, -6), [])
  const far   = useMemo(() => buildRing(20, 75, 95, 80, 9, 6, -10), [])

  // Split each ring's hills into cone / sphere instance lists.
  const cones = useMemo(() => [...inner, ...far].filter(h => h.cone), [inner, far])
  const balls = useMemo(() => [...inner, ...far].filter(h => !h.cone), [inner, far])

  // Warm the treeline + skirt slightly toward the horizon sky as dawn ramps —
  // the per-hill loop collapses to two shared materials (one cone, one sphere).
  useFrame((_, delta) => {
    const afterT = dawnT(beatIndex, beatT)
    if (coneMat.current) {
      coneMat.current.color.lerpColors(BACKDROP_TREE, SKY_HOR_DAWN, afterT * 0.45)
      coneMat.current.emissiveIntensity = lerp(coneMat.current.emissiveIntensity, afterT * 0.10, delta * 1.4)
    }
    if (ballMat.current) {
      ballMat.current.color.lerpColors(BACKDROP_TREE, SKY_HOR_DAWN, afterT * 0.45)
      ballMat.current.emissiveIntensity = lerp(ballMat.current.emissiveIntensity, afterT * 0.10, delta * 1.4)
    }
    if (skirtRef.current) {
      skirtRef.current.color.lerpColors(BACKDROP_SKIRT, SKY_HOR_DAWN, afterT * 0.4)
    }
  })

  return (
    <group>
      {/* Oversized ground skirt under the main 22×18 lawn — fades to horizon. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} renderOrder={-9}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          ref={skirtRef}
          color={BACKDROP_SKIRT}
          roughness={1.0}
          metalness={0}
          emissive={BACKDROP_HAZE}
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Treeline cones — one instanced draw (unit cone, base at y=0). */}
      <Instances geometry={UNIT_CONE_GEO} limit={cones.length} frustumCulled={false}>
        <meshStandardMaterial ref={coneMat} color={BACKDROP_TREE} roughness={1.0}
          metalness={0} emissive={BACKDROP_HAZE} emissiveIntensity={0} fog={true} />
        {cones.map((h, i) => (
          <Instance key={i} position={[h.x, 0, h.z]} scale={[h.r, h.h, h.r]} />
        ))}
      </Instances>

      {/* Treeline spheres — one instanced draw (unit sphere). */}
      <Instances geometry={UNIT_SPHERE_GEO} limit={balls.length} frustumCulled={false}>
        <meshStandardMaterial ref={ballMat} color={BACKDROP_TREE} roughness={1.0}
          metalness={0} emissive={BACKDROP_HAZE} emissiveIntensity={0} fog={true} />
        {balls.map((h, i) => (
          <Instance key={i} position={[h.x, 0, h.z]} scale={h.r * 0.85} />
        ))}
      </Instances>
    </group>
  )
}

// ─── FOREGROUND SILHOUETTES — out-of-focus DoF framing vignette ───────
// Large near-black masses the camera sweeps past. Kept well outside every
// lookAt target so DepthOfField blurs them into a soft framing vignette.
// No shadow casting/receiving (they sit at the very edge of the lawn).
function ForegroundSilhouettes() {
  const silMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x05080a, roughness: 1.0, metalness: 0,
  }), [])

  return (
    <group>
      {/* Oversized tree — fat trunk + low brooding canopy, front-left. */}
      <group position={[-9, 0, 7]}>
        <mesh material={silMat} position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.55, 0.95, 6.4, 9]} />
        </mesh>
        <mesh material={silMat} position={[0.4, 5.6, -0.2]}>
          <sphereGeometry args={[2.6, 12, 10]} />
        </mesh>
        <mesh material={silMat} position={[-1.3, 4.7, 0.5]}>
          <sphereGeometry args={[1.7, 10, 8]} />
        </mesh>
        <mesh material={silMat} position={[1.5, 4.4, 0.6]}>
          <sphereGeometry args={[1.5, 10, 8]} />
        </mesh>
      </group>

      {/* Tall shrub / post mass, front-right. Pushed out to [12,0,6]: at the old
          [8,0,8] this near-black mass sat ~3.5 units off the beat-0 lens (and the
          beat-5 hero), filling/occluding the establishing frame. [12,0,6] keeps
          it a soft right-edge framing vignette that clears every beat's frustum. */}
      <group position={[12, 0, 6]}>
        <mesh material={silMat} position={[0, 2.6, 0]}>
          <cylinderGeometry args={[0.9, 1.2, 5.2, 8]} />
        </mesh>
        <mesh material={silMat} position={[0.2, 4.8, 0]}>
          <sphereGeometry args={[1.9, 11, 9]} />
        </mesh>
      </group>
    </group>
  )
}

// ─── AERIAL HAZE DUST — slow warm motes in the god-ray / sun region ───
// Sparse, slow-drifting warm-white additive points concentrated toward the
// sun so the shafts catch motes after the reveal. Fades in with afterT.
function AerialHazeDust() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const COUNT     = 64

  const { geometry, material } = useMemo(() => {
    const geo       = new THREE.BufferGeometry()
    const positions = new Float32Array(COUNT * 3)
    const phases    = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      // Bias the cloud toward the sun (high, right, back) where the shafts live.
      positions[i * 3 + 0] = 2 + (Math.random() - 0.5) * 16   // skew +x toward sun
      positions[i * 3 + 1] = 2.5 + Math.random() * 7          // mid-to-high
      positions[i * 3 + 2] = -1 + (Math.random() - 0.5) * 12
      phases[i] = Math.random()
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('aPhase',   new THREE.Float32BufferAttribute(phases, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    return { geometry: geo, material: mat }
  }, [])

  useFrame((_, delta) => {
    // Drift very slowly — quarter the firefly cadence for a settled haze.
    material.uniforms.uTime.value += delta * 0.25
    const afterT = dawnT(beatIndex, beatT)
    // Fade IN after the reveal; cap low so motes read as haze, not sparks.
    material.uniforms.uOpacity.value = lerp(
      material.uniforms.uOpacity.value, afterT * 0.16, delta * 1.2
    )
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

// ─── GROUND ENERGY RINGS (post-scan) ─────────────────────────────────
function EnergyRings() {
  const beatIndex = useBeatStore(s => s.beatIndex)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   RING_VERTEX_SHADER,
    fragmentShader: RING_FRAGMENT_SHADER,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame((_, delta) => {
    material.uniforms.uTime.value    += delta
    // beat4 (invoice) gives the rings a brief ~0.9 confirmation spike.
    const target = beatIndex === 4 ? 0.9 : beatIndex >= 1 ? 0.55 : 0
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, target, delta * 1.8)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <planeGeometry args={[26, 20]} />
      <primitive object={material} />
    </mesh>
  )
}

// ─── ROUTE RIBBON — beat3, thin emissive strip along the Oak St line ──
function RouteRibbon() {
  const matRef    = useRef<THREE.MeshBasicMaterial>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const sweepRef  = useRef(0)

  useFrame((_, delta) => {
    if (!matRef.current) return
    // Sweep the emissive ribbon in only while we're on the route beat.
    const sweepTarget = beatIndex === 3 ? smoothstep(beatT * 1.4) : 0
    sweepRef.current  = lerp(sweepRef.current, sweepTarget, delta * 3)
    matRef.current.opacity = sweepRef.current * 0.85
  })

  return (
    // Oak St line: x spanning -6..6 at z ≈ 3, sitting just above the lawn.
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 3]}>
      <planeGeometry args={[12, 0.4]} />
      <meshBasicMaterial
        ref={matRef}
        color={0x2ad16a}
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ─── INVOICE PULSE RING — beat4, green ring expanding from the driveway ─
function InvoicePulseRing() {
  const meshRef   = useRef<THREE.Mesh>(null)
  const matRef    = useRef<THREE.MeshBasicMaterial>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame(() => {
    if (!meshRef.current || !matRef.current) return
    if (beatIndex === 4) {
      // Expand a flat green ring outward from ~(3.5, 0, 2) and fade as it grows.
      const e = smoothstep(beatT)
      const scale = lerp(0.2, 5.5, e)
      meshRef.current.scale.setScalar(scale)
      matRef.current.opacity = (1 - e) * 0.7
    } else {
      meshRef.current.scale.setScalar(0.2)
      matRef.current.opacity = 0
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[3.5, 0.04, 2]}>
      <ringGeometry args={[0.85, 1.0, 48]} />
      <meshBasicMaterial
        ref={matRef}
        color={0x05a845}
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

// ─── CREW LIGHT POINTS — beat5, slow warm points at the crew pins ─────
const CREW_POSITIONS: [number, number, number][] = [
  [-2, 1.2, 3],
  [2,  1.2, 4],
]

function CrewLights() {
  const refs      = useRef<(THREE.PointLight | null)[]>([])
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame((state, delta) => {
    const t      = state.clock.getElapsedTime()
    const target = beatIndex === 5 ? lerp(0, 1.6, smoothstep(beatT)) : 0
    refs.current.forEach((light, i) => {
      if (!light) return
      light.intensity = lerp(light.intensity, target, delta * 2)
      // Slow drift so the crew points feel alive without reading as orbiting.
      const base = CREW_POSITIONS[i]
      light.position.x = base[0] + Math.sin(t * 0.3 + i * 2.1) * 0.6
      light.position.z = base[2] + Math.cos(t * 0.24 + i * 1.3) * 0.6
    })
  })

  return (
    <>
      {CREW_POSITIONS.map((pos, i) => (
        <pointLight
          key={i}
          ref={el => { refs.current[i] = el }}
          color={0xffc070}
          intensity={0}
          distance={9}
          position={pos}
        />
      ))}
    </>
  )
}

// ─── FLOATING FIREFLY PARTICLES ───────────────────────────────────────
function FloatingParticles({ count }: { count: number }) {
  const beatIndex = useBeatStore(s => s.beatIndex)

  const { geometry, material } = useMemo(() => {
    const geo      = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const phases    = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 18
      positions[i * 3 + 1] = Math.random() * 3.5 + 0.3
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14
      phases[i] = Math.random()
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('aPhase',   new THREE.Float32BufferAttribute(phases, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      uniforms: {
        uTime:    { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    return { geometry: geo, material: mat }
  }, [count])

  useFrame((_, delta) => {
    material.uniforms.uTime.value    += delta
    const target = beatIndex >= 1 ? 1.0 : 0
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, target, delta * 1.4)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

// ─── CUTTY RETICLE ───────────────────────────────────────────────────
function CuttyReticle() {
  const groupRef   = useRef<THREE.Group>(null)
  const ringRef    = useRef<THREE.Mesh>(null)
  const opacityRef = useRef(0)

  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  // Per-beat anchor targets (beat1 is overridden by the label sweep below).
  const reticleTargets: [number, number, number][] = [
    [0,    1.5, 0],   // beat0 — center (hidden)
    [-3.5, 2.0, -4.5],// beat1 — start; sequences through YARD_LABELS
    [0,    2.2, 1],   // beat2 — JobCard region
    [0,    1.0, 3],   // beat3 — Oak St route midpoint
    [2.8,  1.4, 2],   // beat4 — driveway / invoice
    [0,    1.6, 3.5], // beat5 — crew area
  ]

  // Hoisted per-frame target — mutated in place (zero allocations).
  const tmpTarget = useRef(new THREE.Vector3(0, 1.5, 0))

  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x05a845, transparent: true, opacity: 0, side: THREE.DoubleSide,
  }), [])

  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x05a845, transparent: true, opacity: 0, side: THREE.DoubleSide,
  }), [])

  useFrame((state, delta) => {
    if (!groupRef.current || !ringRef.current) return
    const t = state.clock.getElapsedTime()

    const shouldShow    = beatIndex >= 1
    const targetOpacity = shouldShow ? 0.9 : 0
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, delta * 4)
    mat.opacity     = opacityRef.current
    glowMat.opacity = opacityRef.current * 0.22

    const beat = Math.min(beatIndex, 5)
    if (beatIndex === 1) {
      // Inspect each flagged issue in turn as the labels appear.
      const i   = Math.min(YARD_LABELS.length - 1, Math.floor(beatT * 4))
      const lp  = YARD_LABELS[i].position
      tmpTarget.current.set(lp[0], lp[1], lp[2])
    } else {
      const [tx, ty, tz] = reticleTargets[beat]
      tmpTarget.current.set(tx, ty, tz)
    }
    groupRef.current.position.lerp(tmpTarget.current, delta * 3.5)

    const pulse = 1.0 + Math.sin(t * 2.5) * 0.025
    ringRef.current.scale.setScalar(pulse)
  })

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.1, 0.035, 8, 64]} />
        <primitive object={mat} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[0.95, 32]} />
        <primitive object={glowMat} />
      </mesh>
      {[[-1,1],[1,1],[-1,-1],[1,-1]].map(([bx,bz], i) => (
        <group key={i} position={[bx * 1.1, 0, bz * 1.1]}>
          <mesh><boxGeometry args={[0.32, 0.03, 0.03]} /><primitive object={mat} /></mesh>
          <mesh><boxGeometry args={[0.03, 0.03, 0.32]} /><primitive object={mat} /></mesh>
        </group>
      ))}
    </group>
  )
}

// ─── LENS FLARE — sun billboard, post-scan ────────────────────────────
function LensFlare() {
  const meshRef   = useRef<THREE.Mesh>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  // Hoisted per-frame temporaries (zero allocations in useFrame).
  const camDir = useRef(new THREE.Vector3())
  const toSun  = useRef(new THREE.Vector3())

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   FLARE_VERTEX_SHADER,
    fragmentShader: FLARE_FRAGMENT_SHADER,
    uniforms: {
      uOpacity: { value: 0 },
      uTime:    { value: 0 },
    },
    transparent: true,
    depthWrite:  false,
    depthTest:   false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  }), [])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    material.uniforms.uTime.value += delta

    // Billboard: copy camera quaternion so plane always faces viewer
    meshRef.current.quaternion.copy(state.camera.quaternion)

    // Fade in after scan; proportional to how much camera faces the sun.
    // Temporaries are hoisted + mutated in place (no per-frame new Vector3).
    const afterT  = beatIndex >= 2 ? Math.min(1, (beatIndex - 1 + beatT) / 1.2) : 0
    state.camera.getWorldDirection(camDir.current)
    toSun.current.copy(SUN_POS).sub(state.camera.position).normalize()
    const facing  = Math.max(0, camDir.current.dot(toSun.current))
    const target  = afterT * facing * 0.72
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, target, delta * 2.2)
  })

  return (
    <mesh ref={meshRef} material={material} position={SUN_POS} frustumCulled={false}>
      <planeGeometry args={[7, 7]} />
    </mesh>
  )
}

// ─── YARD LABELS ─────────────────────────────────────────────────────
function YardLabels() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (beatIndex === 1) {
      const t = setTimeout(() => setVisible(true), 400)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [beatIndex])

  if (!visible) return null

  return (
    <>
      {YARD_LABELS.map((label) => (
        <Html key={label.id} position={label.position} distanceFactor={10} zIndexRange={[10, 20]}
          style={{ opacity: 1, transition: `opacity 0.3s ease ${label.staggerMs}ms, transform 0.3s ease ${label.staggerMs}ms` }}>
          <div style={{
            background: 'rgba(9,9,11,0.95)', border: '1px solid rgba(5,168,69,0.25)',
            borderRadius: '16px', backdropFilter: 'blur(24px)', padding: '8px 12px',
            minWidth: '180px', pointerEvents: 'none',
            animation: `fadeUp 0.3s ease ${label.staggerMs}ms both`,
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.2em', color: '#2ad16a', marginBottom: '3px', lineHeight: 1.2 }}>
              {label.category}
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
              {label.value}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4, marginTop: '2px' }}>
              {label.detail}
            </div>
          </div>
        </Html>
      ))}
    </>
  )
}

// Smooth visibility window over a continuous beat-progress value (beatIndex + beatT).
// Fades in over [lo, lo+margin] and out over [hi-margin, hi]; 1 in between.
function beatWindow(progress: number, lo: number, hi: number, margin: number) {
  const up   = smoothstep((progress - lo) / margin)
  const down = 1 - smoothstep((progress - (hi - margin)) / margin)
  return Math.min(up, down)
}

// ─── JOB CARD ────────────────────────────────────────────────────────
function JobCard() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // Visible across beats 2–4 with 0.25 beat-unit fade margins at each edge.
  useFrame(() => {
    if (!wrapRef.current) return
    const v = beatWindow(beatIndex + beatT, 2, 5, 0.25)
    wrapRef.current.style.opacity   = String(v)
    wrapRef.current.style.transform = `translateY(${(1 - v) * 14}px)`
  })

  return (
    <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.3} position={[1.5, 3.5, 1]}>
      <Html distanceFactor={12} zIndexRange={[5, 15]} style={{ pointerEvents: 'none' }}>
       <div ref={wrapRef} style={{ opacity: 0, transition: 'none', willChange: 'opacity, transform' }}>
        <div style={{
          background: 'rgba(9,9,11,0.92)', border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '2px solid #E85D04', borderRadius: '20px', backdropFilter: 'blur(28px)',
          boxShadow: '0 4px 24px rgba(232,93,4,0.25), 0 24px 48px rgba(0,0,0,0.5)',
          padding: '16px 20px', width: '260px',
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.2em', color: '#2ad16a', marginBottom: '8px' }}>
            SCOPE · JOHNSON PROPERTY · 847 OAK ST
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: '8px' }} />
          {[['Hedge trim (front + side)', '$120'], ['Aerate — back lawn', '$85'], ['Edge — driveway border', '$40'], ['Mulch beds (2 yards)', '$120']].map(([item, price]) => (
            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Inter', sans-serif",
              fontSize: '12px', color: '#d4d4d8', marginBottom: '4px' }}>
              <span>{item}</span><span style={{ color: '#fff', fontWeight: 600 }}>{price}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '8px', paddingTop: '8px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Outfit', sans-serif",
            fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            <span>TOTAL</span><span style={{ color: '#05a845' }}>$365 + tax</span>
          </div>
          <div style={{ marginTop: '6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '8px',
            letterSpacing: '0.15em', color: '#a1a1aa', textTransform: 'uppercase' }}>
            CREW: 2 members · 3.5 hrs · Thursday 9:00 AM
          </div>
        </div>
       </div>
      </Html>
    </Float>
  )
}

// ─── INVOICE PANEL ───────────────────────────────────────────────────
function InvoicePanel() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // Fades in over beat4 and holds through the beat5 reveal (never single-frame).
  useFrame(() => {
    if (!wrapRef.current) return
    const v = beatWindow(beatIndex + beatT, 4, 6, 0.25)
    wrapRef.current.style.opacity   = String(v)
    wrapRef.current.style.transform = `translateY(${(1 - v) * 14}px)`
  })

  return (
    <Html position={[3.5, 3.5, 2]} distanceFactor={11} zIndexRange={[8, 18]} style={{ pointerEvents: 'none' }}>
     <div ref={wrapRef} style={{ opacity: 0, willChange: 'opacity, transform' }}>
      <div style={{
        background: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', backdropFilter: 'blur(28px)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6)', padding: '16px 20px', width: '220px',
        position: 'relative',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.2em', color: '#a1a1aa', marginBottom: '6px' }}>
          INVOICE #1042
        </div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>$365.00</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#a1a1aa', marginBottom: '12px' }}>
          Johnson Property · Due on receipt
        </div>
        <div style={{ position: 'absolute', top: '50%', right: '12px',
          transform: 'translateY(-50%) rotate(-8deg)', border: '3px solid #05a845', borderRadius: '6px',
          padding: '3px 7px', fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 800,
          letterSpacing: '0.12em', color: '#05a845', textTransform: 'uppercase',
          animation: 'paidDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
          boxShadow: '0 0 16px rgba(5,168,69,0.4)' }}>PAID
        </div>
        <div style={{ background: 'rgba(5,168,69,0.1)', border: '1px solid rgba(5,168,69,0.2)',
          borderRadius: '10px', padding: '6px 10px', fontFamily: "'Inter', sans-serif",
          fontSize: '11px', color: '#2ad16a', animation: 'smsSlide 0.4s ease 1.0s both' }}>
          Payment received: $365.00 — YardWorx
        </div>
      </div>
     </div>
    </Html>
  )
}

// ─── CREW PINS ───────────────────────────────────────────────────────
function CrewPin({ pos, name, status }: { pos: [number,number,number]; name: string; status: string }) {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // Fades in on the beat5 reveal and never pops out in a single frame.
  useFrame(() => {
    if (!wrapRef.current) return
    const v = beatWindow(beatIndex + beatT, 5, 6.5, 0.25)
    wrapRef.current.style.opacity   = String(v)
    wrapRef.current.style.transform = `translateY(${(1 - v) * 12}px)`
  })

  return (
    <Html position={pos} distanceFactor={12} zIndexRange={[5, 15]} style={{ pointerEvents: 'none' }}>
      <div ref={wrapRef} style={{ opacity: 0, willChange: 'opacity, transform' }}>
        <div style={{ background: 'rgba(5,168,69,0.12)', border: '1px solid rgba(5,168,69,0.3)',
          borderRadius: '10px', padding: '5px 10px', whiteSpace: 'nowrap' }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', fontWeight: 700,
            color: '#2ad16a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {name} · {status}
          </span>
        </div>
      </div>
    </Html>
  )
}

function CrewPins() {
  return (
    <>
      {[
        { pos: [-2, 1.2, 3] as [number,number,number], name: 'Marcus', status: 'En route' },
        { pos: [2, 1.2, 4]  as [number,number,number], name: 'Dani',   status: 'En route' },
      ].map(crew => (
        <CrewPin key={crew.name} pos={crew.pos} name={crew.name} status={crew.status} />
      ))}
    </>
  )
}

// ─── MORNING MIST — ground-level fog that clears as scan passes ──────
function MorningMist() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const scanZ     = useBeatStore(s => s.scanZ)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   MIST_VERTEX_SHADER,
    fragmentShader: MIST_FRAGMENT_SHADER,
    uniforms: {
      uTime:    { value: 0 },
      uScanZ:   { value: -12 },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  }), [])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    material.uniforms.uScanZ.value = scanZ
    // Present pre-scan, dissipate during and after
    const target = beatIndex === 0 ? 1.0 : beatIndex === 1 ? lerp(1.0, 0.0, beatT) : 0
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, target, delta * 1.5)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.28, 0]}>
      <planeGeometry args={[26, 20]} />
      <primitive object={material} />
    </mesh>
  )
}

// ─── SCREEN-SPACE GOD RAYS (composer Effect, HIGH/MEDIUM) ────────────
// Replaces the fake billboard shafts with a radial-occlusion light-scatter
// pass that marches each fragment toward the sun's projected screen position,
// accumulating the scene's own bright pixels. Because it samples the rendered
// buffer, the house/trees actually OCCLUDE the shafts — the old billboards
// passed straight through. Half-res implied by the composer's downscale; the
// loop bound is a COMPILE-TIME constant with an early break on uSamples so it
// degrades by tier (48 HIGH / 24 MEDIUM) and stays WebGL-portable.
const GOD_RAY_EFFECT_FRAG = /* glsl */`
  uniform vec2  uSunScreen;   // sun NDC→UV (0..1)
  uniform float uStrength;    // beat-driven ramp (afterT)
  uniform float uDensity;
  uniform float uDecay;
  uniform float uWeight;
  uniform float uExposure;
  uniform vec3  uTint;        // warm dawn tint
  uniform int   uSamples;     // active step count (≤ GR_MAX_STEPS)

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Only scatter when the sun is roughly on-screen and the effect is active.
    vec2 delta = (uv - uSunScreen) * uDensity / float(GR_MAX_STEPS);
    vec2 coord = uv;
    float illum = 1.0;
    vec3  accum = vec3(0.0);
    for (int i = 0; i < GR_MAX_STEPS; i++) {
      if (i >= uSamples) break;                 // early-out by tier
      coord -= delta;
      vec3 s = texture2D(inputBuffer, coord).rgb;
      // Keep only the bright (sun/sky/glints) pixels so it reads as light shafts.
      float lum = max(0.0, dot(s, vec3(0.299, 0.587, 0.114)) - 0.55);
      accum += s * lum * illum * uWeight;
      illum *= uDecay;
    }
    vec3 rays = accum * uExposure * uStrength * uTint;
    outputColor = vec4(inputColor.rgb + rays, inputColor.a);
  }
`

class GodRaysEffect extends Effect {
  // Optional (unused) args object so wrapEffect's ConstructorParameters<T>[0]
  // resolves to a props object, not `undefined` (which would poison the wrapped
  // component's prop type into `undefined`).
  constructor(_props: Record<string, never> = {}) {
    super('YardGodRays', GOD_RAY_EFFECT_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      // CONVOLUTION: this effect reads inputBuffer at marched offsets, so it
      // must run as a standalone pass (postprocessing won't merge convolution
      // effects into the shared pass where arbitrary texture reads break).
      attributes: EffectAttribute.CONVOLUTION,
      defines: new Map<string, string>([['GR_MAX_STEPS', '48']]),
      uniforms: new Map<string, THREE.Uniform>([
        ['uSunScreen', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uStrength',  new THREE.Uniform(0)],
        ['uDensity',   new THREE.Uniform(0.7)],
        ['uDecay',     new THREE.Uniform(0.96)],
        ['uWeight',    new THREE.Uniform(0.5)],
        ['uExposure',  new THREE.Uniform(0.9)],
        ['uTint',      new THREE.Uniform(new THREE.Color(1.0, 0.82, 0.5))],
        ['uSamples',   new THREE.Uniform(48)],
      ]),
    })
  }
}

// drei's wrapEffect types the ref as the CONSTRUCTOR (typeof Effect); at runtime
// it forwards the Effect INSTANCE. Re-type the component so the instance ref is
// honest (the props are unchanged).
const GodRaysWrapped = wrapEffectImpl(GodRaysEffect) as React.ForwardRefExoticComponent<
  React.RefAttributes<GodRaysEffect>
>

function ScreenGodRays({ quality }: { quality: QualityConfig }) {
  const ref       = useRef<GodRaysEffect>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const { camera } = useThree()
  const tmpSun = useRef(new THREE.Vector3())

  // 48 steps on HIGH, 24 on MEDIUM (constant loop bound + early break).
  const samples = quality.tier === 'HIGH' ? 48 : 24

  useFrame(() => {
    const eff = ref.current
    if (!eff) return
    // Project the shared sun world position to screen UV once per frame.
    tmpSun.current.copy(SUN_POS).project(camera)
    const sun = eff.uniforms.get('uSunScreen')!.value as THREE.Vector2
    sun.set(tmpSun.current.x * 0.5 + 0.5, tmpSun.current.y * 0.5 + 0.5)
    // Same ramp the old billboard shafts used: bloom in beat2→, peak beat5.
    const afterT = beatIndex >= 2 ? Math.min(1, (beatIndex - 2 + beatT) / 1.8) : 0
    eff.uniforms.get('uStrength')!.value = afterT * 0.85
    ;(eff.uniforms.get('uSamples')!.value as number) = samples
  })

  return <GodRaysWrapped ref={ref} />
}

// ─── HEAT-HAZE (composer Effect, HIGH/MEDIUM) ────────────────────────
// A subtle curl-warp shimmer over the warming horizon band + near the sun —
// the air ripple over a sun-warmed lawn at dawn. Offsets the scene UV by curl
// noise (GLSL_NOISE_CHUNK), masked to the lower screen band and to sun
// proximity. uAmp kept tiny so it's felt, not seen.
const HEAT_HAZE_FRAG = /* glsl */`
  ${GLSL_NOISE_CHUNK}
  uniform float uTime;
  uniform vec2  uSunScreen;
  uniform float uStrength;   // dawnT ramp
  uniform float uFreq;
  uniform float uAmp;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2  q   = uv * uFreq + vec2(0.0, uTime * 0.4);
    vec2  off = curl2(q) * uAmp;
    float band = smoothstep(0.55, 0.30, uv.y);                  // strongest near horizon
    float sun  = smoothstep(0.5, 0.0, distance(uv, uSunScreen));
    vec2  warped = uv + off * band * (0.4 + sun) * uStrength;
    outputColor = texture2D(inputBuffer, warped);
  }
`

class HeatHazeEffect extends Effect {
  constructor(_props: Record<string, never> = {}) {
    super('YardHeatHaze', HEAT_HAZE_FRAG, {
      blendFunction: BlendFunction.NORMAL,
      // CONVOLUTION: samples inputBuffer at a warped UV (dependent texture read).
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['uTime',      new THREE.Uniform(0)],
        ['uSunScreen', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uStrength',  new THREE.Uniform(0)],
        ['uFreq',      new THREE.Uniform(5.0)],
        ['uAmp',       new THREE.Uniform(0.004)],
      ]),
    })
  }
}

const HeatHazeWrapped = wrapEffectImpl(HeatHazeEffect) as React.ForwardRefExoticComponent<
  React.RefAttributes<HeatHazeEffect>
>

function HeatHaze() {
  const ref       = useRef<HeatHazeEffect>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const { camera } = useThree()
  const tmpSun = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    const eff = ref.current
    if (!eff) return
    eff.uniforms.get('uTime')!.value += delta
    tmpSun.current.copy(SUN_POS).project(camera)
    const sun = eff.uniforms.get('uSunScreen')!.value as THREE.Vector2
    sun.set(tmpSun.current.x * 0.5 + 0.5, tmpSun.current.y * 0.5 + 0.5)
    eff.uniforms.get('uStrength')!.value = dawnT(beatIndex, beatT)
  })

  return <HeatHazeWrapped ref={ref} />
}

// ─── GOD-RAY SHAFTS — volumetric light from sun, post-scan (MOBILE) ──
// Billboard fallback for the tiers with no composer. HIGH/MEDIUM use the
// screen-space ScreenGodRays Effect above instead.
function GodRayShafts() {
  const groupRef  = useRef<THREE.Group>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   GOD_RAY_VERTEX_SHADER,
    fragmentShader: GOD_RAY_FRAGMENT_SHADER,
    uniforms: {
      uOpacity: { value: 0 },
      uTime:    { value: 0 },
    },
    transparent: true,
    depthWrite:  false,
    depthTest:   false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  }), [])

  const shafts = useMemo(() =>
    Array.from({ length: 9 }, (_, i) => ({
      angle: (i / 9) * Math.PI * 2,
      width: 0.16 + (i % 3) * 0.09,
      len:   7.5 + (i % 4) * 1.8,
    }))
  , [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    material.uniforms.uTime.value += delta
    groupRef.current.quaternion.copy(state.camera.quaternion)
    const afterT = beatIndex >= 2 ? Math.min(1, (beatIndex - 2 + beatT) / 1.8) : 0
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, afterT * 0.58, delta * 1.2)
  })

  return (
    <group ref={groupRef} position={SUN_POS} frustumCulled={false}>
      {shafts.map((s, i) => (
        <mesh key={i} rotation={[0, 0, s.angle]} position={[0, -s.len / 2, 0]} material={material}>
          <planeGeometry args={[s.width, s.len]} />
        </mesh>
      ))}
    </group>
  )
}

// ─── GROUND AURA — bioluminescent noise carpet, post-scan ────────────
function GroundAura() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   AURA_VERTEX_SHADER,
    fragmentShader: AURA_FRAGMENT_SHADER,
    uniforms: {
      uTime:    { value: 0 },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), [])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    const afterT = beatIndex >= 2 ? Math.min(1, (beatIndex - 2 + beatT) / 1.0) : 0
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, afterT * 0.95, delta * 1.5)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
      <planeGeometry args={[24, 18]} />
      <primitive object={material} />
    </mesh>
  )
}

// ─── SCAN WAKE — sparkle burst trails the scan line ───────────────────
function ScanWake() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const scanZ     = useBeatStore(s => s.scanZ)
  const COUNT     = 220

  const { geometry, material } = useMemo(() => {
    const geo       = new THREE.BufferGeometry()
    const positions = new Float32Array(COUNT * 3)
    const phases    = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 24  // full yard width
      positions[i * 3 + 1] = 0.15
      positions[i * 3 + 2] = 0
      phases[i] = Math.random()
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('aPhase',   new THREE.Float32BufferAttribute(phases, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader:   WAKE_VERTEX_SHADER,
      fragmentShader: WAKE_FRAGMENT_SHADER,
      uniforms: {
        uTime:    { value: 0 },
        uScanZ:   { value: -12 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    })

    return { geometry: geo, material: mat }
  }, [])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    material.uniforms.uScanZ.value = scanZ
    const target = beatIndex === 1 ? 0.90 : 0
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, target, delta * 3.5)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

// ─── FOG CONTROLLER — denser haze, warms toward dawn ─────────────────
function FogController() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const fogRef    = useRef<THREE.Fog>(null)

  useFrame(() => {
    if (!fogRef.current) return
    fogRef.current.color.lerpColors(FOG_NIGHT, FOG_WARM, dawnT(beatIndex, beatT))
  })

  // Tighter near/far so distant geometry actually picks up haze.
  return <fog ref={fogRef} attach="fog" args={[0x0a1428, 16, 60]} />
}

// ─── EXPOSURE CONTROLLER — tone-mapping exposure ramps with dawn ──────
function ExposureController() {
  const gl        = useThree(s => s.gl)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame(() => {
    // Back to the pre-IBL 1.15→1.6 floor now that the analytic ambient/hemi rig
    // carries the full fill again (the 1.25→1.7 bump only existed to paper over
    // the dropped ambient). The composer's <ToneMapping> reads
    // renderer.toneMappingExposure, so this single ramp drives both the
    // PP-off (renderer ACES) and PP-on (composer AgX) paths.
    gl.toneMappingExposure = lerp(1.15, 1.6, dawnT(beatIndex, beatT))
  })

  return null
}

// ─── DEPTH-OF-FIELD — per-beat focus + bokeh, opens for the reveal ───
// Focus lands on the active subject; widens on the beat5 reveal.
const BEAT_BOKEH = [2.0, 2.5, 4.5, 3.5, 5.0, 1.0]
// Normalized focus distance (mid-yard subject reads sharp); opens on beat5.
// Re-tuned after the rig moves (camera.md §5): beat2 pulls tighter (closer rack
// onto the JobCard from pos [4.5,5,5.5]); beat3's higher crane needs a fraction
// more distance; beat4's lower drop a fraction less. DOF is HIGH/MEDIUM only —
// no shot depends on it.
const BEAT_FOCUS_DIST = [0.030, 0.028, 0.022, 0.027, 0.021, 0.035]

function CinematicDOF() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dofRef    = useRef<any>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame((_, delta) => {
    const dof = dofRef.current
    if (!dof) return
    const beat = Math.min(beatIndex, 5)
    const next = Math.min(beat + 1, 5)
    const b    = smoothstep(beatT)

    const bokeh = lerp(BEAT_BOKEH[beat], BEAT_BOKEH[next], b)
    const dist  = lerp(BEAT_FOCUS_DIST[beat], BEAT_FOCUS_DIST[next], b)

    if (typeof dof.bokehScale === 'number') {
      dof.bokehScale = lerp(dof.bokehScale, bokeh, delta * 3)
    }
    const focusUniform = dof.cocMaterial?.uniforms?.focusDistance
    if (focusUniform) {
      focusUniform.value = lerp(focusUniform.value, dist, delta * 3)
    }
  })

  return (
    <DepthOfField
      ref={dofRef}
      focusDistance={BEAT_FOCUS_DIST[0]}
      focalLength={0.035}
      bokehScale={BEAT_BOKEH[0]}
    />
  )
}

// ─── CONTACT SHADOWS — cheap soft grounding, re-baked once at beat≥2 ──
// N8AO is HIGH-only; ContactShadows grounds the hero masses (house, trees,
// hedges) on every PP tier. frames={1} bakes ONCE — but trees/hedges GROW
// during the scan, so a mount-time bake captures them tiny. We force exactly
// one re-bake the first time beatIndex reaches 2 (growth complete) by bumping
// the keyed remount, so the baked contact shadow matches the grown geometry.
function SceneContactShadows({ quality }: { quality: QualityConfig }) {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const [baked, setBaked] = useState(0)
  useEffect(() => {
    if (beatIndex >= 2 && baked === 0) setBaked(1)
  }, [beatIndex, baked])

  return (
    <ContactShadows
      key={baked}
      position={[0, 0.015, 0]}
      scale={26}
      resolution={quality.tier === 'HIGH' ? 1024 : 512}
      far={9}
      blur={2.6}
      opacity={0.55}
      color="#0a1a08"
      frames={1}
    />
  )
}

// ─── INNER SCENE ─────────────────────────────────────────────────────
function SceneContent({ quality }: { quality: QualityConfig }) {
  const scanProgress = useBeatStore(s => s.scanProgress)
  const scanZ        = useBeatStore(s => s.scanZ)

  const particleCount = quality.tier === 'HIGH' ? 280 : quality.tier === 'MEDIUM' ? 140 : 60
  const enableDOF     = quality.tier === 'HIGH' || quality.tier === 'MEDIUM'

  // Mobile tiers drop the heavy decorative layers (god rays, aura, wake, dust)
  // so the beat story still reads (scan → green → route → invoice → crew) at a
  // fraction of the fill cost. Gating is purely on WHICH layers mount — never on
  // beatStore / scanZ / scanProgress / camera, which stay tier-identical.
  const heavyDecor = !quality.useSimplifiedScene

  // ── Runtime perf governor (drei PerformanceMonitor) ──────────────────
  // degradeLevel may flap ONLY effect toggles (N8AO→DoF→Bloom→clouds) + dpr
  // (AdaptiveDpr). It NEVER touches grassCount or shadowMapSize (those rebuild
  // geometry/shadow maps and would stutter), and never the beat story.
  const [degradeLevel, setDegradeLevel] = useState(0)

  const allowAO    = quality.enableSSAO && degradeLevel < 1
  const allowDOF   = enableDOF && degradeLevel < 2
  const allowBloom = quality.enableBloom && degradeLevel < 3
  // Clouds (SkyDecor) are fill-rate heavy → drop them first under load by
  // handing SkyDecor a downgraded tier (this only affects clouds + bird count,
  // never grass/shadows, which read the un-degraded quality).
  const decorQuality: QualityConfig = degradeLevel >= 1 && (quality.tier === 'HIGH' || quality.tier === 'MEDIUM')
    ? { ...quality, tier: 'MOBILE_HIGH' }
    : quality

  // Screen-space god rays run inside the composer on HIGH/MEDIUM; mobile keeps
  // the cheap billboard shafts as the no-composer fallback.
  const screenGodRays = quality.enablePostProcessing && degradeLevel < 3

  return (
    <>
      <PerformanceMonitor
        onDecline={() => setDegradeLevel(l => Math.min(3, l + 1))}
        onIncline={() => setDegradeLevel(l => Math.max(0, l - 1))}
      />
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />

      <FogController />
      <ExposureController />
      <SkyDome />
      <SkyDecor quality={decorQuality} />
      <CameraController />
      <SceneLighting quality={quality} />
      <DistantBackdrop />
      <Ground />
      <MorningMist />
      <House quality={quality} />
      <Structures />
      <FlowerBeds quality={quality} />
      <Fence quality={quality} />
      <WaterFeature quality={quality} />
      <ForegroundSilhouettes />
      <BarePatches />
      <Hedges />
      <Trees />
      <GrassMesh count={quality.grassCount} scanZ={scanZ} scanProgress={scanProgress} />
      {quality.enablePostProcessing && <SceneContactShadows quality={quality} />}
      <GroundAura />
      <RouteRibbon />
      <InvoicePulseRing />
      <CrewLights />
      <ScanPlane />
      <ScanCurtain />
      {heavyDecor && <ScanWake />}
      <EnergyRings />
      {quality.tier !== 'MINIMAL' && <FloatingParticles count={particleCount} />}
      {heavyDecor && <AerialHazeDust />}
      <CuttyReticle />
      <LensFlare />
      {/* Billboard god rays only on the no-composer tiers; HIGH/MEDIUM get the
          screen-space ScreenGodRays Effect in the composer below. */}
      {!quality.enablePostProcessing && heavyDecor && <GodRayShafts />}
      <YardLabels />
      <JobCard />
      <InvoicePanel />
      <CrewPins />

      {quality.enablePostProcessing && (
        // Cinematic-correct order: AO → DoF → Bloom → grade → ToneMapping(AgX)
        // → lens character (god rays / heat-haze / CA / Vignette / Noise).
        // multisampling + normal pass on HIGH (N8AO reads the normal buffer).
        <EffectComposer
          multisampling={quality.tier === 'HIGH' ? 4 : 0}
          enableNormalPass
          frameBufferType={THREE.HalfFloatType}
        >
          {/* 1. AO — darken cavities before anything bright (HIGH only). */}
          {allowAO ? (
            <N8AO aoRadius={1.6} distanceFalloff={1.0} intensity={2.2}
              aoSamples={16} denoiseSamples={4} denoiseRadius={12} halfRes />
          ) : <></>}
          {/* 2. DoF — depth blur on the (AO-darkened) buffer. */}
          {allowDOF ? <CinematicDOF /> : <></>}
          {/* 3. Bloom — mipmap-blur the HDR highlights (grass tips, sun, glints). */}
          {allowBloom ? (
            <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.62}
              luminanceSmoothing={0.25} radius={0.7} />
          ) : <></>}
          {/* 4. Color grade — split-tone the dawn (teal shadows / amber highs). */}
          <HueSaturation saturation={0.08} hue={0.0} />
          <BrightnessContrast brightness={0.0} contrast={0.10} />
          {/* 5. Tonemapping AS AN EFFECT — AgX desaturates highlights gracefully
                (keeps the saturated sunrise off ACES's orange hue-skew). The
                renderer keeps ACES for the PP-off mobile fallback. */}
          <ToneMapping mode={ToneMappingMode.AGX} />
          {/* 6. Lens character on the graded image — god rays, heat-haze, then
                CA / vignette / grain LAST so they sit on final pixels. */}
          {screenGodRays ? <ScreenGodRays quality={quality} /> : <></>}
          <HeatHaze />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0009, 0.0009] as unknown as THREE.Vector2}
            radialModulation={true}
            modulationOffset={0.25}
          />
          <Vignette offset={0.42} darkness={0.62} />
          <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.03} />
        </EffectComposer>
      )}
    </>
  )
}

// ─── EXPORTED CANVAS ─────────────────────────────────────────────────
export default function YardSceneCanvas({ quality }: { quality: QualityConfig }) {
  return (
    <Canvas
      camera={{ position: [10, 8, 14], fov: 40, near: 0.1, far: 200 }}
      gl={{
        antialias: quality.tier !== 'MOBILE_LOW' && quality.tier !== 'MINIMAL',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.25,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        // No canvas capture exists in src/ → drop preserveDrawingBuffer (a real
        // cost on mobile GPUs; the browser otherwise keeps the back buffer).
        preserveDrawingBuffer: false,
      }}
      dpr={quality.dpr}
      shadows={quality.shadowMapSize > 0}
      frameloop="always"
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <SceneContent quality={quality} />
      </Suspense>
    </Canvas>
  )
}
