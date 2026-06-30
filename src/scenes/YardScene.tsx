import { useRef, useMemo, Suspense, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useBeatStore } from '@/stores/beatStore'
import { YARD_LABELS } from '@/data/beats'
import { QualityConfig } from '@/hooks/useGPUTier'
import GrassMesh from './GrassMesh'

// ─── colors ──────────────────────────────────────────────────────────
const C = {
  BEFORE_GRASS: new THREE.Color(0x3d4e35),
  AFTER_GRASS:  new THREE.Color(0x05a845),
  HEDGE:        new THREE.Color(0x1e2d18),
  HEDGE_AFTER:  new THREE.Color(0x2a4a1e),
  HOUSE:        new THREE.Color(0x1e2330),
  CONCRETE:     new THREE.Color(0x52545c),
  MULCH:        new THREE.Color(0x4a3520),
  TRUNK:        new THREE.Color(0x2d1f0e),
  CANOPY:       new THREE.Color(0x1a2810),
  FOREST:       new THREE.Color(0x05a845),
  SCAN_GLOW:    new THREE.Color(0x2ad16a),
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.min(1, Math.max(0, t)) }

// ─── CAMERA CONTROLLER ───────────────────────────────────────────────
function CameraController() {
  const { camera } = useThree()
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  const targets: [number, number, number][] = [
    [0, 1, 0],
    [-1, 1.5, -1],
    [0, 1.5, 1],
    [-3, 1, 0],
    [1, 1.2, 2],
    [0, 1, 0],
  ]

  const lookRef = useRef(new THREE.Vector3(0, 1, 0))
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    const beat = Math.min(beatIndex, 5)
    const [tx, ty, tz] = targets[beat]
    const tgt = new THREE.Vector3(tx, ty, tz)
    lookRef.current.lerp(tgt, delta * 2.2)

    camera.position.x = lerp(camera.position.x, 10 + Math.sin(t * 0.18) * 0.3, delta * 0.8)
    camera.position.y = lerp(camera.position.y, 8 + Math.sin(t * 0.28) * 0.18, delta * 0.8)
    camera.position.z = lerp(camera.position.z, 14 + Math.sin(t * 0.12) * 0.2, delta * 0.8)
    camera.lookAt(lookRef.current)
  })

  return null
}

// ─── LIGHTING ────────────────────────────────────────────────────────
function SceneLighting() {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const keyRef     = useRef<THREE.DirectionalLight>(null)
  const rimRef     = useRef<THREE.DirectionalLight>(null)
  const fillRef    = useRef<THREE.PointLight>(null)

  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame((_, delta) => {
    if (!keyRef.current || !fillRef.current || !ambientRef.current) return

    const progress = beatIndex + beatT
    const scanActive = progress > 0.8 && progress < 2.2
    const afterScan  = progress >= 1.5

    const targetFill = afterScan ? 2.2 : scanActive ? lerp(0, 2.2, (progress - 0.8) / 0.7) : 0
    fillRef.current.intensity = lerp(fillRef.current.intensity, targetFill, delta * 2.5)

    const targetKeyIntensity = afterScan ? 2.0 : 1.6
    keyRef.current.intensity = lerp(keyRef.current.intensity, targetKeyIntensity, delta * 1.5)

    const keyColorTarget = afterScan
      ? new THREE.Color(0xffd4a0)
      : new THREE.Color(0xc0cce0)
    keyRef.current.color.lerp(keyColorTarget, delta * 1.2)
  })

  return (
    <>
      <ambientLight ref={ambientRef} color={0x1a2030} intensity={0.7} />
      <directionalLight
        ref={keyRef}
        color={0xc0cce0}
        intensity={1.6}
        position={[-8, 12, -5]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.001}
      />
      <directionalLight ref={rimRef} color={0x223355} intensity={0.8} position={[5, 6, -10]} />
      <pointLight ref={fillRef} color={0x1a5c2a} intensity={0} distance={30} position={[8, 4, 4]} />
    </>
  )
}

