import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBeatStore } from '@/stores/beatStore'
import { QualityConfig } from '@/hooks/useGPUTier'

// ─── Local color tokens (mirror YardScene C.* — none are exported) ────
const HOUSE       = new THREE.Color(0x2d3a52)
const ROOF        = new THREE.Color(0x1c2235)
const WINDOW_WARM = new THREE.Color(0x4a7ab0)
const FASCIA      = new THREE.Color(0x232a3e) // slightly lighter trim than roof
const GUTTER      = new THREE.Color(0x161b2a)
const SHUTTER     = new THREE.Color(0x1f3325) // desaturated forest accent
const DOOR        = new THREE.Color(0x241a12)
const POST        = new THREE.Color(0x2a3146)
const GARAGE      = new THREE.Color(0x3a4260)
const WINDOW_FRAME = new THREE.Color(0x2a3a50)
const MULLION     = new THREE.Color(0x10141f)

// ─── Local dawn ramp (identical to YardScene.dawnT; not exported there) ─
function clamp01(x: number) { return Math.min(1, Math.max(0, x)) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp01(t) }
function dawnT(beatIndex: number, beatT: number) {
  return clamp01(((beatIndex + beatT) - 1.0) / 4.0)
}

// ─── Shared geometry / material singletons (zero per-frame allocations) ─
// A single window pane geometry + a frame box, reused by every <Window/>.
const PANE_GEO   = new THREE.BoxGeometry(1, 1, 1)
const MULLION_GEO = new THREE.BoxGeometry(1, 1, 1)

// ─── A single window: glass pane + a `+` mullion cross + frame ────────
// Local +Z faces outward. The pane material is shared back up so the
// parent can ramp every window's emissive in one place.
interface WindowProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  width: number
  height: number
  baseEmissive: number
  paneMatRef: React.MutableRefObject<THREE.MeshStandardMaterial[]>
  baseEmissiveRef: React.MutableRefObject<number[]>
  showMullions: boolean
}

function Window({
  position, rotation = [0, 0, 0], width, height,
  baseEmissive, paneMatRef, baseEmissiveRef, showMullions,
}: WindowProps) {
  const paneMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: WINDOW_FRAME, roughness: 0.15, metalness: 0.4,
      emissive: WINDOW_WARM.clone(), emissiveIntensity: baseEmissive,
    })
    paneMatRef.current.push(m)
    baseEmissiveRef.current.push(baseEmissive)
    return m
  }, [])

  const mullionMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: MULLION, roughness: 0.6, metalness: 0.1,
  }), [])

  const bar = 0.04 // mullion bar thickness

  return (
    <group position={position} rotation={rotation}>
      {/* Glass pane (slight depth so the frame reads) */}
      <mesh geometry={PANE_GEO} scale={[width, height, 0.05]} material={paneMat} />
      {showMullions && (
        <>
          {/* Vertical mullion bar */}
          <mesh
            geometry={MULLION_GEO}
            position={[0, 0, 0.045]}
            scale={[bar, height, 0.04]}
            material={mullionMat}
          />
          {/* Horizontal mullion bar */}
          <mesh
            geometry={MULLION_GEO}
            position={[0, 0, 0.045]}
            scale={[width, bar, 0.04]}
            material={mullionMat}
          />
        </>
      )}
    </group>
  )
}

