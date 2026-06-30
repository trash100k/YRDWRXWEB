import { motion, AnimatePresence } from 'motion/react'
import { useBeatStore } from '@/stores/beatStore'

// SVG layout constants
const MAP_W = 174  // inner SVG width (200px card - 2*p-3 = 176, minus borders ~174)
const MAP_H = 120  // inner SVG height

// Street layout: two horizontal streets + one vertical connector
// Job pin positions (cx, cy)
const PINS = [
  { cx: 40,  cy: 40,  label: 'JOHNSON', sublabel: '839 Oak' },
  { cx: 90,  cy: 80,  label: '845 OAK',  sublabel: '845 Oak' },
  { cx: 145, cy: 48,  label: '841 OAK',  sublabel: '841 Oak' },
]

// Truck path: polyline through pin centers
const PATH_POINTS = PINS.map((p) => `${p.cx},${p.cy}`).join(' ')
// Rough total path length for stroke-dashoffset animation
const PATH_LENGTH = 180

export function Minimap() {
  const beatIndex = useBeatStore((s) => s.beatIndex)
  const showTruck = beatIndex >= 5

  return (
    <AnimatePresence>
      {beatIndex >= 3 && (
        <motion.div
          key="minimap"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '32px',
            zIndex: 60,
            width: '200px',
            background: 'rgba(9,9,11,0.9)',
            border: '1px solid rgba(5,168,69,0.2)',
            borderRadius: '16px',
            padding: '12px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '9px',
              fontWeight: 400,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#2ad16a',
              marginBottom: '8px',
            }}
          >
            ROUTE · OAK ST
          </div>

          {/* Map SVG */}
          <svg
            width="176"
            height={MAP_H}
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* Street grid */}
            {/* Horizontal street 1 */}
            <line
              x1="10" y1="40" x2={MAP_W - 10} y2="40"
              stroke="rgba(161,161,170,0.2)" strokeWidth="6" strokeLinecap="round"
            />
            {/* Horizontal street 2 */}
            <line
              x1="10" y1="80" x2={MAP_W - 10} y2="80"
              stroke="rgba(161,161,170,0.2)" strokeWidth="6" strokeLinecap="round"
            />
            {/* Vertical connector */}
            <line
              x1="90" y1="20" x2="90" y2="100"
              stroke="rgba(161,161,170,0.2)" strokeWidth="6" strokeLinecap="round"
            />

            {/* Animated truck path (glow) */}
            <motion.polyline
              points={PATH_POINTS}
              fill="none"
              stroke="#05A845"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 4px #05A845)',
              }}
              initial={{ pathLength: 0, opacity: 0.6 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }}
            />

            {/* Job pins */}
            {PINS.map((pin, i) => (
              <motion.g
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 320,
                  damping: 28,
                  delay: 0.2 + i * 0.15,
                }}
                style={{ transformOrigin: `${pin.cx}px ${pin.cy}px` }}
              >
                {/* Outer glow ring */}
                <circle
                  cx={pin.cx}
                  cy={pin.cy}
                  r="7"
                  fill="rgba(5,168,69,0.15)"
                  stroke="rgba(5,168,69,0.4)"
                  strokeWidth="1"
                />
                {/* Pin dot */}
                <circle
                  cx={pin.cx}
                  cy={pin.cy}
                  r="3.5"
                  fill="#05A845"
                  style={{ filter: 'drop-shadow(0 0 3px #05A845)' }}
                />
                {/* Label */}
                <text
                  x={pin.cx}
                  y={pin.cy - 11}
                  textAnchor="middle"
                  fill="#2ad16a"
                  fontSize="7"
                  fontFamily='"JetBrains Mono", monospace'
                  letterSpacing="0.05em"
                >
                  {pin.label}
                </text>
              </motion.g>
            ))}

            {/* Truck icon (small rectangle) — appears on beat 5 */}
            <AnimatePresence>
              {showTruck && (
                <motion.g
                  key="truck"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  style={{ transformOrigin: `${PINS[2].cx}px ${PINS[2].cy}px` }}
                >
                  {/* Truck body */}
                  <rect
                    x={PINS[2].cx - 7}
                    y={PINS[2].cy - 4}
                    width="14"
                    height="8"
                    rx="2"
                    fill="#05A845"
                    style={{ filter: 'drop-shadow(0 0 5px #05A845)' }}
                  />
                  {/* Cab */}
                  <rect
                    x={PINS[2].cx + 3}
                    y={PINS[2].cy - 6}
                    width="6"
                    height="5"
                    rx="1"
                    fill="#2ad16a"
                  />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