// ─── SCAN PLANE ──────────────────────────────────────────────────────
function ScanPlane() {
  const planeRef = useRef<THREE.Mesh>(null)
  const glowRef  = useRef<THREE.Mesh>(null)
  const scanZ    = useRef(-12)

  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame((_, delta) => {
    if (!planeRef.current || !glowRef.current) return
    const mat  = planeRef.current.material as THREE.MeshBasicMaterial
    const gmat = glowRef.current.material as THREE.MeshBasicMaterial

    if (beatIndex === 1) {
      const t = 1 - Math.pow(1 - beatT, 2.5)
      const targetZ = lerp(-10, 10, t)
      scanZ.current += (targetZ - scanZ.current) * Math.min(1, delta * 4)

      mat.opacity  = Math.min(0.5, beatT * 3)
      gmat.opacity = Math.min(0.7, beatT * 2.5)
    } else if (beatIndex >= 2) {
      scanZ.current = 12
      mat.opacity  = Math.max(0, mat.opacity - delta * 3)
      gmat.opacity = Math.max(0, gmat.opacity - delta * 3)
    } else {
      scanZ.current = -12
      mat.opacity  = 0
      gmat.opacity = 0
    }

    planeRef.current.position.z = scanZ.current
    glowRef.current.position.z  = scanZ.current
  })

  return (
    <>
      <mesh ref={planeRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -12]}>
        <planeGeometry args={[24, 0.08]} />
        <meshBasicMaterial color={0x2ad16a} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, -12]}>
        <planeGeometry args={[24, 0.6]} />
        <meshBasicMaterial color={0x2ad16a} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// ─── GROUND (shader-driven greening) ─────────────────────────────────
function Ground() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame((_, delta) => {
    if (!matRef.current) return
    const afterAmount = beatIndex === 1 ? beatT : beatIndex >= 2 ? 1 : 0
    matRef.current.color.lerp(
      afterAmount > 0.5 ? C.AFTER_GRASS : C.BEFORE_GRASS,
      delta * 1.8
    )
    matRef.current.roughness = lerp(matRef.current.roughness, 0.85, delta)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[22, 18, 32, 32]} />
      <meshStandardMaterial ref={matRef} color={C.BEFORE_GRASS} roughness={0.95} metalness={0} />
    </mesh>
  )
}

// ─── GREENING SECTIONS (wave L→R) ────────────────────────────────────
function GreenWave() {
  const sections = useRef<THREE.Mesh[]>([])
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  const sectionXs = [-7, -3.5, 0, 3.5, 7]

  function smoothstep(lo: number, hi: number, t: number) {
    const x = Math.max(0, Math.min(1, (t - lo) / (hi - lo)))
    return x * x * (3 - 2 * x)
  }

  useFrame(() => {
    const scanZ = beatIndex === 1 ? lerp(-10, 10, 1 - Math.pow(1 - beatT, 2.5)) : beatIndex >= 2 ? 12 : -12
    sections.current.forEach((mesh, i) => {
      if (!mesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      const sx = sectionXs[i]
      const progress = smoothstep(sx - 4, sx + 2, scanZ)
      mat.color.lerpColors(C.BEFORE_GRASS, C.AFTER_GRASS, progress)
      mat.emissiveIntensity = progress * 0.1
    })
  })

  return (
    <>
      {sectionXs.map((x, i) => (
        <mesh
          key={i}
          ref={el => { if (el) sections.current[i] = el }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.018, 1]}
          receiveShadow
        >
          <planeGeometry args={[3.5, 10]} />
          <meshStandardMaterial color={C.BEFORE_GRASS} roughness={0.9} emissive={C.AFTER_GRASS} emissiveIntensity={0} />
        </mesh>
      ))}
    </>
  )
}

