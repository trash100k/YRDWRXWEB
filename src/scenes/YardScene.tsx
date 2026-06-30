import { useRef, useMemo, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, DepthOfField, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useBeatStore } from '@/stores/beatStore'
import { YARD_LABELS } from '@/data/beats'
import { QualityConfig } from '@/hooks/useGPUTier'
import GrassMesh from './GrassMesh'
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
const KEY_WARM       = new THREE.Color(0xffd080)
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
  { pos: [8,  6,  10],  look: [0,   1.5, 0] }, // beat0 — wide establishing
  { pos: [6,  5,  7.5], look: [0,   1,   2] }, // beat1 — low push-in toward the scan
  { pos: [5,  5,  6],   look: [1.5, 3,   1] }, // beat2 — angled on the JobCard
  { pos: [4,  8,  9],   look: [0,   1,   3] }, // beat3 — high + pulled back over Oak St
  { pos: [5,  3.5, 6],  look: [3.5, 2,   2] }, // beat4 — low near the driveway
  { pos: [12, 10, 15],  look: [0,   1.5, 0] }, // beat5 — wide + high golden hero
]
// Per-beat target FOV: compression on beat4, openness on the beat5 reveal.
const CAMERA_FOV = [40, 40, 40, 40, 38, 44]

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

    // Breathing offset — bounded; cut hard on beat1 so the push-in reads clean.
    const breatheScale = beatIndex === 1 ? 0.0 : 1.0
    tmpBreathe.current.set(
      Math.sin(t * 0.12) * 0.3 * breatheScale,
      Math.sin(t * 0.2)  * 0.15 * breatheScale,
      Math.sin(t * 0.12) * 0.3 * breatheScale,
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

    // Hemisphere: night → dim afternoon, on the same continuous ramp.
    hemiRef.current.color.lerpColors(HEMI_SKY_NIGHT, HEMI_SKY_DAY, afterT)
    hemiRef.current.groundColor.lerpColors(HEMI_GND_NIGHT, HEMI_GND_DAY, afterT)
    hemiRef.current.intensity = lerp(hemiRef.current.intensity, lerp(0.35, 1.3, afterT), delta * 1.5)

    // Warm sun: dominant shadow caster as it ramps in; pushes to a golden hero on beat5.
    const sunTarget = lerp(0, 1.8, afterT) + heroBoost * 0.6 // → ~2.4 at full beat5
    sunRef.current.intensity = lerp(sunRef.current.intensity, sunTarget, delta * 1.8)

    // Rim: cool edge → warm edge across the arc.
    rimRef.current.intensity = lerp(0.65, 1.4, afterT)
    rimRef.current.color.lerpColors(RIM_COOL, RIM_WARM, afterT)
  })

  return (
    <>
      <ambientLight ref={ambientRef} color={0x18202e} intensity={0.55} />
      <hemisphereLight ref={hemiRef} args={[0x080f20, 0x0c0f08, 0.35]} position={[0, 20, 0]} />
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

function Hedges() {
  const matsRef    = useRef<THREE.MeshStandardMaterial[]>([])
  const clusterRefs = useRef<(THREE.Group | null)[]>([])
  const beatIndex  = useBeatStore(s => s.beatIndex)
  const scanZ      = useBeatStore(s => s.scanZ)

  // One growth value per cluster (0.15 = sprout, 1.0 = full) — each emerges as
  // the shared scan wavefront passes its Z, exactly like the trees, instead of
  // the whole hedge group popping up at once.
  const growthRef  = useRef<number[]>([])

  useFrame((_, delta) => {
    const afterScan = beatIndex >= 1
    matsRef.current.forEach(mat => {
      mat.color.lerp(afterScan ? C.HEDGE_AFTER : C.HEDGE, delta * 1.2)
      mat.emissiveIntensity = lerp(mat.emissiveIntensity, afterScan ? 0.09 : 0, delta * 1.5)
    })

    clusterRefs.current.forEach((grp, i) => {
      if (!grp) return
      const clusterZ = HEDGE_CLUSTERS[i].pos[2]
      // Fast-up / slow-down lerp, identical cadence to the trees' emergence.
      const passed = afterScan && scanZ > clusterZ - 1.5
      const target = passed ? 1.0 : 0.15
      const speed  = passed ? 5.5 : 2.0
      const g = growthRef.current[i] ?? 0.15
      growthRef.current[i] = lerp(g, target, delta * speed)
      // scale.y about each sub-group's own origin (ground level) so clusters
      // rise from the lawn rather than scaling around the scene root.
      grp.scale.y = growthRef.current[i]
    })
  })

  const hedgeMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: C.HEDGE, roughness: 0.88, emissive: C.HEDGE_AFTER, emissiveIntensity: 0 })
    matsRef.current.push(m)
    return m
  }, [])

  return (
    <group>
      <group ref={el => { clusterRefs.current[0] = el }} position={[-4, 0, -5]} scale={[1, 0.15, 1]}>
        <mesh castShadow receiveShadow material={hedgeMat}><boxGeometry args={[7, 1.8, 1.2]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[2.2, 0.7, 0.2]}><sphereGeometry args={[0.7, 8, 6]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[-1.5, 0.6, -0.2]}><sphereGeometry args={[0.55, 7, 5]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[0, 0.8, 0.3]}><sphereGeometry args={[0.45, 6, 5]} /></mesh>
      </group>
      <group ref={el => { clusterRefs.current[1] = el }} position={[-7.5, 0, -1]} scale={[1, 0.15, 1]}>
        <mesh castShadow receiveShadow material={hedgeMat}><boxGeometry args={[1.0, 2.2, 6]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[0.3, 0.9, -1.8]}><sphereGeometry args={[0.6, 7, 5]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[-0.2, 0.7, 1.2]}><sphereGeometry args={[0.5, 6, 5]} /></mesh>
      </group>
      <group ref={el => { clusterRefs.current[2] = el }} position={[2, 0, -5.5]} scale={[1, 0.15, 1]}>
        <mesh castShadow receiveShadow material={hedgeMat}><boxGeometry args={[4, 1.4, 0.9]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[1.5, 0.5, 0.1]}><sphereGeometry args={[0.5, 7, 5]} /></mesh>
      </group>

      {/* Foundation low-shrub strip across the house front (z ≈ -5.3, x = -5..5) */}
      <group ref={el => { clusterRefs.current[3] = el }} position={[0, 0, -5.3]} scale={[1, 0.15, 1]}>
        <mesh castShadow receiveShadow material={hedgeMat}><boxGeometry args={[9.4, 0.7, 0.7]} /></mesh>
        {[-4, -2.4, -0.8, 2.6, 4.2].map((bx, i) => (
          <mesh key={i} castShadow material={hedgeMat} position={[bx, 0.35, 0.1]}>
            <sphereGeometry args={[0.4 + (i % 2) * 0.12, 7, 5]} />
          </mesh>
        ))}
      </group>

      {/* Right-side shrub / hedge cluster — fills the bare right flank (x ≈ +5..7) */}
      <group ref={el => { clusterRefs.current[4] = el }} position={[6, 0, -2.5]} scale={[1, 0.15, 1]}>
        <mesh castShadow receiveShadow material={hedgeMat}><boxGeometry args={[1.6, 1.6, 3.2]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[0.2, 0.7, -1.0]}><sphereGeometry args={[0.62, 7, 5]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[-0.2, 0.6, 1.0]}><sphereGeometry args={[0.55, 7, 5]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[0.3, 0.8, 0.2]}><sphereGeometry args={[0.48, 6, 5]} /></mesh>
      </group>
    </group>
  )
}