// ─── HOUSE — detailed parametric structure ────────────────────────────
// Replaces the inline house block in YardScene's Structures(). Sits at the
// existing world transform [0,2.5,-7.5] with an 11×5×4 body, casts into the
// ±16 shadow frustum. Window interior glow dims as dawn rises (1 - dawnT*0.5).
// Tier gating governs which trim layers mount — the beat story never gates
// on tier (this geometry carries no scan dependence, only the dawn ramp).
export default function House({ quality }: { quality: QualityConfig }) {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  // Full trim only on desktop tiers; mobile keeps body+roof+door+windows.
  const detailed = quality.tier === 'HIGH' || quality.tier === 'MEDIUM'

  // Window panes collect their material + authored base emissive here so the
  // useFrame ramps every one without per-frame allocation.
  const paneMatRef     = useRef<THREE.MeshStandardMaterial[]>([])
  const baseEmissiveRef = useRef<number[]>([])

  const bodyMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: HOUSE, roughness: 0.80, metalness: 0.06 }), [])
  const roofMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: ROOF, roughness: 0.92 }), [])
  const fasciaMat = useMemo(() => new THREE.MeshStandardMaterial({ color: FASCIA, roughness: 0.85 }), [])
  const gutterMat = useMemo(() => new THREE.MeshStandardMaterial({ color: GUTTER, roughness: 0.5, metalness: 0.3 }), [])
  const shutterMat = useMemo(() => new THREE.MeshStandardMaterial({ color: SHUTTER, roughness: 0.85 }), [])
  const doorMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: DOOR, roughness: 0.7, metalness: 0.05, side: THREE.DoubleSide }), [])
  const postMat   = useMemo(() => new THREE.MeshStandardMaterial({ color: POST, roughness: 0.8 }), [])
  const garageMat = useMemo(() => new THREE.MeshStandardMaterial({ color: GARAGE, roughness: 0.65, metalness: 0.1 }), [])
  const garageLineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: MULLION, roughness: 0.7, metalness: 0.1 }), [])

  useFrame((_, delta) => {
    // Interior lights dim as the sun rises: emissive = base * (1 - dawnT*0.5).
    const after = dawnT(beatIndex, beatT)
    const factor = 1 - after * 0.5
    const mats  = paneMatRef.current
    const bases = baseEmissiveRef.current
    for (let i = 0; i < mats.length; i++) {
      const target = bases[i] * factor
      mats[i].emissiveIntensity = lerp(mats[i].emissiveIntensity, target, delta * 1.5)
    }
  })

  // 4 shutter pairs flank front-face + right-face windows. Each entry is the
  // window center + half-gap to the inner shutter edge; rotation matches face.
  // (Front face z ≈ -5.6 looks +Z; right face x ≈ 5.5 looks +X.)
  const shutter = (
    key: string,
    pos: [number, number, number],
    rot: [number, number, number],
    h: number,
  ) => (
    <mesh key={key} position={pos} rotation={rot} castShadow material={shutterMat}>
      <boxGeometry args={[0.28, h, 0.06]} />
    </mesh>
  )

  return (
    <group>
      {/* House body */}
      <mesh position={[0, 2.5, -7.5]} castShadow receiveShadow material={bodyMat}>
        <boxGeometry args={[11, 5, 4]} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 6.5, -7.5]} rotation={[0, Math.PI / 4, 0]} castShadow material={roofMat}>
        <cylinderGeometry args={[0, 7.8, 3, 4]} />
      </mesh>

      {/* Eave / gable trim — thin box tucked under the roofline */}
      <mesh position={[0, 5.1, -7.5]} castShadow material={roofMat}>
        <boxGeometry args={[11.4, 0.35, 4.4]} />
      </mesh>

      {/* Chimney */}
      <mesh position={[3.2, 7.4, -8.2]} castShadow material={roofMat}>
        <boxGeometry args={[1.0, 2.6, 1.0]} />
      </mesh>

      {/* ── Fascia board: continuous thin band along the eave on the front ── */}
      {detailed && (
        <mesh position={[0, 4.85, -5.45]} castShadow material={fasciaMat}>
          <boxGeometry args={[11.2, 0.28, 0.12]} />
        </mesh>
      )}

      {/* ── Gutters: thin boxes along the front eave and the right eave ── */}
      {detailed && (
        <>
          {/* Front gutter (runs along x, just below the fascia, +z edge) */}
          <mesh position={[0, 4.66, -5.48]} castShadow material={gutterMat}>
            <boxGeometry args={[11.2, 0.14, 0.16]} />
          </mesh>
          {/* Right-face gutter (runs along z) */}
          <mesh position={[5.52, 4.66, -7.5]} castShadow material={gutterMat}>
            <boxGeometry args={[0.16, 0.14, 4.1]} />
          </mesh>
          {/* Downspout at the front-right corner */}
          <mesh position={[5.45, 2.4, -5.5]} castShadow material={gutterMat}>
            <boxGeometry args={[0.12, 4.4, 0.12]} />
          </mesh>
        </>
      )}

      {/* Front door + small porch overhang, camera-visible face (z ≈ -5.5) */}
      <mesh position={[1.0, 1.4, -5.45]} material={doorMat}>
        <planeGeometry args={[1.3, 2.8]} />
      </mesh>
      <mesh position={[1.0, 2.95, -5.0]} castShadow material={roofMat}>
        <boxGeometry args={[2.0, 0.18, 1.0]} />
      </mesh>

      {/* ── 2 porch posts under the overhang ── */}
      {detailed && (
        <>
          <mesh position={[0.15, 1.45, -5.0]} castShadow material={postMat}>
            <cylinderGeometry args={[0.08, 0.09, 2.9, 8]} />
          </mesh>
          <mesh position={[1.85, 1.45, -5.0]} castShadow material={postMat}>
            <cylinderGeometry args={[0.08, 0.09, 2.9, 8]} />
          </mesh>
        </>
      )}

      {/* ── Windows (with `+` mullion cross when detailed) ── */}
      {/* Right face (x ≈ 5.5), looking +X */}
      <Window
        position={[5.5, 3.4, -7.5]} rotation={[0, Math.PI / 2, 0]}
        width={1.4} height={1.1} baseEmissive={0.45}
        paneMatRef={paneMatRef} baseEmissiveRef={baseEmissiveRef} showMullions={detailed}
      />
      <Window
        position={[5.5, 3.4, -8.8]} rotation={[0, Math.PI / 2, 0]}
        width={1.2} height={1.0} baseEmissive={0.30}
        paneMatRef={paneMatRef} baseEmissiveRef={baseEmissiveRef} showMullions={detailed}
      />
      {/* Front face (z ≈ -5.6), looking +Z */}
      <Window
        position={[2.5, 3.5, -5.6]} width={1.8} height={1.2} baseEmissive={0.55}
        paneMatRef={paneMatRef} baseEmissiveRef={baseEmissiveRef} showMullions={detailed}
      />
      <Window
        position={[-0.8, 3.5, -5.6]} width={1.4} height={1.0} baseEmissive={0.40}
        paneMatRef={paneMatRef} baseEmissiveRef={baseEmissiveRef} showMullions={detailed}
      />

      {/* ── 4 shutter pairs flanking the windows ── */}
      {detailed && (
        <>
          {/* Front window @ x=2.5 (half-width 0.9 → shutter at ±1.05) */}
          {shutter('s0a', [1.42, 3.5, -5.58], [0, 0, 0], 1.2)}
          {shutter('s0b', [3.58, 3.5, -5.58], [0, 0, 0], 1.2)}
          {/* Front window @ x=-0.8 (half-width 0.7 → shutter at ±0.88) */}
          {shutter('s1a', [-1.68, 3.5, -5.58], [0, 0, 0], 1.0)}
          {shutter('s1b', [0.08, 3.5, -5.58], [0, 0, 0], 1.0)}
          {/* Right window @ z=-7.5 (half-width 0.7 → shutter at z ±0.88) */}
          {shutter('s2a', [5.52, 3.4, -6.62], [0, Math.PI / 2, 0], 1.1)}
          {shutter('s2b', [5.52, 3.4, -8.38], [0, Math.PI / 2, 0], 1.1)}
          {/* Right window @ z=-8.8 (half-width 0.6 → shutter at z ±0.76) */}
          {shutter('s3a', [5.52, 3.4, -8.04], [0, Math.PI / 2, 0], 1.0)}
          {shutter('s3b', [5.52, 3.4, -9.56], [0, Math.PI / 2, 0], 1.0)}
        </>
      )}

      {/* ── Garage door + inset panel lines ── */}
      <mesh position={[-3.0, 1.25, -5.6]} castShadow receiveShadow material={garageMat}>
        <boxGeometry args={[3.5, 2.5, 0.1]} />
      </mesh>
      {detailed && (
        <>
          {[0.85, 0.28, -0.29, -0.86].map((gy, i) => (
            <mesh key={`gp${i}`} position={[-3.0, 1.25 + gy, -5.66]} material={garageLineMat}>
              <boxGeometry args={[3.4, 0.04, 0.04]} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}
