import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { useBeatStore } from '@/stores/beatStore'
import { QualityConfig } from '@/hooks/useGPUTier'
import {
  GLSL_NOISE_CHUNK,
  SCAN_GROWTH_CHUNK,
  BLOOM_VERTEX_SHADER,
  BLOOM_FRAGMENT_SHADER,
} from './shaders'

// ─── Per-tier blossom budget (one instanced draw) ────────────────────
// HIGH 180 / MEDIUM 90 / MOBILE_HIGH 30 / MOBILE_LOW + MINIMAL omit.
function bloomCount(tier: QualityConfig['tier']): number {
  switch (tier) {
    case 'HIGH':        return 180
    case 'MEDIUM':      return 90
    case 'MOBILE_HIGH': return 30
    default:            return 0
  }
}

// ─── Mulch beds (mirror the three planes in Structures) ──────────────
// [cx, cz, halfX, halfZ] — the camera-visible mulch rects the blossoms fill.
const BEDS: { cx: number; cz: number; hx: number; hz: number }[] = [
  { cx: -7.2, cz: -2.5, hx: 0.8, hz: 2.5 },  // left strip   (1.6 × 5)
  { cx: -2.5, cz: -4.8, hx: 4.0, hz: 0.7 },  // mid strip    (8 × 1.4)
  { cx: 0.0,  cz: -5.3, hx: 5.0, hz: 0.5 },  // foundation   (10 × 1.0)
]

// ─── Garden palette — per-instance coral / gold / white / violet ─────
const PETALS = [
  new THREE.Color(0xff5a6e), // coral
  new THREE.Color(0xffc23a), // gold
  new THREE.Color(0xf4f0ff), // white
  new THREE.Color(0xb070ff), // violet
]

interface Blossom {
  pos: [number, number, number]
  rotY: number
  scale: number
  color: THREE.Color
}

// Deterministic blossom field, reject-sampled into the bed rects so they
// never bleed onto the lawn/walkway (same idiom GrassMesh uses for the drive).
function buildBlossoms(count: number): Blossom[] {
  let seed = 0x9e3779b9
  const rand = () => {
    // xorshift32 — stable layout, no per-frame cost.
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 100000) / 100000
  }

  const totalHalfArea = BEDS.reduce((a, b) => a + b.hx * b.hz, 0)
  const out: Blossom[] = []
  for (let i = 0; i < count; i++) {
    // Pick a bed weighted by its footprint so larger beds plant more.
    let pick = rand() * totalHalfArea
    let bed = BEDS[0]
    for (const b of BEDS) {
      pick -= b.hx * b.hz
      if (pick <= 0) { bed = b; break }
    }
    // Reject-sample inside the rect, with a small inset so heads sit on mulch.
    const x = bed.cx + (rand() * 2 - 1) * bed.hx * 0.88
    const z = bed.cz + (rand() * 2 - 1) * bed.hz * 0.88
    out.push({
      pos: [x, 0.02, z],
      rotY: rand() * Math.PI * 2,
      scale: 0.5 + rand() * 0.55,
      color: PETALS[Math.floor(rand() * PETALS.length) % PETALS.length],
    })
  }
  return out
}

