import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/useScrollBeat'

/* ------------------------------------------------------------------ */
/* Tokens (inlined for an isolated, parallel build)                    */
/* ------------------------------------------------------------------ */

const T = {
  green: '#05a845',
  greenBright: '#2ad16a',
  greenDeep: '#047a32',
  neon: '#5dffa0',
  orange: '#E85D04',
  orangeBright: '#f97316',
  amber: '#fbbf24',
  heading: '#fafafa',
  body: '#d4d4d8',
  muted: '#a1a1aa',
  faint: '#71717a',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  hair: 'rgba(255,255,255,0.07)',
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "'Outfit', 'Inter', sans-serif",
} as const

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 }

/* ------------------------------------------------------------------ */
/* Seed data — verbatim from mockup                                    */
/* ------------------------------------------------------------------ */

const SOURCE = { file: 'IMG_4471.HEIC · 4.2 MB', address: '847 OAK ST', progress: 78 }

type Detection = {
  tag: string
  left: string
  top: string
  w: string
  h: string
  tone: 'neon' | 'orange'
}
const DETECTIONS: Detection[] = [
  { tag: 'Turf · 2,430 ft²', left: '8%', top: '54%', w: '40%', h: '30%', tone: 'neon' },
  { tag: 'Hedge · 41 ft', left: '6%', top: '48%', w: '38%', h: '14%', tone: 'neon' },
  { tag: 'Overgrowth', left: '73%', top: '38%', w: '22%', h: '26%', tone: 'orange' },
]

type LogStep = { text: string; value: string; status: 'done' | 'alert' | 'run' }
const LOG_STEPS: LogStep[] = [
  { text: 'Turf area mapped', value: '2,430 sq ft', status: 'done' },
  { text: 'Hedge row identified', value: '41 ft', status: 'done' },
  { text: 'Mulch beds counted', value: '2 beds', status: 'done' },
  { text: 'Overgrowth detected — NE corner', value: '+upsell', status: 'alert' },
  { text: 'Pricing against your catalog…', value: '4 / 5', status: 'run' },
]

type IconKey = 'hedge' | 'aerate' | 'edge' | 'mulch'
type LineItem = { name: string; sub: string; price: string; icon: IconKey }
const LINE_ITEMS: LineItem[] = [
  { name: 'Hedge trim & shape', sub: '41 ft · precision cut', price: '$120.00', icon: 'hedge' },
  { name: 'Aerate back lawn', sub: 'core aeration · 2,430 ft²', price: '$85.00', icon: 'aerate' },
  { name: 'Edge driveway', sub: 'clean linear edge · 64 ft', price: '$40.00', icon: 'edge' },
  { name: 'Mulch beds — refresh', sub: '2 beds · 2 yd hardwood', price: '$120.00', icon: 'mulch' },
]

const QUOTE = {
  id: '#YW-2048',
  property: 'Johnson Property',
  addr: '847 OAK ST · CEDAR PARK, TX 78613',
  subtotalLine: '$365.00 + $30.11 tax (8.25%)',
  total: '$395.11',
  crew: '2 techs',
  duration: '3.5 hrs',
  scheduled: 'Thu · 9:00 AM',
  sendSub: 'SMS + e-sign · cutty@847oak.io',
}
const SPEED = { seconds: '11.4s', vsManual: '42× FASTER THAN MANUAL' }

/* ------------------------------------------------------------------ */
/* Tiny shared style recipes                                           */
/* ------------------------------------------------------------------ */

const microBase: CSSProperties = {
  fontFamily: T.mono,
  fontSize: '9.5px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: T.faint,
}

function Micro({
  children,
  color,
  style,
}: {
  children: ReactNode
  color?: string
  style?: CSSProperties
}) {
  return <span style={{ ...microBase, ...(color ? { color } : null), ...style }}>{children}</span>
}

const cardStyle: CSSProperties = {
  position: 'relative',
  borderRadius: '20px',
  background: T.card,
  border: `1px solid ${T.border}`,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
}

