import { motion, AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { useBeatStore } from '@/stores/beatStore'

export function CTACard() {
  const beatIndex = useBeatStore((s) => s.beatIndex)
  const [hovered, setHovered] = useState(false)

  return (
    <AnimatePresence>
      {beatIndex >= 5 && (
        <motion.div
          key="cta-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 80,
            width: '100%',
            maxWidth: '520px',
            padding: '0 16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="glass-card-lg molten-edge"
            style={{
              padding: '48px',
              boxSizing: 'border-box',
            }}
          >
            {/* Header label */}
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '10px',
                fontWeight: 400,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#2ad16a',
                marginBottom: '16px',
              }}
            >
              READY TO HELP
            </div>

            {/* Divider */}
            <div
              style={{
                width: '100%',
                height: '1px',
                background: 'rgba(255,255,255,0.08)',
                marginBottom: '24px',
              }}
            />

            {/* Body text */}
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '18px',
                color: '#d4d4d8',
                lineHeight: 1.8,
                margin: '0 0 32px 0',
              }}
            >
              That took 8 seconds.
              <br />
              Your crew has the route.
              <br />
              Johnson has the invoice.
              <br />
              You&apos;re already on to the next job.
            </p>

            {/* CTA Button */}
            <motion.a
              href="#start"
              animate={{
                scale: hovered ? 1.02 : 1,
                background: hovered ? '#2ad16a' : '#05A845',
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onHoverStart={() => setHovered(true)}
              onHoverEnd={() => setHovered(false)}
              style={{
                display: 'block',
                textAlign: 'center',
                color: '#000000',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                borderRadius: '12px',
                padding: '16px 32px',
                textDecoration: 'none',
                boxShadow: '0 0 32px rgba(5,168,69,0.4), 0 4px 16px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              Start free for 30 days →
            </motion.a>

            {/* Fine print */}
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '13px',
                color: 'rgba(161,161,170,0.7)',
              }}
            >
              No credit card. No setup call.
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
