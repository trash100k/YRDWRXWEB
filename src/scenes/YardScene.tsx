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

function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.min(1, Math.max(0, t)) }

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
    },
    side:       THREE.BackSide,
    depthWrite: false,
  }), [])

  useFrame((_, delta) => {
    const progress  = beatIndex + beatT
    const afterT    = Math.min(1, Math.max(0, (progress - 1.0) / 1.5))
    const scanGlow  = beatIndex === 1 ? beatT * 0.88 : 0

    material.uniforms.uAfter.value    = lerp(material.uniforms.uAfter.value, afterT, delta * 1.0)
    material.uniforms.uScanGlow.value = lerp(material.uniforms.uScanGlow.value, scanGlow, delta * 3.5)

    // Night: deep navy → Dawn: keep dark but shift warmer (additive bands do the color drama)
    material.uniforms.uSkyTop.value.lerpColors(
      new THREE.Color(0x020510), new THREE.Color(0x0c0820), afterT
    )
    material.uniforms.uSkyBot.value.lerpColors(
      new THREE.Color(0x050c1a), new THREE.Color(0x0d0e1c), afterT
    )
    material.uniforms.uHorizon.value.lerpColors(
      new THREE.Color(0x0a1428), new THREE.Color(0x160a04), afterT
    )
  })

  return (
    <mesh renderOrder={-10}>
      <sphereGeometry args={[120, 18, 10]} />
      <primitive object={material} />
    </mesh>
  )
}