// ─── HOUSE + DRIVEWAY + MULCH ────────────────────────────────────────
function Structures() {
  return (
    <>
      {/* House body */}
      <mesh position={[0, 2.5, -7.5]} castShadow receiveShadow>
        <boxGeometry args={[11, 5, 4]} />
        <meshStandardMaterial color={C.HOUSE} roughness={0.80} metalness={0.06} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 6.5, -7.5]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0, 7.8, 3, 4]} />
        <meshStandardMaterial color={C.ROOF} roughness={0.92} />
      </mesh>

      {/* Eave / gable trim — thin box tucked under the roofline */}
      <mesh position={[0, 5.1, -7.5]} castShadow>
        <boxGeometry args={[11.4, 0.35, 4.4]} />
        <meshStandardMaterial color={C.ROOF} roughness={0.9} />
      </mesh>

      {/* Chimney */}
      <mesh position={[3.2, 7.4, -8.2]} castShadow>
        <boxGeometry args={[1.0, 2.6, 1.0]} />
        <meshStandardMaterial color={C.ROOF} roughness={0.95} />
      </mesh>

      {/* Front door + small porch overhang, camera-visible face (z ≈ -5.5) */}
      <mesh position={[1.0, 1.4, -5.45]}>
        <planeGeometry args={[1.3, 2.8]} />
        <meshStandardMaterial color={0x241a12} roughness={0.7} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[1.0, 2.95, -5.0]} castShadow>
        <boxGeometry args={[2.0, 0.18, 1.0]} />
        <meshStandardMaterial color={C.ROOF} roughness={0.9} />
      </mesh>

      {/* Windows on the camera-visible right face (x ≈ +5.5) */}
      <mesh position={[5.5, 3.4, -7.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.4, 1.1, 0.05]} />
        <meshStandardMaterial color={0x2a3a50} roughness={0.15} metalness={0.4}
          emissive={C.WINDOW_WARM} emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[5.5, 3.4, -8.8]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.2, 1.0, 0.05]} />
        <meshStandardMaterial color={0x2a3a50} roughness={0.15} metalness={0.4}
          emissive={C.WINDOW_WARM} emissiveIntensity={0.30} />
      </mesh>

      {/* Garage door */}
      <mesh position={[-3.0, 1.25, -5.6]}>
        <boxGeometry args={[3.5, 2.5, 0.1]} />
        <meshStandardMaterial color={0x3a4260} roughness={0.65} metalness={0.1} />
      </mesh>

      {/* Window — with interior warm glow */}
      <mesh position={[2.5, 3.5, -5.6]}>
        <boxGeometry args={[1.8, 1.2, 0.05]} />
        <meshStandardMaterial color={0x2a3a50} roughness={0.15} metalness={0.4}
          emissive={C.WINDOW_WARM} emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[-0.8, 3.5, -5.6]}>
        <boxGeometry args={[1.4, 1.0, 0.05]} />
        <meshStandardMaterial color={0x2a3a50} roughness={0.15} metalness={0.4}
          emissive={C.WINDOW_WARM} emissiveIntensity={0.40} />
      </mesh>

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
function Trees() {
  const groupRef  = useRef<THREE.Group>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const scanZ     = useBeatStore(s => s.scanZ)

  // Per-tree growth tracking (0 = tiny, 1 = full size)
  const growthRef = useRef(new Array(6).fill(0.05))

  const canopyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: C.CANOPY, roughness: 0.86, emissive: C.CANOPY_AFTER, emissiveIntensity: 0,
  }), [])

  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: C.TRUNK, roughness: 1.0,
  }), [])

  useFrame((state, delta) => {
    const t      = state.clock.getElapsedTime()
    const afterScan = beatIndex >= 1

    canopyMat.color.lerp(afterScan ? C.CANOPY_AFTER : C.CANOPY, delta * 1.0)
    canopyMat.emissiveIntensity = lerp(canopyMat.emissiveIntensity, afterScan ? 0.10 : 0, delta * 1.2)

    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        // Cinematic sway
        child.rotation.z = Math.sin(t * 0.7 + i * 1.5) * 0.018
        child.rotation.x = Math.sin(t * 0.5 + i * 1.1) * 0.012

        // Sequential emergence: trees grow up as scan sweeps past their Z
        const tz     = trees[i].z
        const passed = beatIndex >= 1 && scanZ > tz - 1.5
        const target = passed ? 1.0 : 0.05
        const speed  = passed ? 5.5 : 2.0  // snap up fast, shrink slowly
        growthRef.current[i] = lerp(growthRef.current[i], target, delta * speed)

        const g = growthRef.current[i]
        // Y grows from ground up; X/Z are more restrained for natural look
        child.scale.set(lerp(0.25, 1.0, g), g, lerp(0.25, 1.0, g))
      })
    }
  })

  // [x, z, trunkH, r1, r2, r3] — three stacked canopy spheres per tree
  const trees = [
    { x: 6.5,  z: -3,  h: 4.4, r1: 1.25, r2: 0.95, r3: 0.60 },
    { x: 7.8,  z: 1,   h: 3.6, r1: 1.05, r2: 0.80, r3: 0.50 },
    { x: -7.2, z: 3,   h: 5.0, r1: 1.35, r2: 1.05, r3: 0.65 },
    { x: -5.5, z: -2,  h: 3.2, r1: 0.85, r2: 0.65, r3: 0.40 },
    { x: 5.0,  z: 4.5, h: 2.9, r1: 0.78, r2: 0.58, r3: 0.35 },
    { x: -2.0, z: 6,   h: 2.5, r1: 0.65, r2: 0.48, r3: 0.30 },
  ]

  return (
    <group ref={groupRef}>
      {trees.map((tr, i) => (
        <group key={i} position={[tr.x, 0, tr.z]}>
          {/* Trunk */}
          <mesh castShadow position={[0, tr.h / 2, 0]} material={trunkMat}>
            <cylinderGeometry args={[0.10, 0.24, tr.h, 7]} />
          </mesh>
          {/* Lower canopy — widest */}
          <mesh castShadow position={[0, tr.h + tr.r1 * 0.45, 0]} material={canopyMat}>
            <sphereGeometry args={[tr.r1, 11, 9]} />
          </mesh>
          {/* Mid canopy — offset slightly */}
          <mesh castShadow position={[tr.r2 * 0.2, tr.h + tr.r1 * 0.9 + tr.r2 * 0.5, tr.r2 * -0.1]} material={canopyMat}>
            <sphereGeometry args={[tr.r2, 10, 8]} />
          </mesh>
          {/* Top tuft */}
          <mesh castShadow position={[0, tr.h + tr.r1 * 0.9 + tr.r2 * 1.0 + tr.r3 * 0.4, 0]} material={canopyMat}>
            <sphereGeometry args={[tr.r3, 8, 7]} />
          </mesh>
        </group>
      ))}
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

function DistantBackdrop() {
  const matsRef   = useRef<THREE.MeshStandardMaterial[]>([])
  const skirtRef  = useRef<THREE.MeshStandardMaterial>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  // Treeline mass — large cones/spheres on an arc from x:-150°..+150° behind
  // the house, at radius 40–60, jittered in height/size for an organic ridge.
  const hills = useMemo(() => {
    const arr: { x: number; z: number; y: number; r: number; h: number; cone: boolean }[] = []
    const N = 26
    for (let i = 0; i < N; i++) {
      // Wrap behind (z negative) and around the sides; skip the camera-facing front.
      const a = Math.PI * (0.62 + (i / (N - 1)) * 1.76) // ~112°..430°
      const rad = 42 + Math.sin(i * 2.3) * 9            // 33..51-ish, then clamped
      const radius = Math.max(40, Math.min(60, rad + 8))
      const x = Math.cos(a) * radius
      const z = Math.sin(a) * radius - 6                // bias the ring behind the house
      const r = 7 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 7 // 7..14 wide
      const h = 4 + (Math.sin(i * 0.9) * 0.5 + 0.5) * 8 // 4..12 tall
      arr.push({ x, z, y: 0, r, h, cone: i % 2 === 0 })
    }
    return arr
  }, [])

  // Warm the treeline + skirt slightly toward the horizon sky as dawn ramps.
  useFrame((_, delta) => {
    const afterT = dawnT(beatIndex, beatT)
    matsRef.current.forEach(m => {
      m.color.lerpColors(BACKDROP_TREE, SKY_HOR_DAWN, afterT * 0.45)
      m.emissiveIntensity = lerp(m.emissiveIntensity, afterT * 0.10, delta * 1.4)
    })
    if (skirtRef.current) {
      skirtRef.current.color.lerpColors(BACKDROP_SKIRT, SKY_HOR_DAWN, afterT * 0.4)
    }
  })

  return (
    <group>
      {/* Oversized ground skirt under the main 22×18 lawn — fades to horizon. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        renderOrder={-9}
      >
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

      {/* Treeline / hill ring — mixed toward horizon, no shadow interaction. */}
      {hills.map((hh, i) => (
        <mesh key={i} position={[hh.x, hh.y, hh.z]}>
          {hh.cone
            ? <coneGeometry args={[hh.r, hh.h, 7]} />
            : <sphereGeometry args={[hh.r * 0.85, 9, 7]} />}
          <meshStandardMaterial
            ref={el => { if (el) matsRef.current[i] = el }}
            color={BACKDROP_TREE}
            roughness={1.0}
            metalness={0}
            emissive={BACKDROP_HAZE}
            emissiveIntensity={0}
            fog={true}
          />
        </mesh>
      ))}
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

      {/* Tall shrub / post mass, front-right. */}
      <group position={[8, 0, 8]}>
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

    // Fade in after scan; proportional to how much camera faces the sun
    const afterT  = beatIndex >= 2 ? Math.min(1, (beatIndex - 1 + beatT) / 1.2) : 0
    const camDir  = new THREE.Vector3()
    state.camera.getWorldDirection(camDir)
    const toSun   = SUN_POS.clone().sub(state.camera.position).normalize()
    const facing  = Math.max(0, camDir.dot(toSun))
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

// ─── GOD-RAY SHAFTS — volumetric light from sun, post-scan ───────────
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
    gl.toneMappingExposure = lerp(1.15, 1.6, dawnT(beatIndex, beatT))
  })

  return null
}

