import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBeatStore } from '@/stores/beatStore'
import { QualityConfig } from '@/hooks/useGPUTier'
import {
  GLSL_NOISE_CHUNK,
  SCAN_GROWTH_CHUNK,
  FOUNTAIN_WATER_VERTEX_SHADER,
  FOUNTAIN_WATER_FRAGMENT_SHADER,
} from './shaders'

// ─── Placement — focal mid-yard spot the camera holds on ─────────────
// Inside the DoF in-focus band (z≈0–4), outside the driveway (x∈[-5,-0.5]),
// and well within the ±16 shadow frustum so the basin casts cleanly.
const FEATURE_POS: [number, number, number] = [3.5, 0, 3]

// ─── Stone palette — neutral grey basin, roughness 0.9 ───────────────
const STONE = new THREE.Color(0x6a6e72)

// Water disc radius (sits just inside the bowl rim).
const WATER_RADIUS = 0.85
// World-Z of the water surface (basin centre Z) — the scan reveal gate
// (greenedAt(wp.z) inside FOUNTAIN_WATER_*) keys off this Z, matching the
// spec's "water wakes once scanZ > 3 - 1.5" without re-deriving the math.
const WATER_Z = FEATURE_POS[2]

// ─── Basin — cylinder stack: plinth / pedestal / bowl ────────────────
// Shared dry-stone basin used on EVERY non-MINIMAL tier (casts shadow).
function Basin() {
  return (
    <group position={FEATURE_POS}>
      {/* Plinth — wide base ring on the lawn */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1.0, 0.3, 24]} />
        <meshStandardMaterial color={STONE} roughness={0.9} metalness={0} />
      </mesh>
      {/* Pedestal — slender stem rising to the bowl */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.3, 1.2, 20]} />
        <meshStandardMaterial color={STONE} roughness={0.9} metalness={0} />
      </mesh>
      {/* Bowl — open-top basin holding the water disc */}
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 0.75, 0.35, 28, 1, true]} />
        <meshStandardMaterial color={STONE} roughness={0.9} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─── Full water surface — HIGH / MEDIUM custom GLSL ──────────────────
// Reuses the shared FOUNTAIN_WATER_* program: curl-rippled, scan-gated so
// the surface only "comes alive" (ripples + caustics fade in) once the scan
// wavefront passes its Z, then holds — driven entirely by uScanZ/uScanProgress
// inside the shader (greenedAt). uDawn carries the shared dawnT warm tint.
function ShaderWater() {
  const scanZ        = useBeatStore(s => s.scanZ)
  const scanProgress = useBeatStore(s => s.scanProgress)
  const beatIndex    = useBeatStore(s => s.beatIndex)
  const beatT        = useBeatStore(s => s.beatT)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   GLSL_NOISE_CHUNK + SCAN_GROWTH_CHUNK + FOUNTAIN_WATER_VERTEX_SHADER,
    fragmentShader: GLSL_NOISE_CHUNK + SCAN_GROWTH_CHUNK + FOUNTAIN_WATER_FRAGMENT_SHADER,
    uniforms: {
      uTime:         { value: 0 },
      uScanZ:        { value: -12 },
      uScanProgress: { value: 0 },
      uDawn:         { value: 0 },
      uOpacity:      { value: 0.85 },
    },
    transparent: true,
    depthWrite:  false,
  }), [])

  useFrame((_, delta) => {
    const u = material.uniforms
    u.uTime.value        += delta
    u.uScanZ.value        = scanZ
    u.uScanProgress.value = scanProgress
    // Match the shared dawn ramp the rest of the scene warms on (in-place lerp).
    const dawn = Math.min(1, Math.max(0, (beatIndex + beatT - 1.0) / 4.0))
    u.uDawn.value = u.uDawn.value + (dawn - u.uDawn.value) * Math.min(1, delta * 1.5)
  })

  return (
    <mesh
      position={[FEATURE_POS[0], 1.62, WATER_Z]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={material}
    >
      <circleGeometry args={[WATER_RADIUS, 48]} />
    </mesh>
  )
}

// ─── Flat reflective water disc — MOBILE_HIGH / MOBILE_LOW ───────────
// No custom shader / caustics. A standard reflective disc that fades in on
// the scan pass via opacity, keeping the "water wakes up" beat tier-identical
// (the gate is still scanZ vs WATER_Z, never gated on tier).
function FlatWater() {
  const scanZ = useBeatStore(s => s.scanZ)

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x12303a,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), [])

  useFrame((_, delta) => {
    // Water present-but-dry pre-scan; fades in once the wavefront passes,
    // then holds. Same scanZ > WATER_Z - 1.5 gate the rest of the scene uses.
    const passed = scanZ > WATER_Z - 1.5
    const target = passed ? 0.9 : 0
    material.opacity = material.opacity + (target - material.opacity) * Math.min(1, delta * 2.5)
  })

  return (
    <mesh
      position={[FEATURE_POS[0], 1.62, WATER_Z]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={material}
    >
      <circleGeometry args={[WATER_RADIUS, 32]} />
    </mesh>
  )
}

// ─── WATER FEATURE — cylinder-stack basin + scan-revealed water ──────
// HIGH/MED: full FOUNTAIN_WATER_* shader. MOBILE_*: flat reflective disc.
// MINIMAL: omitted (the ReducedScene path renders no Canvas anyway).
export default function WaterFeature({ quality }: { quality: QualityConfig }) {
  if (quality.tier === 'MINIMAL') return null

  const fullShader = quality.tier === 'HIGH' || quality.tier === 'MEDIUM'

  return (
    <group>
      <Basin />
      {fullShader ? <ShaderWater /> : <FlatWater />}
    </group>
  )
}
