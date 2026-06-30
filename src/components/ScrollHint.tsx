import { motion, AnimatePresence } from 'motion/react'
import { useBeatStore } from '@/stores/beatStore'

export function ScrollHint() {
  const beatIndex = useBeatStore((s) => s.beatIndex)
  const visible = beatIndex === 0

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 1.2 }}
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {/* Double chevron SVG with bounceDown CSS animation */}
          <svg
            width="24"
            height="32"
            viewBox="0 0 24 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="scroll-hint-chevrons"
            style={{ animation: 'bounceDown 1.5s ease-in-out infinite' }}
          >
            {/* First chevron */}
            <path
              d="M6 4 L12 10 L18 4"
              stroke="#05A845"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Second chevron */}
            <path
              d="M6 13 L12 19 L18 13"
              stroke="#05A845"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