// One five-petal corolla. Each petal: a thin upright quad whose LOCAL origin
// sits at the petal base and whose local +Y runs up the petal — exactly the
// convention BLOOM_VERTEX_SHADER unfurls from (xz/y scale + base-anchored
// back-bend). Petals fan around +Y so the bloom opens like a real flower.
function buildBlossomGeometry(): THREE.BufferGeometry {
  const PETALS_N = 5
  const W = 0.05   // petal half-width at base
  const H = 0.16   // petal length (local +Y)
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const tilt = 0.5 // splay petals outward from the axis
  for (let p = 0; p < PETALS_N; p++) {
    const a = (p / PETALS_N) * Math.PI * 2
    const ca = Math.cos(a), sa = Math.sin(a)
    // Petal plane fans outward: local up tilts away from the central axis.
    const base = positions.length / 3
    // Quad corners in a petal-local frame, then rotated about Y by `a`.
    const corners: [number, number, number][] = [
      [-W, 0.0, 0.0],
      [ W, 0.0, 0.0],
      [-W * 0.4, H, H * tilt],
      [ W * 0.4, H, H * tilt],
    ]
    for (const [lx, ly, lz] of corners) {
      // rotate (lx,lz) about Y so petals radiate; lz pushes the tip outward.
      const wx = lx * ca + lz * sa
      const wz = -lx * sa + lz * ca
      positions.push(wx, ly, wz)
      // Outward+up normal so wrap-diffuse in the shader reads the corolla.
      const nx = ca * 0.5, nz = sa * 0.5
      const nl = Math.hypot(nx, 1.0, nz)
      normals.push(nx / nl, 1.0 / nl, nz / nl)
      // vUv.y = 0 base → 1 tip drives the petal gradient.
      uvs.push(ly < 0.001 ? 0 : 0.5, ly < 0.001 ? 0 : 1)
    }
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

// Fold drei's per-instance instanceMatrix / instanceColor into the shared
// BLOOM program WITHOUT editing shaders.ts. The canonical BLOOM shaders work
// off modelMatrix; on an InstancedMesh that is the (identity) group matrix, so
// we route each blossom's world transform through instanceMatrix and its
// palette color through instanceColor → uPetalA. The scan-wavefront math
// (growthAt / greenedAt via SCAN_GROWTH_CHUNK) is left byte-for-byte intact.
function instanceVertex(src: string): string {
  return src
    .replace(
      'uniform float uTime;',
      `uniform float uTime;
       varying vec3 vInstColor;`,
    )
    // Per-instance base position: modelMatrix * instanceMatrix * origin.
    .replace(
      'vec3 wpBase = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
      'vec3 wpBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;\n       vInstColor = instanceColor;',
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
}

function instanceFragment(src: string): string {
  return src
    .replace(
      'uniform float uDawn;',
      `uniform float uDawn;
       varying vec3 vInstColor;`,
    )
    // Drive the petal base color from the per-instance palette; the shared
    // tip color (uPetalB default) gives every bloom a warm gradient.
    .replace(
      'vec3 petalA = (dot(uPetalA, uPetalA) > 0.0) ? uPetalA : vec3(0.92, 0.30, 0.42);',
      'vec3 petalA = (dot(vInstColor, vInstColor) > 0.0) ? vInstColor : vec3(0.92, 0.30, 0.42);',
    )
}

// ─── FLOWER BEDS — instanced blossoms that OPEN on the scan wavefront ─
export default function FlowerBeds({ quality }: { quality: QualityConfig }) {
  const count = bloomCount(quality.tier)

  const scanZ        = useBeatStore(s => s.scanZ)
  const scanProgress = useBeatStore(s => s.scanProgress)
  const beatIndex    = useBeatStore(s => s.beatIndex)
  const beatT        = useBeatStore(s => s.beatT)

  const geometry = useMemo(() => buildBlossomGeometry(), [])

  const blossoms = useMemo(() => buildBlossoms(count), [count])

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader:   GLSL_NOISE_CHUNK + SCAN_GROWTH_CHUNK + instanceVertex(BLOOM_VERTEX_SHADER),
      fragmentShader: GLSL_NOISE_CHUNK + SCAN_GROWTH_CHUNK + instanceFragment(BLOOM_FRAGMENT_SHADER),
      uniforms: {
        uTime:         { value: 0 },
        uScanZ:        { value: -12 },
        uScanProgress: { value: 0 },
        uDawn:         { value: 0 },
      },
      transparent: true,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    })
    return mat
  }, [])

  // Dawn ramp temporary is a plain number — no per-frame allocations.
  useFrame((_, delta) => {
    const u = material.uniforms
    u.uTime.value         += delta
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
      limit={count}
      frustumCulled={false}
    >
      {blossoms.map((b, i) => (
        <Instance
          key={i}
          position={b.pos}
          rotation={[0, b.rotY, 0]}
          scale={b.scale}
          color={b.color}
        />
      ))}
    </Instances>
  )
}