// ─── DEPTH-OF-FIELD — per-beat focus + bokeh, opens for the reveal ───
// Focus lands on the active subject; widens on the beat5 reveal.
const BEAT_BOKEH = [2.0, 2.5, 4.5, 3.5, 5.0, 1.0]
// Normalized focus distance (mid-yard subject reads sharp); opens on beat5.
const BEAT_FOCUS_DIST = [0.030, 0.028, 0.024, 0.026, 0.022, 0.035]

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

// ─── INNER SCENE ─────────────────────────────────────────────────────
function SceneContent({ quality }: { quality: QualityConfig }) {
  const scanProgress = useBeatStore(s => s.scanProgress)
  const scanZ        = useBeatStore(s => s.scanZ)

  const particleCount = quality.tier === 'HIGH' ? 280 : quality.tier === 'MEDIUM' ? 140 : 60
  const enableDOF     = quality.tier === 'HIGH' || quality.tier === 'MEDIUM'

  return (
    <>
      <FogController />
      <ExposureController />
      <SkyDome />
      <CameraController />
      <SceneLighting quality={quality} />
      <DistantBackdrop />
      <Ground />
      <MorningMist />
      <Structures />
      <ForegroundSilhouettes />
      <BarePatches />
      <Hedges />
      <Trees />
      <GrassMesh count={quality.grassCount} scanZ={scanZ} scanProgress={scanProgress} />
      <GroundAura />
      <RouteRibbon />
      <InvoicePulseRing />
      <CrewLights />
      <ScanPlane />
      <ScanCurtain />
      <ScanWake />
      <EnergyRings />
      {quality.tier !== 'MINIMAL' && <FloatingParticles count={particleCount} />}
      <AerialHazeDust />
      <CuttyReticle />
      <LensFlare />
      <GodRayShafts />
      <YardLabels />
      <JobCard />
      <InvoicePanel />
      <CrewPins />

      {quality.enablePostProcessing && (
        <EffectComposer>
          {enableDOF ? <CinematicDOF /> : <></>}
          {quality.enableBloom ? (
            <Bloom intensity={0.95} luminanceThreshold={0.80} luminanceSmoothing={0.3} radius={0.5} />
          ) : <></>}
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0012, 0.0012] as unknown as THREE.Vector2}
            radialModulation={true}
            modulationOffset={0.2}
          />
          <Vignette offset={0.5} darkness={0.58} />
          <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.035} />
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
        toneMappingExposure: 1.15,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
        preserveDrawingBuffer: true,
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