// ─── HEDGES ──────────────────────────────────────────────────────────
function Hedges() {
  const groupRef = useRef<THREE.Group>(null)
  const matsRef  = useRef<THREE.MeshStandardMaterial[]>([])
  const beatIndex = useBeatStore(s => s.beatIndex)

  useFrame((_, delta) => {
    matsRef.current.forEach(mat => {
      const target = beatIndex >= 1 ? C.HEDGE_AFTER : C.HEDGE
      mat.color.lerp(target, delta * 1.0)
    })
  })

  const hedgeMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: C.HEDGE, roughness: 0.9 })
    matsRef.current.push(m)
    return m
  }, [])

  return (
    <group ref={groupRef}>
      {/* Front hedge — overgrown, lumpy */}
      <group position={[-4, 0, -5]}>
        <mesh castShadow receiveShadow material={hedgeMat}>
          <boxGeometry args={[7, 1.8, 1.2]} />
        </mesh>
        <mesh castShadow material={hedgeMat} position={[2.2, 0.7, 0.2]}>
          <sphereGeometry args={[0.7, 8, 6]} />
        </mesh>
        <mesh castShadow material={hedgeMat} position={[-1.5, 0.6, -0.2]}>
          <sphereGeometry args={[0.55, 7, 5]} />
        </mesh>
        <mesh castShadow material={hedgeMat} position={[0, 0.8, 0.3]}>
          <sphereGeometry args={[0.45, 6, 5]} />
        </mesh>
      </group>

      {/* Side hedge */}
      <group position={[-7.5, 0, -1]}>
        <mesh castShadow receiveShadow material={hedgeMat}>
          <boxGeometry args={[1.0, 2.2, 6]} />
        </mesh>
        <mesh castShadow material={hedgeMat} position={[0.3, 0.9, -1.8]}>
          <sphereGeometry args={[0.6, 7, 5]} />
        </mesh>
        <mesh castShadow material={hedgeMat} position={[-0.2, 0.7, 1.2]}>
          <sphereGeometry args={[0.5, 6, 5]} />
        </mesh>
      </group>

      {/* Back hedge — asymmetric */}
      <group position={[2, 0, -5.5]}>
        <mesh castShadow receiveShadow material={hedgeMat}>
          <boxGeometry args={[4, 1.4, 0.9]} />
        </mesh>
        <mesh castShadow material={hedgeMat} position={[1.5, 0.5, 0.1]}>
          <sphereGeometry args={[0.5, 7, 5]} />
        </mesh>
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
        <meshStandardMaterial color={C.HOUSE} roughness={0.85} />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 6.5, -7.5]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0, 7.8, 3, 4]} />
        <meshStandardMaterial color={0x141824} roughness={0.95} />
      </mesh>

      {/* Garage door */}
      <mesh position={[-3.0, 1.25, -5.6]}>
        <boxGeometry args={[3.5, 2.5, 0.1]} />
        <meshStandardMaterial color={0x2e3240} roughness={0.7} />
      </mesh>

      {/* Window */}
      <mesh position={[2.5, 3.5, -5.6]}>
        <boxGeometry args={[1.8, 1.2, 0.05]} />
        <meshStandardMaterial color={0x1a2a3a} roughness={0.2} metalness={0.3} />
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

      {/* Bare patches */}
      {[
        { pos: [3.2, 0.015, 2.5] as [number,number,number], sx: 1.2, sz: 0.7 },
        { pos: [-1.0, 0.015, 4.2] as [number,number,number], sx: 0.8, sz: 0.5 },
        { pos: [4.5, 0.015, -0.5] as [number,number,number], sx: 0.6, sz: 0.9 },
      ].map((p, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={p.pos} scale={[p.sx, p.sz, 1]} receiveShadow>
          <circleGeometry args={[0.9, 12]} />
          <meshStandardMaterial color={0x5a4d35} roughness={1.0} />
        </mesh>
      ))}
    </>
  )
}

