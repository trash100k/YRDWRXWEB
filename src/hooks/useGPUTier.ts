import { useEffect, useState } from 'react'
import { getGPUTier } from 'detect-gpu'

export type QualityTier = 'HIGH' | 'MEDIUM' | 'MOBILE_HIGH' | 'MOBILE_LOW' | 'MINIMAL'

export interface QualityConfig {
  tier: QualityTier
  grassCount: number
  /** Vertical blade subdivisions per grass blade (vertex cost lever). */
  bladeSegments: number
  /** Camera-distance beyond which grass blades fade/cull (world units). */
  grassMaxDist: number
  shadowMapSize: number
  /** Number of directional lights that may render a shadow map per frame (S1). */
  activeShadowCasters: number
  dpr: [number, number]
  enablePostProcessing: boolean
  /** HIGH-only N8AO gate (do not rename — consumed by the post FX composer). */
  enableSSAO: boolean
  enableBloom: boolean
  /** Drops heavy decorative layers on mobile tiers (consumed by YardScene). */
  useSimplifiedScene: boolean
  useStaticFallback: boolean
}

const CONFIGS: Record<QualityTier, QualityConfig> = {
  HIGH: {
    tier: 'HIGH',
    grassCount: 28000,
    bladeSegments: 4,
    grassMaxDist: 60,
    shadowMapSize: 2048,
    activeShadowCasters: 1,
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
    bladeSegments: 3,
    grassMaxDist: 45,
    shadowMapSize: 1024,
    activeShadowCasters: 1,
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
    bladeSegments: 2,
    grassMaxDist: 30,
    shadowMapSize: 512,
    activeShadowCasters: 1,
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
    bladeSegments: 2,
    grassMaxDist: 24,
    shadowMapSize: 0,
    activeShadowCasters: 0,
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
    bladeSegments: 2,
    grassMaxDist: 24,
    shadowMapSize: 0,
    activeShadowCasters: 0,
    dpr: [0.5, 0.5],
    enablePostProcessing: false,
    enableSSAO: false,
    enableBloom: false,
    useSimplifiedScene: true,
    useStaticFallback: true,
  },
}

/**
 * Legacy hand-rolled classification via WEBGL_debug_renderer_info regex.
 * Retained as the fallback path when detect-gpu is unavailable or inconclusive.
 */
function classifyByRegex(): QualityTier {
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
        renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string) || ''
      }
    } else {
      gl = canvas.getContext('webgl')
      if (gl) webglVersion = 1
    }
  } catch (_) {}

  if (webglVersion === 0) {
    return 'MINIMAL'
  }

  const isLowEndGPU = /mali-4|mali-3|adreno 3[0-5]|powervr sgx/i.test(renderer)
  const isHighEndGPU = /rtx|radeon rx [6-9]|m[12] chip|apple gpu/i.test(renderer)
  const isSoftwareRenderer = /swiftshader|llvmpipe|software/i.test(renderer)

  if (isSoftwareRenderer) {
    return 'MOBILE_HIGH'
  } else if (!isMobile && isHighEndGPU) {
    return 'HIGH'
  } else if (!isMobile) {
    return 'MEDIUM'
  } else if (isMobile && !isLowCores && !isLowEndGPU) {
    return 'MOBILE_HIGH'
  } else if (isMobile && isLowEndGPU) {
    return 'MOBILE_LOW'
  } else {
    return 'MOBILE_LOW'
  }
}

/**
 * Map a detect-gpu TierResult onto our QualityTier ladder. Falls back to the
 * regex classifier for the SSR/unsupported/blocklisted cases or whenever the
 * benchmark result is inconclusive (tier 0).
 */
function classifyByDetectGpu(tier: number, type: string, isMobile: boolean): QualityTier {
  if (type === 'WEBGL_UNSUPPORTED') return 'MINIMAL'
  if (type === 'SSR' || type === 'BLOCKLISTED' || tier <= 0) {
    // Inconclusive / no real GPU signal — defer to the legacy heuristic.
    return classifyByRegex()
  }
  if (isMobile) {
    // detect-gpu tiers: 1 = low, 2 = mid, 3 = high.
    return tier >= 2 ? 'MOBILE_HIGH' : 'MOBILE_LOW'
  }
  if (tier >= 3) return 'HIGH'
  if (tier >= 2) return 'MEDIUM'
  return 'MOBILE_HIGH'
}

export function useGPUTier(): QualityConfig {
  const [config, setConfig] = useState<QualityConfig>(CONFIGS.HIGH)

  useEffect(() => {
    let cancelled = false

    const evaluate = () => {
      getGPUTier()
        .then((result) => {
          if (cancelled) return
          const quality = classifyByDetectGpu(
            result.tier,
            result.type,
            result.isMobile ?? window.innerWidth < 768,
          )
          setConfig(CONFIGS[quality])
        })
        .catch(() => {
          if (cancelled) return
          // detect-gpu failed entirely — use the legacy regex heuristic.
          setConfig(CONFIGS[classifyByRegex()])
        })
    }

    evaluate()

    // Re-evaluate on resize/orientation change so a device that crosses the
    // mobile width threshold (or rotates) is re-tiered. Debounced to avoid
    // re-running the benchmark on every resize event.
    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    const onResize = () => {
      if (resizeTimer !== undefined) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(evaluate, 400)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      if (resizeTimer !== undefined) clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return config
}
