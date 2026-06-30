import { useEffect, useState } from 'react'

export type QualityTier = 'HIGH' | 'MEDIUM' | 'MOBILE_HIGH' | 'MOBILE_LOW' | 'MINIMAL'

export interface QualityConfig {
  tier: QualityTier
  grassCount: number
  shadowMapSize: number
  dpr: [number, number]
  enablePostProcessing: boolean
  enableSSAO: boolean
  enableBloom: boolean
  useSimplifiedScene: boolean
  useStaticFallback: boolean
}

const CONFIGS: Record<QualityTier, QualityConfig> = {
  HIGH: {
    tier: 'HIGH',
    grassCount: 40000,
    shadowMapSize: 2048,
    dpr: [1, 2],
    enablePostProcessing: true,
    enableSSAO: true,
    enableBloom: true,
    useSimplifiedScene: false,
    useStaticFallback: false,
  },
  MEDIUM: {
    tier: 'MEDIUM',
    grassCount: 15000,
    shadowMapSize: 1024,
    dpr: [1, 1.5],
    enablePostProcessing: true,
    enableSSAO: false,
    enableBloom: true,
    useSimplifiedScene: false,
    useStaticFallback: false,
  },
  MOBILE_HIGH: {
    tier: 'MOBILE_HIGH',
    grassCount: 5000,
    shadowMapSize: 512,
    dpr: [1, 1],
    enablePostProcessing: false,
    enableSSAO: false,
    enableBloom: false,
    useSimplifiedScene: true,
    useStaticFallback: false,
  },
  MOBILE_LOW: {
    tier: 'MOBILE_LOW',
    grassCount: 1500,
    shadowMapSize: 0,
    dpr: [0.75, 0.75],
    enablePostProcessing: false,
    enableSSAO: false,
    enableBloom: false,
    useSimplifiedScene: true,
    useStaticFallback: false,
  },
  MINIMAL: {
    tier: 'MINIMAL',
    grassCount: 0,
    shadowMapSize: 0,
    dpr: [0.5, 0.5],
    enablePostProcessing: false,
    enableSSAO: false,
    enableBloom: false,
    useSimplifiedScene: true,
    useStaticFallback: true,
  },
}

export function useGPUTier(): QualityConfig {
  const [config, setConfig] = useState<QualityConfig>(CONFIGS.HIGH)

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    const isLowCores = navigator.hardwareConcurrency < 4

    let canvas: HTMLCanvasElement | null = null
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
    let renderer = ''
    let webglVersion = 0

    try {
      canvas = document.createElement('canvas')
      gl = canvas.getContext('webgl2') as WebGL2RenderingContext
      if (gl) {
        webglVersion = 2
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''
        }
      } else {
        gl = canvas.getContext('webgl')
        if (gl) webglVersion = 1
      }
    } catch (_) {}

    if (webglVersion === 0) {
      setConfig(CONFIGS.MINIMAL)
      return
    }

    const isLowEndGPU = /mali-4|mali-3|adreno 3[0-5]|powervr sgx/i.test(renderer)
    const isHighEndGPU = /rtx|radeon rx [6-9]|m[12] chip|apple gpu/i.test(renderer)
    const isSoftwareRenderer = /swiftshader|llvmpipe|software/i.test(renderer)

    if (isSoftwareRenderer) {
      setConfig(CONFIGS.MOBILE_HIGH)
    } else if (!isMobile && isHighEndGPU) {
      setConfig(CONFIGS.HIGH)
    } else if (!isMobile) {
      setConfig(CONFIGS.MEDIUM)
    } else if (isMobile && !isLowCores && !isLowEndGPU) {
      setConfig(CONFIGS.MOBILE_HIGH)
    } else if (isMobile && isLowEndGPU) {
      setConfig(CONFIGS.MOBILE_LOW)
    } else {
      setConfig(CONFIGS.MOBILE_LOW)
    }
  }, [])

  return config
}
