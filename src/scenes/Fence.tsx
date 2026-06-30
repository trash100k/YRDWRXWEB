import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { useBeatStore } from '@/stores/beatStore'
import { QualityConfig } from '@/hooks/useGPUTier'
import {
  GLSL_NOISE_CHUNK,
  SCAN_GROWTH_CHUNK,
  FENCE_REVEAL_VERTEX_SHADER,
  FENCE_REVEAL_FRAGMENT_SHADER,
} from './shaders'

// ─── Per-tier picket budget (one instanced draw) ─────────────────────
// HIGH 70 / MEDIUM 50 / MOBILE_HIGH 24 (front only) / MOBILE_LOW + MINIMAL omit.
function picketCount(tier: QualityConfig['tier']): number {
  switch (tier) {
    case 'HIGH':        return 70
    case 'MEDIUM':      return 50
    case 'MOBILE_HIGH': return 24
    default:            return 0
  }
}

// ─── Picket dimensions — base-anchored so the reveal rises from y=0 ──
// FENCE_REVEAL_VERTEX_SHADER scales local Y by the scan reveal about the
// post base, so the geometry's local origin MUST sit at the ground (y=0)
// with the picket extending up to +PICKET_H.
const PICKET_W = 0.08
const PICKET_H = 0.9
const PICKET_D = 0.04

// Run extents. The front run hugs z≈+6.5 across the lawn width, leaving the
// driveway mouth (x∈[-5,-0.5]) open as a gate gap. The right run climbs x≈+9
// from mid-lawn to the front corner. Both stay inside the ±16 shadow frustum.
const FRONT_Z = 6.5
const FRONT_X0 = -9
const FRONT_X1 = 9
const DRIVE_X0 = -5      // gate gap start (driveway mouth)
const DRIVE_X1 = -0.5    // gate gap end
const RIGHT_X = 9
const RIGHT_Z0 = -2
const RIGHT_Z1 = 6.5

interface Picket {
  pos: [number, number, number]
  rotY: number
}

// Deterministic picket layout: pickets are spread evenly along the front run
// (skipping the driveway gap) and, on the wider tiers, up the right run. A
// tiny seeded jitter on Y-rotation keeps the line from reading as a perfect
// machine grid. MOBILE_HIGH uses front-only (per the tier budget) by virtue
// of the smaller share never reaching the right run.
function buildPickets(count: number, frontOnly: boolean): Picket[] {
  if (count < 1) return []

  // Usable front length excludes the driveway gap so spacing stays uniform on
  // the actual planted spans rather than ghosting pickets across the opening.
  const gapLen   = DRIVE_X1 - DRIVE_X0
  const frontLen = (FRONT_X1 - FRONT_X0) - gapLen
  const rightLen = RIGHT_Z1 - RIGHT_Z0

  // Split the picket budget between runs by length (front-only on MOBILE_HIGH).
  const totalLen   = frontOnly ? frontLen : frontLen + rightLen
  const frontCount = frontOnly ? count : Math.round(count * (frontLen / totalLen))
  const rightCount = frontOnly ? 0 : count - frontCount

  let seed = 0x1f3d5b79
  const rand = () => {
    // xorshift32 — stable layout, no per-frame cost (mirrors FlowerBeds).
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 100000) / 100000
  }

  const out: Picket[] = []

  // Front run: walk along usable front length, jumping the driveway gap.
  for (let i = 0; i < frontCount; i++) {
    const f = frontCount > 1 ? i / (frontCount - 1) : 0
    let x = FRONT_X0 + f * frontLen
    if (x >= DRIVE_X0) x += gapLen        // hop over the open gate mouth
    out.push({
      pos: [x, 0, FRONT_Z],
      rotY: (rand() - 0.5) * 0.06,        // faint hand-set wobble
    })
  }

  // Right run: climb x≈+9 from mid-lawn to the front corner; pickets turn 90°.
  for (let i = 0; i < rightCount; i++) {
    const f = rightCount > 1 ? i / (rightCount - 1) : 0
    const z = RIGHT_Z0 + f * rightLen
    out.push({
      pos: [RIGHT_X, 0, z],
      rotY: Math.PI / 2 + (rand() - 0.5) * 0.06,
    })
  }

  return out
}

// Base-anchored picket: a thin box whose local origin sits at the ground so
// the FENCE reveal scales it up out of the lawn. Pointed cap (chamfered top)
// is faked with a slightly narrower upper section via two stacked boxes merged
// into one geometry — cheap, and keeps a single instanced draw.
function buildPicketGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(PICKET_W, PICKET_H, PICKET_D)
  // Shift up so the base sits at y=0 (local origin at the post base).
  body.translate(0, PICKET_H / 2, 0)
  return body
}

// Weathered-cedar base color; warms toward the rim with dawnT in-shader.
const WOOD = new THREE.Color(0x6b5236)