// ─── TREES ───────────────────────────────────────────────────────────
function Trees() {
  const treePositions: [number, number, number, number][] = [
    [6.5, -3, 3.5, 1.0],
    [7.8, 1, 2.8, 0.9],
    [-7.2, 3, 3.2, 1.1],
  ]
  return (
    <>
      {treePositions.map(([x, z, h, r], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, h / 2, 0]}>
            <cylinderGeometry args={[0.12, 0.2, h, 7]} />
            <meshStandardMaterial color={C.TRUNK} roughness={1.0} />
          </mesh>
          <mesh castShadow position={[0, h + r * 0.6, 0]}>
            <sphereGeometry args={[r, 10, 8]} />
            <meshStandardMaterial color={C.CANOPY} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// ─── CUTTY RETICLE ───────────────────────────────────────────────────
function CuttyReticle() {
  const groupRef   = useRef<THREE.Group>(null)
  const ringRef    = useRef<THREE.Mesh>(null)
  const opacityRef = useRef(0)

  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  const reticleTargets: [number, number, number][] = [
    [0, 1.5, 0],
    [-3.5, 2.0, -4.5],
    [0, 2.2, 1],
    [-3, 1.5, 0],
    [1, 1.5, 2],
    [0, 2.5, 0],
  ]

  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x05a845,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  }), [])

  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x05a845,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  }), [])

  useFrame((state, delta) => {
    if (!groupRef.current || !ringRef.current) return
    const t = state.clock.getElapsedTime()

    const shouldShow = beatIndex >= 1 && beatIndex <= 4
    const targetOpacity = shouldShow ? (beatIndex >= 5 ? Math.max(0, 1 - beatT * 3) : 0.9) : 0
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, delta * 4)

    mat.opacity  = opacityRef.current
    glowMat.opacity = opacityRef.current * 0.2

    const beat = Math.min(beatIndex, 5)
    const [tx, ty, tz] = reticleTargets[beat]
    const tgt = new THREE.Vector3(tx, ty, tz)
    groupRef.current.position.lerp(tgt, delta * 3.5)

    const pulse = 1.0 + Math.sin(t * 2.5) * 0.02
    ringRef.current.scale.setScalar(pulse)
  })

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      {/* Main ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.1, 0.035, 8, 64]} />
        <primitive object={mat} />
      </mesh>
      {/* Glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <circleGeometry args={[0.95, 32]} />
        <primitive object={glowMat} />
      </mesh>
      {/* Corner brackets */}
      {[[-1,1],[1,1],[-1,-1],[1,-1]].map(([bx,bz], i) => (
        <group key={i} position={[bx * 1.1, 0, bz * 1.1]}>
          <mesh>
            <boxGeometry args={[0.32, 0.03, 0.03]} />
            <primitive object={mat} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.03, 0.03, 0.32]} />
            <primitive object={mat} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ─── YARD LABELS (Html overlays, beat 1) ─────────────────────────────
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
      {YARD_LABELS.map((label, i) => (
        <Html
          key={label.id}
          position={label.position}
          distanceFactor={10}
          zIndexRange={[10, 20]}
          style={{ opacity: 1, transition: `opacity 0.3s ease ${label.staggerMs}ms, transform 0.3s ease ${label.staggerMs}ms` }}
        >
          <div style={{
            background: 'rgba(9,9,11,0.95)',
            border: '1px solid rgba(5,168,69,0.25)',
            borderRadius: '16px',
            backdropFilter: 'blur(24px)',
            padding: '8px 12px',
            minWidth: '180px',
            pointerEvents: 'none',
            animation: `fadeUp 0.3s ease ${label.staggerMs}ms both`,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '8px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#2ad16a',
              marginBottom: '3px',
              lineHeight: 1.2,
            }}>
              {label.category}
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.3,
            }}>
              {label.value}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px',
              color: '#a1a1aa',
              lineHeight: 1.4,
              marginTop: '2px',
            }}>
              {label.detail}
            </div>
          </div>
        </Html>
      ))}
    </>
  )
}