/* ------------------------------------------------------------------ */
/* Line-item icons (paths copied from mockup)                          */
/* ------------------------------------------------------------------ */

function LineIcon({ icon, color }: { icon: IconKey; color: string }) {
  switch (icon) {
    case 'hedge':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 20c2-8 4-12 8-16M9 20c2-7 4-10 7-13M14 20c1-5 3-7 5-9"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'aerate':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="7" cy="9" r="2" stroke={color} strokeWidth="1.6" />
          <circle cx="16" cy="7" r="2" stroke={color} strokeWidth="1.6" />
          <circle cx="12" cy="15" r="2" stroke={color} strokeWidth="1.6" />
          <circle cx="18" cy="16" r="2" stroke={color} strokeWidth="1.6" />
        </svg>
      )
    case 'edge':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 16h16M6 16l3-9M18 16l-3-9"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'mulch':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 18c4-4 14-4 18 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M5 15c4-3 10-3 14 0" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
  }
}

/* ------------------------------------------------------------------ */
/* Yard illustration (left dropzone)                                   */
/* ------------------------------------------------------------------ */

function YardSvg() {
  return (
    <svg
      viewBox="0 0 600 296"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'saturate(0.7) brightness(0.92)' }}
    >
      <defs>
        <linearGradient id="forgeSky" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#1a2230" />
          <stop offset="1" stopColor="#2a3242" />
        </linearGradient>
        <linearGradient id="forgeLawn" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#3f5a2f" />
          <stop offset="1" stopColor="#2c4220" />
        </linearGradient>
        <linearGradient id="forgeLawn2" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#4a6837" />
          <stop offset="1" stopColor="#36502a" />
        </linearGradient>
        <linearGradient id="forgeHouse" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#9aa0ab" />
          <stop offset="1" stopColor="#6e747f" />
        </linearGradient>
        <linearGradient id="forgeRoof" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#574b46" />
          <stop offset="1" stopColor="#3d3431" />
        </linearGradient>
      </defs>
      <rect width="600" height="296" fill="url(#forgeSky)" />
      <ellipse cx="70" cy="120" rx="60" ry="34" fill="#2b3a26" />
      <ellipse cx="540" cy="118" rx="72" ry="38" fill="#2b3a26" />
      <rect x="350" y="86" width="200" height="86" fill="url(#forgeHouse)" />
      <polygon points="340,90 450,46 560,90" fill="url(#forgeRoof)" />
      <rect x="372" y="112" width="34" height="34" fill="#3a4350" />
      <rect x="420" y="112" width="34" height="34" fill="#3a4350" />
      <rect x="478" y="116" width="30" height="56" fill="#2e3640" />
      <polygon points="300,296 360,172 430,172 420,296" fill="#5a5d63" />
      <path d="M0 150 Q300 132 600 152 L600 296 L0 296 Z" fill="url(#forgeLawn)" />
      <path d="M0 200 Q300 184 600 204 L600 296 L0 296 Z" fill="url(#forgeLawn2)" opacity="0.55" />
      <g opacity="0.16" stroke="#9cd17a" strokeWidth="14">
        <line x1="-20" y1="296" x2="120" y2="180" />
        <line x1="120" y1="296" x2="240" y2="186" />
        <line x1="260" y1="296" x2="360" y2="192" />
      </g>
      <g>
        <rect x="40" y="160" width="220" height="22" rx="11" fill="#33491f" />
        <ellipse cx="70" cy="160" rx="26" ry="16" fill="#3d5826" />
        <ellipse cx="120" cy="158" rx="28" ry="17" fill="#3d5826" />
        <ellipse cx="172" cy="160" rx="27" ry="16" fill="#3d5826" />
        <ellipse cx="224" cy="161" rx="26" ry="16" fill="#3d5826" />
      </g>
      <ellipse cx="460" cy="186" rx="46" ry="13" fill="#5c3a1e" />
      <ellipse cx="540" cy="200" rx="40" ry="12" fill="#5c3a1e" />
      <g opacity="0.92">
        <ellipse cx="560" cy="150" rx="40" ry="30" fill="#26371d" />
        <path
          d="M540 165 q6 -34 18 -40 M556 168 q2 -30 8 -42 M572 166 q10 -26 18 -34"
          stroke="#1f2e17"
          strokeWidth="3"
          fill="none"
        />
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Iso 3D design preview (right card)                                  */
/* ------------------------------------------------------------------ */