// ─── CAMERA CONTROLLER ───────────────────────────────────────────────
function CameraController() {
  const { camera } = useThree()
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  const targets: [number, number, number][] = [
    [0,    1.2, 0],
    [-1.5, 1.8, -1.5],
    [0,    1.6, 1.2],
    [-3,   1.0, 0],
    [1,    1.4, 2.5],
    [0,    1.0, 0],
  ]

  const lookRef = useRef(new THREE.Vector3(0, 1.2, 0))
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta
    const t = timeRef.current

    const beat = Math.min(beatIndex, 5)
    const [tx, ty, tz] = targets[beat]
    lookRef.current.lerp(new THREE.Vector3(tx, ty, tz), delta * 2.0)

    // Orbit radius: pull in dramatically during scan, then wider reveal
    const baseR = beatIndex === 1 ? lerp(12, 7.5, beatT)
                : beatIndex >= 2  ? 11.0
                : 12.0
    const orbitR = baseR + Math.sin(t * 0.14) * 0.8
    const orbitA = t * 0.04

    // Camera height: lower during scan for tension, open up after
    const targetY = beatIndex === 1 ? lerp(8, 5.5, beatT) : 8 + Math.sin(t * 0.28) * 0.25

    camera.position.x = lerp(camera.position.x, orbitR * Math.sin(orbitA) + Math.sin(t * 0.18) * 0.4, delta * 0.6)
    camera.position.y = lerp(camera.position.y, targetY, delta * 0.6)
    camera.position.z = lerp(camera.position.z, orbitR * Math.cos(orbitA) + Math.cos(t * 0.12) * 0.3, delta * 0.6)
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
  const hemiRef    = useRef<THREE.HemisphereLight>(null)
  const sunRef     = useRef<THREE.DirectionalLight>(null)
  const forestRef  = useRef<THREE.PointLight>(null)

  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  useFrame((_, delta) => {
    if (!keyRef.current || !fillRef.current || !ambientRef.current || !hemiRef.current || !sunRef.current || !forestRef.current) return

    const progress  = beatIndex + beatT
    const scanActive = progress > 0.8 && progress < 2.2
    const afterScan  = progress >= 1.5
    const afterT     = afterScan ? Math.min(1, (progress - 1.5) / 1.8) : 0

    // Green fill bounce
    const targetFill = afterScan ? 3.2 : scanActive ? lerp(0, 3.2, (progress - 0.8) / 0.7) : 0
    fillRef.current.intensity = lerp(fillRef.current.intensity, targetFill, delta * 2.5)

    // Secondary forest point — deep in scene
    forestRef.current.intensity = lerp(forestRef.current.intensity, afterScan ? 1.4 : 0, delta * 1.8)

    // Key light intensity + warm shift
    keyRef.current.intensity = lerp(keyRef.current.intensity, afterScan ? 2.4 : 1.6, delta * 1.5)
    keyRef.current.color.lerp(afterScan ? new THREE.Color(0xffd080) : new THREE.Color(0xb0c8e0), delta * 1.4)

    // Hemisphere: night → dim afternoon
    hemiRef.current.color.lerpColors(new THREE.Color(0x080f20), new THREE.Color(0x5a8ab0), afterT)
    hemiRef.current.groundColor.lerpColors(new THREE.Color(0x0c0f08), new THREE.Color(0x2a5a0a), afterT)
    hemiRef.current.intensity = lerp(0.35, 1.3, afterT)

    // Warm sun DirectionalLight ramps in post-scan
    sunRef.current.intensity = lerp(sunRef.current.intensity, afterScan ? 1.8 : 0, delta * 1.8)
  })

  return (
    <>
      <ambientLight ref={ambientRef} color={0x18202e} intensity={0.55} />
      <hemisphereLight ref={hemiRef} args={[0x080f20, 0x0c0f08, 0.35]} position={[0, 20, 0]} />
      <directionalLight
        ref={keyRef}
        color={0xb0c8e0}
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
      <directionalLight ref={rimRef} color={0x1a3050} intensity={0.65} position={[5, 6, -10]} />
      <directionalLight ref={sunRef} color={0xffb060} intensity={0} position={[12, 10, 8]} />
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
  const beatIndex  = useBeatStore(s => s.beatIndex)
  const beatT      = useBeatStore(s => s.beatT)
  const shaderUnis = useRef<{ uGroundPulse: { value: number }; uGroundTime: { value: number } } | null>(null)

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
      emissiveIntensity: 0,
      normalMap: normalTex,
    })
    mat.normalScale.set(0.35, 0.35)

    // Inject post-scan ground ripple via onBeforeCompile
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uGroundPulse = { value: 0 }
      shader.uniforms.uGroundTime  = { value: 0 }
      shaderUnis.current = shader.uniforms as typeof shaderUnis.current

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        uniform float uGroundPulse;
        uniform float uGroundTime;`
      )
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float _r   = length(transformed.xz);
        float _rip = (sin(_r * 1.35 - uGroundTime * 2.1) * 0.5 + 0.5)
                     * uGroundPulse * 0.045
                     * max(0.0, 1.0 - _r / 11.0);
        transformed.y += _rip;`
      )
    }

    return mat
  }, [])

  useFrame((_, delta) => {
    const afterAmount = beatIndex === 1 ? beatT : beatIndex >= 2 ? 1 : 0
    const isAfter     = afterAmount > 0.5
    groundMat.color.lerp(isAfter ? C.AFTER_GRASS : C.BEFORE_GRASS, delta * 1.8)
    groundMat.roughness = lerp(groundMat.roughness, isAfter ? 0.78 : 0.95, delta)
    groundMat.emissiveIntensity = lerp(groundMat.emissiveIntensity, isAfter ? 0.06 : 0, delta * 1.5)

    if (shaderUnis.current) {
      shaderUnis.current.uGroundTime.value  += delta
      shaderUnis.current.uGroundPulse.value  = lerp(
        shaderUnis.current.uGroundPulse.value, isAfter ? 0.65 : 0, delta * 1.5
      )
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={groundMat}>
      <planeGeometry args={[22, 18, 40, 40]} />
    </mesh>
  )
}

// ─── GREENING WAVE ───────────────────────────────────────────────────
function GreenWave() {
  const sections  = useRef<THREE.Mesh[]>([])
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)
  const sectionXs = [-7, -3.5, 0, 3.5, 7]

  function ss(lo: number, hi: number, t: number) {
    const x = Math.max(0, Math.min(1, (t - lo) / (hi - lo)))
    return x * x * (3 - 2 * x)
  }

  useFrame(() => {
    const scanZ = beatIndex === 1 ? lerp(-10, 10, 1 - Math.pow(1 - beatT, 2.5)) : beatIndex >= 2 ? 12 : -12
    sections.current.forEach((mesh, i) => {
      if (!mesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      const p = ss(sectionXs[i] - 4, sectionXs[i] + 2, scanZ)
      mat.color.lerpColors(C.BEFORE_GRASS, C.AFTER_GRASS, p)
      mat.emissiveIntensity = p * 0.38
    })
  })

  return (
    <>
      {sectionXs.map((x, i) => (
        <mesh key={i} ref={el => { if (el) sections.current[i] = el }}
          rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.018, 1]} receiveShadow>
          <planeGeometry args={[3.5, 10]} />
          <meshStandardMaterial color={C.BEFORE_GRASS} roughness={0.82} emissive={C.AFTER_GRASS} emissiveIntensity={0} />
        </mesh>
      ))}
    </>
  )
}

