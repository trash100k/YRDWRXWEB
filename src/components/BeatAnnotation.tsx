import { motion, AnimatePresence } from 'motion/react'
import { useBeatStore } from '@/stores/beatStore'
import { BEATS } from '@/data/beats'

export function BeatAnnotation() {
  const beatIndex = useBeatStore((s) => s.beatIndex)
  const beat = BEATS[beatIndex]

  if (!beat) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={beatIndex}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        style={{
          position: 'fixed',
          zIndex: 50,
          // Desktop: right side, vertically centered
          right: '32px',
          top: '45%',
          transform: 'translateY(-50%)',
          maxWidth: '260px',
          // Alignment (desktop right / mobile center) lives in the
          // `.beat-annotation` class in index.css so the mobile media query
          // can override it — an inline textAlign would always win.
        }}
        className="beat-annotation"
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: '22px',
            color: '#ffffff',
            lineHeight: 1.2,
            marginBottom: '6px',
          }}
        >
          {beat.annotation}
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: '14px',
            color: '#a1a1aa',
            lineHeight: 1.5,
          }}
        >
          {beat.subAnnotation}
        </p>
      </motion.div>
    </AnimatePresence>
  )
}