function DesignPreviewSvg() {
  return (
    <svg
      viewBox="0 0 320 148"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="forgePbg" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#0b1410" />
          <stop offset="1" stopColor="#06100b" />
        </linearGradient>
        <linearGradient id="forgeGrass" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2ad16a" />
          <stop offset="1" stopColor="#047a32" />
        </linearGradient>
        <linearGradient id="forgeGrass2" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5dffa0" />
          <stop offset="1" stopColor="#05a845" />
        </linearGradient>
        <radialGradient id="forgePglow" cx="50%" cy="40%" r="70%">
          <stop stopColor="rgba(45,209,106,0.32)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="320" height="148" fill="url(#forgePbg)" />
      <rect width="320" height="148" fill="url(#forgePglow)" />
      <polygon
        points="160,40 296,108 160,140 24,108"
        fill="url(#forgeGrass)"
        stroke="#5dffa0"
        strokeWidth="0.8"
        opacity="0.95"
      />
      <g opacity="0.2" stroke="#06100b" strokeWidth="2">
        <line x1="92" y1="74" x2="228" y2="74" />
        <line x1="78" y1="84" x2="242" y2="84" />
        <line x1="64" y1="94" x2="256" y2="94" />
      </g>
      <polygon points="118,52 168,40 168,66 118,78" fill="#9aa0ab" />
      <polygon points="168,40 210,54 210,80 168,66" fill="#6e747f" />
      <polygon points="118,52 168,40 210,54 160,66" fill="#574b46" />
      <ellipse cx="100" cy="100" rx="14" ry="6" fill="url(#forgeGrass2)" />
      <ellipse cx="124" cy="108" rx="14" ry="6" fill="url(#forgeGrass2)" />
      <ellipse cx="148" cy="116" rx="14" ry="6" fill="url(#forgeGrass2)" />
      <ellipse cx="226" cy="86" rx="13" ry="15" fill="#2ad16a" />
      <rect x="224.5" y="92" width="3" height="10" fill="#3d2b1a" />
      <ellipse cx="206" cy="100" rx="10" ry="12" fill="#05a845" />
      <rect x="204.5" y="106" width="3" height="8" fill="#3d2b1a" />
      <polygon points="210,108 248,118 226,128 196,118" fill="#5c3a1e" />
      <polygon points="160,128 184,118 160,110 136,118" fill="#5a5d63" opacity="0.7" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Background / overlay primitives                                     */
/* ------------------------------------------------------------------ */

function GlowField() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: [
          'radial-gradient(900px 620px at 18% 12%, rgba(5,168,69,0.20), transparent 60%)',
          'radial-gradient(760px 560px at 88% 82%, rgba(45,209,106,0.13), transparent 62%)',
          'radial-gradient(620px 480px at 78% 8%, rgba(232,93,4,0.10), transparent 60%)',
          'radial-gradient(680px 560px at 8% 92%, rgba(124,58,237,0.10), transparent 62%)',
        ].join(','),
      }}
    />
  )
}

function GrainVignette() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 40,
          pointerEvents: 'none',
          background:
            'radial-gradient(120% 100% at 50% 42%, transparent 52%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 45,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.045,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="forgeGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#forgeGrain)" />
      </svg>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Left card — scan studio                                             */
/* ------------------------------------------------------------------ */

