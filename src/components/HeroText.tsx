import { motion, AnimatePresence } from 'motion/react'
import { useBeatStore } from '@/stores/beatStore'

export function HeroText() {
  const beatIndex = useBeatStore((s) => s.beatIndex)
  const visible = beatIndex < 1

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="hero-text"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 40,
            width: '100%',
            padding: '0 24px',
            boxSizing: 'border-box',
          }}
        >
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 28,
              delay: 0.1,
            }}
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(42px, 8vw, 72px)',
              color: '#ffffff',
              lineHeight: 1.1,
              margin: '0 0 24px 0',
            }}
          >
            This is your Tuesday.
          </motion.h1>

          {/* Subhead — fades in 600ms after headline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 320,
              damping: 28,
              delay: 0.7,
            }}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              color: '#d4d4d8',
              maxWidth: '540px',
              margin: '0 auto 40px',
              lineHeight: 1.6,
            }}
          >
            YardWorx sees every yard. Schedules every job. Collects every dollar.
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