// ─── HEDGES ──────────────────────────────────────────────────────────
function Hedges() {
  const groupRef  = useRef<THREE.Group>(null)
  const matsRef   = useRef<THREE.MeshStandardMaterial[]>([])
  const beatIndex = useBeatStore(s => s.beatIndex)
  const growYRef  = useRef(0.15)

  useFrame((_, delta) => {
    const afterScan = beatIndex >= 1
    matsRef.current.forEach(mat => {
      mat.color.lerp(afterScan ? C.HEDGE_AFTER : C.HEDGE, delta * 1.2)
      mat.emissiveIntensity = lerp(mat.emissiveIntensity, afterScan ? 0.09 : 0, delta * 1.5)
    })

    // Hedges grow up from ground when scan activates
    growYRef.current = lerp(growYRef.current, afterScan ? 1.0 : 0.15, delta * (afterScan ? 3.5 : 2.0))
    if (groupRef.current) {
      groupRef.current.scale.y = growYRef.current
    }
  })

  const hedgeMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color: C.HEDGE, roughness: 0.88, emissive: C.HEDGE_AFTER, emissiveIntensity: 0 })
    matsRef.current.push(m)
    return m
  }, [])

  return (
    <group ref={groupRef}>
      <group position={[-4, 0, -5]}>
        <mesh castShadow receiveShadow material={hedgeMat}><boxGeometry args={[7, 1.8, 1.2]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[2.2, 0.7, 0.2]}><sphereGeometry args={[0.7, 8, 6]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[-1.5, 0.6, -0.2]}><sphereGeometry args={[0.55, 7, 5]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[0, 0.8, 0.3]}><sphereGeometry args={[0.45, 6, 5]} /></mesh>
      </group>
      <group position={[-7.5, 0, -1]}>
        <mesh castShadow receiveShadow material={hedgeMat}><boxGeometry args={[1.0, 2.2, 6]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[0.3, 0.9, -1.8]}><sphereGeometry args={[0.6, 7, 5]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[-0.2, 0.7, 1.2]}><sphereGeometry args={[0.5, 6, 5]} /></mesh>
      </group>
      <group position={[2, 0, -5.5]}>
        <mesh castShadow receiveShadow material={hedgeMat}><boxGeometry args={[4, 1.4, 0.9]} /></mesh>
        <mesh castShadow material={hedgeMat} position={[1.5, 0.5, 0.1]}><sphereGeometry args={[0.5, 7, 5]} /></mesh>
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
  const beatT     = useBeatStore(s => s.beatT)

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
    const scanZ  = beatIndex === 1 ? lerp(-10, 10, 1 - Math.pow(1 - beatT, 2.5))
                 : beatIndex >= 2  ? 12 : -20

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

// ─── GROUND ENERGY RINGS (post-scan) ─────────────────────────────────
function EnergyRings() {
  const matRef    = useRef<THREE.ShaderMaterial>(null)
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
    const target = beatIndex >= 1 ? 0.55 : 0
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, target, delta * 1.8)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <planeGeometry args={[26, 20]} />
      <primitive object={material} />
    </mesh>
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

  const reticleTargets: [number, number, number][] = [
    [0, 1.5, 0],
    [-3.5, 2.0, -4.5],
    [0, 2.2, 1],
    [-3, 1.5, 0],
    [1, 1.5, 2],
    [0, 2.5, 0],
  ]

  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x05a845, transparent: true, opacity: 0, side: THREE.DoubleSide,
  }), [])

  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x05a845, transparent: true, opacity: 0, side: THREE.DoubleSide,
  }), [])

  useFrame((state, delta) => {
    if (!groupRef.current || !ringRef.current) return
    const t = state.clock.getElapsedTime()

    const shouldShow   = beatIndex >= 1 && beatIndex <= 4
    const targetOpacity = shouldShow ? 0.9 : 0
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, delta * 4)
    mat.opacity     = opacityRef.current
    glowMat.opacity = opacityRef.current * 0.22

    const beat = Math.min(beatIndex, 5)
    const [tx, ty, tz] = reticleTargets[beat]
    groupRef.current.position.lerp(new THREE.Vector3(tx, ty, tz), delta * 3.5)

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
const SUN_POS = new THREE.Vector3(12, 10, 8)

function LensFlare() {
  const meshRef   = useRef<THREE.Mesh>(null)
  const matRef    = useRef<THREE.ShaderMaterial>(null)
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

// ─── JOB CARD ────────────────────────────────────────────────────────
function JobCard() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  if (beatIndex < 2 || beatIndex > 4) return null

  return (
    <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.3} position={[1.5, 3.5, 1]}>
      <Html distanceFactor={12} zIndexRange={[5, 15]} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(9,9,11,0.92)', border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '2px solid #E85D04', borderRadius: '20px', backdropFilter: 'blur(28px)',
          boxShadow: '0 4px 24px rgba(232,93,4,0.25), 0 24px 48px rgba(0,0,0,0.5)',
          padding: '16px 20px', width: '260px', animation: 'fadeUp 0.5s ease both',
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
      </Html>
    </Float>
  )
}