function CheckIcon() {
  return (
    <span
      style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'rgba(45,209,106,0.16)',
        border: '1px solid rgba(45,209,106,0.5)',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 0 9px rgba(45,209,106,0.4)',
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" stroke={T.neon} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 2 20h20L12 3Z" stroke={T.amber} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9v5M12 17h.01" stroke={T.amber} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function LogRow({ step, index, reduced }: { step: LogStep; index: number; reduced: boolean }) {
  const txtColor = step.status === 'alert' ? T.amber : step.status === 'run' ? T.neon : T.body
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.3 + index * 0.1 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: T.mono,
        fontSize: '12.5px',
      }}
    >
      <span style={{ flexShrink: 0, width: '18px', height: '18px', display: 'grid', placeItems: 'center' }}>
        {step.status === 'done' ? (
          <CheckIcon />
        ) : step.status === 'alert' ? (
          <AlertIcon />
        ) : (
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              border: '2px solid rgba(93,255,160,0.25)',
              borderTopColor: T.neon,
              animation: reduced ? undefined : 'spin 0.8s linear infinite',
            }}
          />
        )}
      </span>
      <span style={{ color: txtColor }}>{step.text}</span>
      <span
        style={{
          marginLeft: 'auto',
          fontWeight: 700,
          color: step.status === 'alert' ? T.amber : step.status === 'run' ? T.neon : T.heading,
        }}
      >
        {step.value}
      </span>
    </motion.div>
  )
}

function LeftCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.05 }}
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '20px',
        minWidth: 0,
      }}
    >
      {/* panel label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <Micro color={T.greenBright}>Source · Drop zone</Micro>
        <Micro style={{ whiteSpace: 'nowrap' }}>{SOURCE.file}</Micro>
      </div>

      {/* drop zone */}
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          height: 'clamp(220px, 56vw, 296px)',
          flexShrink: 0,
          border: '1.5px dashed rgba(45,209,106,0.34)',
          boxShadow: '0 0 40px rgba(5,168,69,0.12) inset',
        }}
      >
        <YardSvg />

        {/* scan grid */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 0.18,
            backgroundImage:
              'linear-gradient(rgba(93,255,160,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(93,255,160,0.5) 1px,transparent 1px)',
            backgroundSize: '34px 34px',
            WebkitMaskImage: 'radial-gradient(120% 120% at 50% 50%, #000 40%, transparent 85%)',
            maskImage: 'radial-gradient(120% 120% at 50% 50%, #000 40%, transparent 85%)',
          }}
        />

        {/* scanline */}
        {!reduced && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '120px',
              zIndex: 6,
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg,transparent,rgba(93,255,160,0.18) 45%,rgba(93,255,160,0.4) 50%,rgba(93,255,160,0.18) 55%,transparent)',
              animation: 'forgeScan 2.6s ease-in-out infinite',
            }}
          />
        )}

        {/* detection boxes */}
        {DETECTIONS.map((d, i) => {
          const isOrange = d.tone === 'orange'
          return (
            <motion.div
              key={d.tag}
              initial={reduced ? false : { opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ ...SPRING, delay: reduced ? 0 : 0.25 + i * 0.12 }}
              style={{
                position: 'absolute',
                left: d.left,
                top: d.top,
                width: d.w,
                height: d.h,
                zIndex: 7,
                borderRadius: '6px',
                border: `1.5px solid ${isOrange ? T.orangeBright : T.neon}`,
                boxShadow: isOrange
                  ? '0 0 14px rgba(249,115,22,0.55)'
                  : '0 0 14px rgba(93,255,160,0.5)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '-9px',
                  left: '6px',
                  fontFamily: T.mono,
                  fontSize: '8px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  color: isOrange ? '#160a00' : '#04210f',
                  background: isOrange ? T.orangeBright : T.neon,
                  padding: '2px 5px',
                  borderRadius: '3px',
                }}
              >
                {d.tag}
              </span>
            </motion.div>
          )
        })}

        {/* top chips */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            right: '12px',
            zIndex: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '999px',
              background: 'rgba(6,8,7,0.66)',
              border: '1px solid rgba(93,255,160,0.3)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: T.neon,
                boxShadow: `0 0 10px ${T.neon}`,
                animation: reduced ? undefined : 'scanPulse 1.6s ease-in-out infinite',
              }}
            />
            <Micro color={T.neon}>SCANNING</Micro>
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 10px',
              borderRadius: '999px',
              background: 'rgba(6,8,7,0.66)',
              border: '1px solid rgba(93,255,160,0.3)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Micro color={T.neon}>{SOURCE.address}</Micro>
          </span>
        </div>

        {/* progress */}
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', zIndex: 8 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '7px',
            }}
          >
            <span
              style={{
                fontFamily: T.mono,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: T.neon,
                textTransform: 'uppercase',
              }}
            >
              Forging
            </span>
            <span style={{ fontFamily: T.mono, fontSize: '13px', fontWeight: 700, color: T.heading }}>
              {SOURCE.progress}%
            </span>
          </div>
          <div
            style={{
              height: '8px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
              border: '1px solid rgba(93,255,160,0.18)',
            }}
          >
            <motion.div
              initial={reduced ? false : { width: '0%' }}
              whileInView={{ width: `${SOURCE.progress}%` }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.9, ease: 'easeOut' }}
              style={{
                height: '100%',
                width: `${SOURCE.progress}%`,
                borderRadius: '999px',
                background: `linear-gradient(90deg, ${T.greenDeep}, ${T.green}, ${T.neon})`,
                boxShadow: '0 0 16px rgba(93,255,160,0.65)',
                position: 'relative',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  content: '""',
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '18px',
                  background: 'rgba(255,255,255,0.6)',
                  filter: 'blur(5px)',
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* AI step log */}
      <div
        style={{
          flex: 1,
          borderRadius: '14px',
          background: 'rgba(4,5,6,0.5)',
          border: `1px solid ${T.hair}`,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '2px',
          }}
        >
          <Micro color={T.greenBright}>Live detection stream</Micro>
          <Micro>GEMINI VISION · v3</Micro>
        </div>
        {LOG_STEPS.map((step, i) => (
          <LogRow key={step.text} step={step} index={i} reduced={reduced} />
        ))}
      </div>

      {/* speed band */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(45,209,106,0.1), rgba(232,93,4,0.06))',
          border: `1px solid ${T.hair}`,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill={T.neon} />
        </svg>
        <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: '15px', color: T.heading }}>
          Quote forged in <span style={{ color: T.neon }}>{SPEED.seconds}</span>
        </span>
        <Micro style={{ marginLeft: 'auto' }}>{SPEED.vsManual}</Micro>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Right card — forged quote                                           */
