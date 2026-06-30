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
import { FAQ } from '@/components/FAQ'
import { CanvasErrorBoundary } from '@/components/ErrorBoundary'
import ReducedScene from '@/components/ReducedScene'
import LazySection from '@/components/LazySection'

// Below-fold marketing sections — code-split so each ships its own chunk and
// mounts only as it nears the viewport (shrinks the initial JS bundle).
const Forge = lazy(() => import('@/sections/Forge'))
const LiveEar = lazy(() => import('@/sections/LiveEar'))
const Scheduler = lazy(() => import('@/sections/Scheduler'))
const Channels = lazy(() => import('@/sections/Channels'))
const Cockpit = lazy(() => import('@/sections/Cockpit'))
const Field = lazy(() => import('@/sections/Field'))
const Invoice = lazy(() => import('@/sections/Invoice'))
const Reviews = lazy(() => import('@/sections/Reviews'))
const Analytics = lazy(() => import('@/sections/Analytics'))
const Portal = lazy(() => import('@/sections/Portal'))
const Onboarding = lazy(() => import('@/sections/Onboarding'))
const Campaigns = lazy(() => import('@/sections/Campaigns'))

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
          {/* HeroText owns beat 0; only show beat annotations from beat 1 on
              to avoid stacking on top of the hero headline. */}
          {beatIndex >= 1 && <BeatAnnotation />}
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
        {/* Product tour — scan → listen → route → comms → dashboard → field →
            get-paid → reviews → analytics → client portal → onboarding → campaigns.
            Every block is code-split + viewport-lazy via <LazySection> with a
            reserved minHeight to avoid layout shift. */}
        <div id="features" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Forge />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <LiveEar />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Scheduler />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Channels />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Cockpit />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Field />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Invoice />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Reviews />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Analytics />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Portal />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Onboarding />
          </LazySection>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <LazySection minHeight={1200}>
            <Campaigns />
          </LazySection>
        </div>

        {/* Stats + testimonials */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0 24px' }}>
          <SocialProof />
        </div>

        {/* FAQ — answers the last objections before the price reveal.
            Wrapped in #faq so the nav anchor resolves. */}
        <div id="faq" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <FAQ />
        </div>

        {/* Pricing — price reveal, the closer. The #start wrapper is the
            funnel landing target for every "Start free" CTA across the page. */}
        <div id="start" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div id="pricing">
            <Pricing />
          </div>
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
            <a href="#" style={{ color: '#8b8b94', textDecoration: 'none' }}>Privacy</a>
            <span style={{ margin: '0 12px', opacity: 0.3 }}>·</span>
            <a href="#" style={{ color: '#8b8b94', textDecoration: 'none' }}>Terms</a>
          </div>
          <div>© 2026 YardWorx. Built for landscapers.</div>
        </footer>
      </div>
    </div>
  )
}

export default App