// ─── JOB CARD (beat 2) ───────────────────────────────────────────────
function JobCard() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  if (beatIndex < 2 || beatIndex > 4) return null

  return (
    <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.3} position={[1.5, 3.5, 1]}>
      <Html distanceFactor={12} zIndexRange={[5, 15]} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(9,9,11,0.92)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '2px solid #E85D04',
          borderRadius: '20px',
          backdropFilter: 'blur(28px)',
          boxShadow: '0 4px 24px rgba(232,93,4,0.25), 0 24px 48px rgba(0,0,0,0.5)',
          padding: '16px 20px',
          width: '260px',
          animation: 'fadeUp 0.5s ease both',
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#2ad16a', marginBottom: '8px' }}>
            SCOPE · JOHNSON PROPERTY · 847 OAK ST
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: '8px' }} />
          {[
            ['Hedge trim (front + side)', '$120'],
            ['Aerate — back lawn', '$85'],
            ['Edge — driveway border', '$40'],
            ['Mulch beds (2 yards)', '$120'],
          ].map(([item, price]) => (
            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#d4d4d8', marginBottom: '4px' }}>
              <span>{item}</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{price}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '8px', paddingTop: '8px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            <span>TOTAL</span>
            <span style={{ color: '#05a845' }}>$365 + tax</span>
          </div>
          <div style={{ marginTop: '6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', letterSpacing: '0.15em', color: '#a1a1aa', textTransform: 'uppercase' }}>
            CREW: 2 members · 3.5 hrs · Thursday 9:00 AM
          </div>
        </div>
      </Html>
    </Float>
  )
}

// ─── INVOICE PANEL (beat 4) ───────────────────────────────────────────
function InvoicePanel() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  if (beatIndex < 4) return null

  return (
    <Html
      position={[3.5, 3.5, 2]}
      distanceFactor={11}
      zIndexRange={[8, 18]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{
        background: 'rgba(9,9,11,0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        backdropFilter: 'blur(28px)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        padding: '16px 20px',
        width: '220px',
        position: 'relative',
        animation: 'fadeUp 0.4s ease both',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#a1a1aa', marginBottom: '6px' }}>
          INVOICE #1042
        </div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
          $365.00
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#a1a1aa', marginBottom: '12px' }}>
          Johnson Property · Due on receipt
        </div>
        {/* PAID stamp */}
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '12px',
          transform: 'translateY(-50%) rotate(-8deg)',
          border: '3px solid #05a845',
          borderRadius: '6px',
          padding: '3px 7px',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '18px',
          fontWeight: 800,
          letterSpacing: '0.12em',
          color: '#05a845',
          textTransform: 'uppercase',
          animation: 'paidDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
          boxShadow: '0 0 16px rgba(5,168,69,0.4)',
        }}>
          PAID
        </div>
        {/* SMS confirmation */}
        <div style={{
          background: 'rgba(5,168,69,0.1)',
          border: '1px solid rgba(5,168,69,0.2)',
          borderRadius: '10px',
          padding: '6px 10px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '11px',
          color: '#2ad16a',
          animation: 'smsSlide 0.4s ease 1.0s both',
        }}>
          Payment received: $365.00 — YardWorx
        </div>
      </div>
    </Html>
  )
}

// ─── CREW PINS (beat 5, Html overlay) ───────────────────────────────
function CrewPins() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  if (beatIndex < 5) return null

  return (
    <>
      {[
        { pos: [-2, 1.2, 3] as [number,number,number], name: 'Marcus', status: 'En route' },
        { pos: [2, 1.2, 4] as [number,number,number], name: 'Dani', status: 'En route' },
      ].map(crew => (
        <Html key={crew.name} position={crew.pos} distanceFactor={12} zIndexRange={[5, 15]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(5,168,69,0.12)',
            border: '1px solid rgba(5,168,69,0.3)',
            borderRadius: '10px',
            padding: '5px 10px',
            animation: 'fadeUp 0.4s ease both',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', fontWeight: 700, color: '#2ad16a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {crew.name} · {crew.status}
            </span>
          </div>
        </Html>
      ))}
    </>
  )
}

// ─── INNER SCENE ─────────────────────────────────────────────────────
function SceneContent({ quality }: { quality: QualityConfig }) {
  const beatIndex    = useBeatStore(s => s.beatIndex)
  const scanProgress = useBeatStore(s => s.scanProgress)
  const beatT        = useBeatStore(s => s.beatT)

  const scanZ = beatIndex === 1 ? lerp(-10, 10, 1 - Math.pow(1 - beatT, 2.5)) : beatIndex >= 2 ? 12 : -12

  return (
    <>
      <CameraController />
      <SceneLighting />
      <Ground />
      <GreenWave />
      <Structures />
      <Hedges />
      <Trees />
      <GrassMesh count={quality.grassCount} scanZ={scanZ} scanProgress={scanProgress} />
      <ScanPlane />
      <CuttyReticle />
      <YardLabels />
      <JobCard />
      <InvoicePanel />
      <CrewPins />

      {quality.enablePostProcessing && (
        <EffectComposer>
          {quality.enableBloom && (
            <Bloom
              intensity={1.0}
              luminanceThreshold={0.65}
              luminanceSmoothing={0.3}
              radius={0.45}
            />
          )}
          <Vignette offset={0.45} darkness={0.65} />
        </EffectComposer>
      )}
    </>
  )
}

// ─── EXPORTED CANVAS ─────────────────────────────────────────────────
export default function YardSceneCanvas({ quality }: { quality: QualityConfig }) {
  return (
    <Canvas
      camera={{ position: [10, 8, 14], fov: 42, near: 0.1, far: 200 }}
      gl={{
        antialias: quality.tier !== 'MOBILE_LOW' && quality.tier !== 'MINIMAL',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
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