/* ------------------------------------------------------------------ */

function CountUpTotal({ reduced }: { reduced: boolean }) {
  const [display, setDisplay] = useState(reduced ? QUOTE.total : '$0.00')
  const ref = useRef<HTMLDivElement | null>(null)
  const target = 395.11

  useEffect(() => {
    if (reduced) {
      setDisplay(QUOTE.total)
      return
    }
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setDisplay(QUOTE.total)
      return
    }
    let raf = 0
    let started = false
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry || !entry.isIntersecting || started) return
        started = true
        observer.disconnect()
        const duration = 700
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          const value = target * eased
          setDisplay(`$${value.toFixed(2)}`)
          if (p < 1) raf = requestAnimationFrame(tick)
          else setDisplay(QUOTE.total)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.55 }}
      style={{
        fontFamily: T.display,
        fontWeight: 800,
        fontSize: '40px',
        letterSpacing: '-0.03em',
        lineHeight: 0.9,
        backgroundImage: `linear-gradient(120deg, ${T.neon}, ${T.greenBright})`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        filter: 'drop-shadow(0 0 16px rgba(45,209,106,0.4))',
      }}
    >
      {display}
    </motion.div>
  )
}

function SendButton({ reduced }: { reduced: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={reduced ? undefined : { scale: hovered ? 1.02 : 1 }}
      transition={SPRING}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '9px',
        width: '100%',
        padding: '16px',
        borderRadius: '14px',
        fontFamily: T.display,
        fontWeight: 800,
        fontSize: '16px',
        color: '#04210f',
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${hovered ? T.neon : T.neon}, ${T.green})`,
        filter: hovered ? 'brightness(1.06)' : 'none',
        boxShadow:
          '0 0 34px rgba(45,209,106,0.6), 0 10px 30px rgba(5,168,69,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 11 21 3l-8 18-2-7-8-3Z" fill="#04210f" />
      </svg>
      Send to client
    </motion.div>
  )
}

function FootMetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon}
      <div>
        <Micro style={{ display: 'block', marginBottom: '3px' }}>{label}</Micro>
        <div style={{ fontFamily: T.mono, fontSize: '12.5px', fontWeight: 700, color: T.heading }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function RightCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.15 }}
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 24px',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      {/* quote head */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: T.greenBright,
              textTransform: 'uppercase',
              marginBottom: '7px',
            }}
          >
            Forged quote · {QUOTE.id}
          </div>
          <div
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '24px',
              color: T.heading,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            {QUOTE.property}
          </div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: '11px',
              color: T.muted,
              marginTop: '5px',
              letterSpacing: '0.04em',
            }}
          >
            {QUOTE.addr}
          </div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '7px 12px',
            borderRadius: '999px',
            flexShrink: 0,
            background: 'rgba(45,209,106,0.1)',
            border: '1px solid rgba(45,209,106,0.34)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke={T.neon} strokeWidth="2" />
            <path
              d="M9 12.5 11 14.5 15 9.5"
              stroke={T.neon}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <Micro color={T.neon}>READY</Micro>
        </span>
      </div>

      {/* line items */}
      <div style={{ padding: '16px 0 4px', display: 'flex', flexDirection: 'column' }}>
        {LINE_ITEMS.map((item, i) => {
          const isMulch = item.icon === 'mulch'
          const accent = isMulch ? T.orange : T.greenBright
          return (
            <motion.div
              key={item.name}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...SPRING, delay: reduced ? 0 : 0.25 + i * 0.08 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '11px 0',
                borderBottom:
                  i === LINE_ITEMS.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.045)',
              }}
            >
              <span
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  background: isMulch ? 'rgba(232,93,4,0.1)' : 'rgba(45,209,106,0.1)',
                  border: isMulch ? '1px solid rgba(232,93,4,0.28)' : '1px solid rgba(45,209,106,0.22)',
                }}
              >
                <LineIcon icon={item.icon} color={accent} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14.5px', fontWeight: 600, color: T.heading }}>{item.name}</div>
                <div
                  style={{
                    fontFamily: T.mono,
                    fontSize: '10px',
                    color: T.faint,
                    marginTop: '3px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.sub}
                </div>
              </div>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: T.mono,
                  fontSize: '15px',
                  fontWeight: 700,
                  color: T.body,
                }}
              >
                {item.price}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* total */}
      <div
        style={{
          marginTop: '14px',
          paddingTop: '16px',
          borderTop: '1.5px solid rgba(45,209,106,0.28)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: T.greenBright,
              textTransform: 'uppercase',
              marginBottom: '5px',
            }}
          >
            Total estimate
          </div>
          <div style={{ fontFamily: T.mono, fontSize: '10.5px', color: T.faint, letterSpacing: '0.04em' }}>
            {QUOTE.subtotalLine}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <CountUpTotal reduced={reduced} />
        </div>
      </div>

      {/* footer meta */}
      <div
        style={{
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          padding: '13px 16px',
          borderRadius: '13px',
          background: 'rgba(4,5,6,0.5)',
          border: `1px solid ${T.hair}`,
          flexWrap: 'wrap',
        }}
      >
        <FootMetaItem
          label="CREW"
          value={QUOTE.crew}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M16 19a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3M9.5 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke={T.muted}
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M21 19a3 3 0 0 0-2.4-2.94M17 5.13a3.5 3.5 0 0 1 0 6.74"
                stroke={T.neon}
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          }
        />
        <span style={{ width: '1px', height: '22px', background: T.hair }} />
        <FootMetaItem
          label="DURATION"
          value={QUOTE.duration}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke={T.muted} strokeWidth="1.7" />
              <path
                d="M12 7v5l3.5 2"
                stroke={T.neon}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <span style={{ width: '1px', height: '22px', background: T.hair }} />
        <FootMetaItem
          label="SCHEDULED"
          value={QUOTE.scheduled}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke={T.muted} strokeWidth="1.7" />
              <path d="M3 9h18M8 3v4M16 3v4" stroke={T.neon} strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* bottom: preview + send */}
      <div
        style={{
          marginTop: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          paddingTop: '18px',
        }}
      >
        {/* iso preview */}
        <div
          style={{
            borderRadius: '14px',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(45,209,106,0.22)',
            height: '148px',
            boxShadow: '0 0 30px rgba(5,168,69,0.14) inset',
          }}
        >
          <DesignPreviewSvg />
          <span style={{ position: 'absolute', top: '9px', left: '11px', zIndex: 3 }}>
            <Micro color={T.greenBright}>3D DESIGN PREVIEW</Micro>
          </span>
          <span
            style={{
              position: 'absolute',
              top: '9px',
              right: '11px',
              zIndex: 3,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              borderRadius: '999px',
              background: 'rgba(6,8,7,0.6)',
              border: '1px solid rgba(93,255,160,0.3)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: T.neon,
                boxShadow: `0 0 10px ${T.neon}`,
              }}
            />
            <Micro color={T.neon}>RENDERED</Micro>
          </span>
        </div>

        {/* send column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '13px',
          }}
        >
          <SendButton reduced={reduced} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '11px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              color: T.body,
              cursor: 'pointer',
              boxSizing: 'border-box',
              fontFamily: T.sans,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${T.border}`,
            }}
          >
            Edit draft
          </div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: '10px',
              color: T.faint,
              textAlign: 'center',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {QUOTE.sendSub}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function Forge() {
  const reduced = useReducedMotion()

  return (
    <section
      aria-labelledby="forge-heading"
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        padding: 'clamp(56px, 8vw, 96px) 24px',
        boxSizing: 'border-box',
      }}
    >
      <GlowField />

      <div style={{ position: 'relative', zIndex: 15, maxWidth: '1180px', margin: '0 auto' }}>
        {/* header */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={SPRING}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '18px',
            marginBottom: 'clamp(28px, 4vw, 40px)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: T.neon,
                  boxShadow: `0 0 10px ${T.neon}`,
                  animation: reduced ? undefined : 'scanPulse 1.6s ease-in-out infinite',
                }}
              />
              <Micro color={T.greenBright}>VISION ENGINE · ONLINE</Micro>
            </span>
            <h2
              id="forge-heading"
              style={{
                fontFamily: T.display,
                fontWeight: 800,
                fontSize: 'clamp(30px, 5vw, 46px)',
                lineHeight: 1,
                color: T.heading,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              The{' '}
              <span
                style={{
                  backgroundImage: `linear-gradient(120deg, ${T.neon}, ${T.greenBright})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
                }}
              >
                Forge
              </span>
              .
            </h2>
            <p
              style={{
                margin: '11px 0 0',
                fontFamily: T.sans,
                fontSize: 'clamp(14px, 2.5vw, 15px)',
                color: T.muted,
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              Drop a photo. Forge a priced, designed quote in 12 seconds.
            </p>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              padding: '8px 14px',
              borderRadius: '999px',
              background: T.card,
              border: `1px solid ${T.border}`,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: T.neon,
                boxShadow: `0 0 10px ${T.neon}`,
              }}
            />
            <span style={{ fontSize: '12px', color: T.body, fontWeight: 600 }}>Vision engine</span>
            <Micro color={T.greenBright} style={{ marginLeft: '4px' }}>
              ONLINE
            </Micro>
          </span>
        </motion.div>

        {/* two-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <LeftCard reduced={reduced} />
          <RightCard reduced={reduced} />
        </div>
      </div>

      <GrainVignette />
    </section>
  )
}