// ─── INVOICE PANEL ───────────────────────────────────────────────────
function InvoicePanel() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  if (beatIndex < 4) return null

  return (
    <Html position={[3.5, 3.5, 2]} distanceFactor={11} zIndexRange={[8, 18]} style={{ pointerEvents: 'none' }}>
      <div style={{
        background: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px', backdropFilter: 'blur(28px)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6)', padding: '16px 20px', width: '220px',
        position: 'relative', animation: 'fadeUp 0.4s ease both',
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
    </Html>
  )
}

// ─── CREW PINS ───────────────────────────────────────────────────────
function CrewPins() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  if (beatIndex < 5) return null

  return (
    <>
      {[
        { pos: [-2, 1.2, 3] as [number,number,number], name: 'Marcus', status: 'En route' },
        { pos: [2, 1.2, 4]  as [number,number,number], name: 'Dani',   status: 'En route' },
      ].map(crew => (
        <Html key={crew.name} position={crew.pos} distanceFactor={12} zIndexRange={[5, 15]} style={{ pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(5,168,69,0.12)', border: '1px solid rgba(5,168,69,0.3)',
            borderRadius: '10px', padding: '5px 10px', animation: 'fadeUp 0.4s ease both', whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '9px', fontWeight: 700,
              color: '#2ad16a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {crew.name} · {crew.status}
            </span>
          </div>
        </Html>
      ))}
    </>
  )
}

// ─── MORNING MIST — ground-level fog that clears as scan passes ──────
function MorningMist() {
  const beatIndex = useBeatStore(s => s.beatIndex)
  const beatT     = useBeatStore(s => s.beatT)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   MIST_VERTEX_SHADER,
    fragmentShader: MIST_FRAGMENT_SHADER,
    uniforms: {
      uTime:    { value: 0 },
      uScanZ:   { value: -20 },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  }), [])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    const sz = beatIndex === 1
      ? lerp(-10, 10, 1 - Math.pow(1 - beatT, 2.5))
      : beatIndex >= 2 ? 12 : -20
    material.uniforms.uScanZ.value = sz
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
  const beatT     = useBeatStore(s => s.beatT)
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
        uScanZ:   { value: -20 },
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
    const sz = beatIndex === 1
      ? lerp(-10, 10, 1 - Math.pow(1 - beatT, 2.5))
      : beatIndex >= 2 ? 12 : -20
    material.uniforms.uScanZ.value = sz
    const target = beatIndex === 1 ? 0.90 : 0
    material.uniforms.uOpacity.value = lerp(material.uniforms.uOpacity.value, target, delta * 3.5)
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}

// ─── INNER SCENE ─────────────────────────────────────────────────────
function SceneContent({ quality }: { quality: QualityConfig }) {
  const beatIndex    = useBeatStore(s => s.beatIndex)
  const scanProgress = useBeatStore(s => s.scanProgress)
  const beatT        = useBeatStore(s => s.beatT)

  const scanZ = beatIndex === 1 ? lerp(-10, 10, 1 - Math.pow(1 - beatT, 2.5)) : beatIndex >= 2 ? 12 : -12

  const particleCount = quality.tier === 'HIGH' ? 280 : quality.tier === 'MEDIUM' ? 140 : 60

  return (
    <>
      <fog attach="fog" args={[0x06090f, 35, 85]} />
      <SkyDome />
      <CameraController />
      <SceneLighting />
      <Ground />
      <MorningMist />
      <GreenWave />
      <Structures />
      <BarePatches />
      <Hedges />
      <Trees />
      <GrassMesh count={quality.grassCount} scanZ={scanZ} scanProgress={scanProgress} />
      <GroundAura />
      <ScanPlane />
      <ScanCurtain />
      <ScanWake />
      <EnergyRings />
      {quality.tier !== 'MINIMAL' && <FloatingParticles count={particleCount} />}
      <CuttyReticle />
      <LensFlare />
      <GodRayShafts />
      <YardLabels />
      <JobCard />
      <InvoicePanel />
      <CrewPins />

      {quality.enablePostProcessing && (
        <EffectComposer>
          {quality.tier === 'HIGH' && (
            <DepthOfField focusDistance={0.008} focalLength={0.022} bokehScale={2.2} />
          )}
          {quality.enableBloom && (
            <Bloom intensity={1.6} luminanceThreshold={0.50} luminanceSmoothing={0.45} radius={0.65} />
          )}
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0006, 0.0006] as unknown as THREE.Vector2}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette offset={0.42} darkness={0.72} />
          <Noise opacity={0.038} />
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
        toneMappingExposure: 1.40,
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