// ─── PROPERTY FENCE — instanced pickets that RISE on the scan wavefront ─
// Pickets reveal entirely in-shader (uScanZ uniform → growthAt) so 70 posts
// never touch the per-frame JS hot path. A matching customDepthMaterial folds
// the same per-instance transform + Y-reveal so the cast shadow tracks each
// picket as it rises out of the ground rather than ghosting full-height.
export default function Fence({ quality }: { quality: QualityConfig }) {
  const count     = picketCount(quality.tier)
  const frontOnly = quality.tier === 'MOBILE_HIGH'

  const scanZ        = useBeatStore(s => s.scanZ)
  const scanProgress = useBeatStore(s => s.scanProgress)
  const beatIndex    = useBeatStore(s => s.beatIndex)
  const beatT        = useBeatStore(s => s.beatT)

  const geometry = useMemo(() => buildPicketGeometry(), [])
  const pickets  = useMemo(() => buildPickets(count, frontOnly), [count, frontOnly])

  // Surface material. The canonical FENCE shaders read the world transform off
  // modelMatrix; on an InstancedMesh that is the (identity) group matrix, so we
  // fold each picket's instanceMatrix into the world placement + reveal Z and
  // the normal — exactly the idiom FlowerBeds uses for BLOOM — WITHOUT editing
  // shaders.ts. The scan-wavefront math (growthAt via SCAN_GROWTH_CHUNK) stays
  // byte-for-byte intact, so pickets rise on the same edge as grass/ground.
  const material = useMemo(() => {
    const vert = (GLSL_NOISE_CHUNK + SCAN_GROWTH_CHUNK + FENCE_REVEAL_VERTEX_SHADER)
      // Per-instance world Z that drives the reveal front for this picket.
      .replace(
        'vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;',
        'vec3 wp = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;',
      )
      // Fold the per-instance transform into the final world placement + normal.
      .replace(
        'vec4 wp4 = modelMatrix * vec4(p, 1.0);',
        'vec4 wp4 = modelMatrix * instanceMatrix * vec4(p, 1.0);',
      )
      .replace(
        'vNormalW  = normalize(mat3(modelMatrix) * normal);',
        'vNormalW  = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);',
      )

    const mat = new THREE.ShaderMaterial({
      vertexShader:   vert,
      fragmentShader: GLSL_NOISE_CHUNK + SCAN_GROWTH_CHUNK + FENCE_REVEAL_FRAGMENT_SHADER,
      uniforms: {
        uTime:         { value: 0 },
        uScanZ:        { value: -12 },
        uScanProgress: { value: 0 },
        uWood:         { value: WOOD.clone() },
        uDawn:         { value: 0 },
      },
    })
    return mat
  }, [])

  // Custom depth material so the cast shadow tracks the rising pickets. It
  // replays the SAME per-instance transform + Y-reveal scale as the surface
  // vertex shader (via onBeforeCompile), then packs depth normally. Sharing
  // the uScanZ / uScanProgress uniform objects keeps it on the same wavefront
  // with zero extra per-frame work.
  const depthMaterial = useMemo(() => {
    const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uScanZ        = material.uniforms.uScanZ
      shader.uniforms.uScanProgress = material.uniforms.uScanProgress
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uScanZ;
           uniform float uScanProgress;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           {
             vec3 _wp     = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
             float _sd    = _wp.z - uScanZ;
             float _gT    = clamp(1.0 - _sd / 2.5, 0.0, 1.0);
             float _rev   = smoothstep(0.0, 1.0, clamp(_gT, 0.0, 1.0) * uScanProgress);
             transformed.y *= mix(0.02, 1.0, _rev);
           }`,
        )
    }
    // Tag the cache key so three keeps this program distinct.
    mat.customProgramCacheKey = () => 'fence-depth-reveal'
    return mat
  }, [material])

  // Drive the shared uniforms forward. Dawn ramp is a plain number — zero
  // per-frame allocations (no THREE.* constructed in useFrame).
  useFrame((_, delta) => {
    const u = material.uniforms
    u.uTime.value        += delta
    u.uScanZ.value         = scanZ
    u.uScanProgress.value  = scanProgress
    // Match the shared dawn ramp the rest of the scene warms on.
    const dawn = Math.min(1, Math.max(0, (beatIndex + beatT - 1.0) / 4.0))
    u.uDawn.value          = u.uDawn.value + (dawn - u.uDawn.value) * Math.min(1, delta * 1.5)
  })

  if (count < 1) return null

  return (
    <Instances
      geometry={geometry}
      material={material}
      customDepthMaterial={depthMaterial}
      limit={count}
      castShadow
      frustumCulled={false}
    >
      {pickets.map((p, i) => (
        <Instance key={i} position={p.pos} rotation={[0, p.rotY, 0]} />
      ))}
    </Instances>
  )
}
