import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GRASS_VERTEX_SHADER, GRASS_FRAGMENT_SHADER } from './shaders'

interface GrassMeshProps {
  count: number
  scanZ: number
  scanProgress: number
}

function buildBladeGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const segments = 4
  const vertices: number[] = []
  const uvs: number[] = []
  const bladeTips: number[] = []

  for (let s = 0; s <= segments; s++) {
    const t = s / segments
    const width = 0.04 * (1.0 - t * 0.85)
    const height = t * 0.55
    const curve = t * t * 0.12
    vertices.push(-width, height, curve, width, height, curve)
    uvs.push(0, t, 1, t)
    bladeTips.push(t, t)
  }

  const indices: number[] = []
  for (let s = 0; s < segments; s++) {
    const a = s * 2, b = s * 2 + 1, c = s * 2 + 2, d = s * 2 + 3
    indices.push(a, b, c, b, d, c)
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setAttribute('aBladeTip', new THREE.Float32BufferAttribute(bladeTips, 1))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export default function GrassMesh({ count, scanZ, scanProgress }: GrassMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const { geometry, material } = useMemo(() => {
    const geometry = buildBladeGeometry()

    const offsets = new Float32Array(count * 3)
    const phases  = new Float32Array(count)
    const scales  = new Float32Array(count)

    const drivewayXMin = -5.0, drivewayXMax = -0.5
    const drivewayZMin = -2.5, drivewayZMax = 4.5

    let placed = 0, attempts = 0
    while (placed < count && attempts < count * 4) {
      attempts++
      const x = (Math.random() - 0.5) * 18
      const z = (Math.random() - 0.5) * 14 + 1
      if (x > drivewayXMin && x < drivewayXMax && z > drivewayZMin && z < drivewayZMax) continue
      offsets[placed * 3 + 0] = x
      offsets[placed * 3 + 1] = 0
      offsets[placed * 3 + 2] = z
      phases[placed] = Math.random() * Math.PI * 2
      scales[placed] = 0.7 + Math.random() * 0.6
      placed++
    }

    geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3))
    geometry.setAttribute('aPhase',  new THREE.InstancedBufferAttribute(phases, 1))
    geometry.setAttribute('aScale',  new THREE.InstancedBufferAttribute(scales, 1))

    const material = new THREE.ShaderMaterial({
      vertexShader: GRASS_VERTEX_SHADER,
      fragmentShader: GRASS_FRAGMENT_SHADER,
      uniforms: {
        uTime:          { value: 0 },
        uWindStrength:  { value: 0.6 },
        uScanZ:         { value: -20 },
        uScanProgress:  { value: 0 },
      },
      side: THREE.DoubleSide,
    })

    return { geometry, material }
  }, [count])

  useFrame((_, delta) => {
    if (!material.uniforms) return
    material.uniforms.uTime.value += delta
    material.uniforms.uScanZ.value = scanZ
    material.uniforms.uScanProgress.value = scanProgress
  })

  if (count < 1) return null

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />
  )
}
