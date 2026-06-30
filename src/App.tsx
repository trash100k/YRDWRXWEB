import { lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useBeatStore } from '@/stores/beatStore'
import { useScrollBeat, useReducedMotion } from '@/hooks/useScrollBeat'
import { useGPUTier } from '@/hooks/useGPUTier'
import { Nav } from '@/components/Nav'
import { HeroText } from '@/components/HeroText'
import { BeatAnnotation } from '@/components/BeatAnnotation'
import { Minimap } from '@/components/Minimap'
import { CTACard } from '@/components/CTACard'
import { ScrollHint } from '@/components/ScrollHint'
import { SocialProof } from '@/components/SocialProof'
import { Pricing } from '@/components/Pricing'
import { CanvasErrorBoundary } from '@/components/ErrorBoundary'
import ReducedScene from '@/components/ReducedScene'

const YardSceneCanvas = lazy(() => import('@/scenes/YardScene'))

function App() {
  const reducedMotion = useReducedMotion()
  const quality = useGPUTier()
  const beatIndex = useBeatStore(s => s.beatIndex)

  useScrollBeat()

  if (reducedMotion || quality.useStaticFallback) {
    return <ReducedScene />
  }

  return (
    <div style={{ background: '#0B0C10', minHeight: '100vh' }}>
      {/* Fixed nav — always on top */}
      <Nav beatIndex={beatIndex} />

      {/* Sticky 3D canvas — stays fixed while scroll drives beats */}
      <div style={{
        position: 'sticky',
        top: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 10,
        overflow: 'hidden',
      }}>
        {/* Atmosphere gradient behind canvas */}
        <div className="atmosphere" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

        {/* 3D canvas — wrapped in error boundary for WebGL failure fallback */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <CanvasErrorBoundary>
            <Suspense fallback={
              <div style={{
                width: '100%', height: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', background: '#0B0C10',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
                  letterSpacing: '0.2em', color: '#2ad16a', textTransform: 'uppercase', opacity: 0.7,
                }}>
                  Initializing Cutty...
                </div>
              </div>
            }>
              <YardSceneCanvas quality={quality} />
            </Suspense>
          </CanvasErrorBoundary>
        </div>

        {/* Hero text overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
          <HeroText />
          <ScrollHint />
          <BeatAnnotation />
        </div>

        {/* Minimap (beat 3+) */}
        <Minimap />

        {/* CTA card (beat 5) */}
        <AnimatePresence>
          {beatIndex >= 5 && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.4 }}
              style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                zIndex: 30, pointerEvents: 'none',
              }}
            >
              <CTACard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scroll space — drives the beat progression */}
      <div style={{ height: '5200px', position: 'relative', zIndex: 1, pointerEvents: 'none' }} />

      {/* Below-fold sections */}
      <div style={{ position: 'relative', zIndex: 20, background: '#09090b' }}>
        {/* Stats + testimonials */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0 24px' }}>
          <SocialProof />
        </div>

        {/* Pricing */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Pricing />
        </div>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '32px 24px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          fontSize: '13px',
          color: '#52525b',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: '#71717a', letterSpacing: '0.05em' }}>
              YARDWORX
            </span>
            <span style={{ margin: '0 16px', opacity: 0.3 }}>·</span>
            <a href="/privacy" style={{ color: '#52525b', textDecoration: 'none' }}>Privacy</a>
            <span style={{ margin: '0 12px', opacity: 0.3 }}>·</span>
            <a href="/terms" style={{ color: '#52525b', textDecoration: 'none' }}>Terms</a>
          </div>
          <div>© 2026 YardWorx. Built for landscapers.</div>
        </footer>
      </div>
    </div>
  )
}

export default App
