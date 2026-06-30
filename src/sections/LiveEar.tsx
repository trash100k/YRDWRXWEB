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
  heading: '#fafafa',
  body: '#d4d4d8',
  muted: '#a1a1aa',
  faint: '#71717a',
  faintest: '#52525b',
  card: 'rgba(255,255,255,0.045)',
  cardHi: 'rgba(255,255,255,0.06)',
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

const SESSION = {
  elapsed: '00:48',
  location: '14 Aspen Ridge Dr · on site',
}

const WAVE_HEIGHTS = [
  14, 26, 42, 58, 70, 52, 38, 60, 74, 46, 30, 55, 72, 40, 24, 50, 66, 34, 20, 44,
  62, 30, 16, 38, 54, 28,
] as const

type Chip = { label: string; icon: 'plus' | 'edge' | 'mulch'; fresh?: boolean }
const CHIPS: Chip[] = [
  { label: 'Hedge trim', icon: 'plus', fresh: true },
  { label: 'Edge driveway', icon: 'edge' },
  { label: 'Mulch refresh', icon: 'mulch' },
]

type LineItem = {
  name: string
  meta: string
  price: string
  icon: 'hedge' | 'edge' | 'mulch' | 'alert'
  state: 'done' | 'building' | 'suggested'
}
const LINE_ITEMS: LineItem[] = [
  { name: 'Hedge trim — north fence', meta: '~40 ft · shape & haul', price: '$120', icon: 'hedge', state: 'done' },
  { name: 'Re-edge driveway', meta: 'both sides · ~70 ft', price: '$40', icon: 'edge', state: 'done' },
  { name: 'Mulch refresh — front beds', meta: '3 cu yd · brown hardwood', price: '$120', icon: 'mulch', state: 'building' },
  { name: 'Spring fertilizer pass', meta: 'suggested · listening…', price: '$85', icon: 'alert', state: 'suggested' },
]

const QUOTE = {
  scopeLabel: 'Auto-scope · building',
  title: 'Spring Cleanup — Quote',
  customerInitials: 'DR',
  customer: 'Diane Russo · Aspen Ridge',
  total: '365',
  totalSub: '3 confirmed · 1 suggested',
}

const LEGEND = ['Waveform', 'Transcript', 'Tagged scope', 'Priced quote'] as const

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
  borderRadius: '22px',
  background: 'linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))',
  border: `1px solid ${T.border}`,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow:
    '0 30px 80px rgba(0,0,0,0.55), 0 0 60px rgba(5,168,69,0.12), inset 0 1px 0 rgba(255,255,255,0.07)',
}

/* ------------------------------------------------------------------ */
/* Icons (paths copied from mockup)                                    */
/* ------------------------------------------------------------------ */

function ChipIcon({ icon }: { icon: Chip['icon'] }) {
  switch (icon) {
    case 'plus':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14M12 5v14" stroke={T.neon} strokeWidth="2" strokeLinecap="round" transform="rotate(45 12 12)" />
        </svg>
      )
    case 'edge':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 17l8-10 4 5 6-7" stroke={T.neon} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'mulch':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 18c2-4 6-6 8-6s6 2 8 6" stroke={T.neon} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 12V6" stroke={T.neon} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
  }
}

function LineIcon({ icon }: { icon: LineItem['icon'] }) {
  switch (icon) {
    case 'hedge':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 4l4 9M9 4l4 9M5 13h7l-1.5 7h-4z" stroke={T.greenBright} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'edge':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 16l8-9 3 3 7-8" stroke={T.greenBright} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'mulch':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 18c2-4 6-6 8-6s6 2 8 6" stroke={T.neon} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 12V6" stroke={T.neon} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'alert':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke={T.orangeBright} strokeWidth="1.5" />
          <path d="M12 8v5M12 16h.01" stroke={T.orangeBright} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
  }
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
          'radial-gradient(900px 620px at 24% 64%, rgba(5,168,69,0.20), transparent 60%)',
          'radial-gradient(760px 560px at 84% 28%, rgba(232,93,4,0.10), transparent 62%)',
          'radial-gradient(680px 600px at 92% 90%, rgba(124,58,237,0.10), transparent 60%)',
          'radial-gradient(1200px 900px at 50% 0%, rgba(5,168,69,0.07), transparent 70%)',
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
            'radial-gradient(140% 110% at 50% 42%, transparent 55%, rgba(0,0,0,0.62) 100%)',
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
          opacity: 0.04,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="liveEarGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#liveEarGrain)" />
      </svg>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Mic orb — the hero moment                                           */
/* ------------------------------------------------------------------ */

function MicOrb({ reduced }: { reduced: boolean }) {
  const rings = [
    { size: 264, border: 'rgba(45,209,106,0.10)', delay: '0s' },
    { size: 210, border: 'rgba(45,209,106,0.18)', delay: '0.5s' },
  ]
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.1 }}
      style={{
        position: 'relative',
        width: 'clamp(240px, 60vw, 300px)',
        aspectRatio: '1 / 1',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        margin: '0 auto',
      }}
    >
      {/* expanding rings */}
      {rings.map((r) => (
        <span
          key={r.size}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: `${r.size}px`,
            height: `${r.size}px`,
            maxWidth: '100%',
            maxHeight: '100%',
            transform: 'translate(-50%,-50%)',
            borderRadius: '50%',
            border: `1px solid ${r.border}`,
            animation: reduced ? undefined : `orbPulse 3.4s ease-out infinite ${r.delay}`,
          }}
        />
      ))}
      {/* inner solid ring */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '178px',
          height: '178px',
          maxWidth: '74%',
          maxHeight: '74%',
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          border: '1px solid rgba(45,209,106,0.28)',
          boxShadow: '0 0 40px rgba(45,209,106,0.12) inset',
        }}
      />

      {/* waveform across the orb base */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: 'calc(50% - 4px)',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '3.5px',
          height: '78px',
          width: '100%',
          maxWidth: '300px',
          justifyContent: 'center',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {WAVE_HEIGHTS.map((h, i) => (
          <span
            key={i}
            style={{
              width: '4px',
              height: `${h}px`,
              borderRadius: '3px',
              background: `linear-gradient(180deg, ${T.neon}, ${T.green} 70%, rgba(5,168,69,0.4))`,
              boxShadow: '0 0 8px rgba(45,209,106,0.55)',
              transformOrigin: 'center',
              animation: reduced ? undefined : `waveBar ${0.85 + (i % 5) * 0.12}s ease-in-out infinite`,
              animationDelay: reduced ? undefined : `${i * 0.045}s`,
            }}
          />
        ))}
      </div>

      {/* the orb */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '150px',
          height: '150px',
          maxWidth: '50%',
          maxHeight: '50%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 38% 32%, #5dffa0 0%, #2ad16a 32%, #05a845 60%, #047a32 100%)',
          boxShadow:
            '0 0 70px rgba(45,209,106,0.6), 0 0 130px rgba(5,168,69,0.4), inset 0 -14px 36px rgba(4,33,15,0.55), inset 0 10px 24px rgba(93,255,160,0.5)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {/* specular highlight */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '16%',
            top: '12%',
            width: '36%',
            height: '25%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.55), transparent 70%)',
            filter: 'blur(4px)',
          }}
        />
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ position: 'relative', zIndex: 2, filter: 'drop-shadow(0 2px 6px rgba(4,33,15,0.6))' }}
        >
          <rect x="9" y="2.5" width="6" height="11" rx="3" fill="#04210f" />
          <path d="M6 11a6 6 0 0012 0" stroke="#04210f" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 17v4M9 21h6" stroke="#04210f" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  )
}

function ListenLabel({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.25 }}
      style={{ textAlign: 'center', marginTop: '6px' }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          fontFamily: T.mono,
          fontWeight: 700,
          fontSize: '11px',
          letterSpacing: '0.22em',
          color: T.neon,
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: T.neon,
            boxShadow: `0 0 10px ${T.neon}`,
            animation: reduced ? undefined : 'blink 1.6s ease-in-out infinite',
          }}
        />
        Listening
      </div>
      <div
        style={{
          fontFamily: T.mono,
          fontWeight: 700,
          fontSize: '30px',
          color: T.heading,
          marginTop: '6px',
          letterSpacing: '0.02em',
          textShadow: '0 0 22px rgba(45,209,106,0.4)',
        }}
      >
        {SESSION.elapsed}
      </div>
      <div style={{ fontSize: '11px', color: T.faint, marginTop: '5px', letterSpacing: '0.04em' }}>
        {SESSION.location}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Live transcript                                                     */
/* ------------------------------------------------------------------ */

function Transcript({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.2 }}
      style={{ minWidth: 0 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '14px',
          fontFamily: T.mono,
          fontWeight: 700,
          fontSize: '9.5px',
          letterSpacing: '0.2em',
          color: T.faint,
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: T.neon,
            boxShadow: `0 0 8px ${T.neon}`,
            animation: reduced ? undefined : 'blink 1.6s ease-in-out infinite',
          }}
        />
        Live transcript
      </div>

      <p style={{ fontSize: '14.5px', lineHeight: 1.62, color: T.faint, margin: '0 0 14px' }}>
        <Speaker>Marco</Speaker>
        Okay, so along the north fence we've got these overgrown shrubs…
      </p>

      <p style={{ fontSize: '16px', lineHeight: 1.62, color: T.body, margin: '0 0 14px' }}>
        <Speaker>Marco</Speaker>
        Let's <Highlight>trim these hedges back</Highlight> about a foot, then{' '}
        <Highlight>re-edge the driveway</Highlight> on both sides and{' '}
        <Highlight>refresh the mulch</Highlight> in the front beds
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '2px',
            height: '17px',
            background: T.neon,
            verticalAlign: '-3px',
            marginLeft: '3px',
            boxShadow: `0 0 8px ${T.neon}`,
            animation: reduced ? undefined : 'blink 1s step-end infinite',
          }}
        />
      </p>

      {/* tagged scope chips */}
      <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap', marginTop: '6px' }}>
        {CHIPS.map((c, i) => (
          <motion.span
            key={c.label}
            initial={reduced ? false : { opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...SPRING, delay: reduced ? 0 : 0.35 + i * 0.1 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 13px',
              borderRadius: '11px',
              background: 'rgba(45,209,106,0.10)',
              border: '1px solid rgba(45,209,106,0.35)',
              fontSize: '12.5px',
              fontWeight: 600,
              color: T.neon,
              boxShadow: '0 0 18px rgba(45,209,106,0.18)',
              animation: !reduced && c.fresh ? 'chipGlow 2.6s ease-out infinite' : undefined,
            }}
          >
            <ChipIcon icon={c.icon} />
            {c.label}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

function Speaker({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: T.mono,
        fontSize: '10px',
        letterSpacing: '0.1em',
        color: T.greenBright,
        textTransform: 'uppercase',
        marginRight: '8px',
      }}
    >
      {children}
    </span>
  )
}

function Highlight({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        color: T.neon,
        fontWeight: 600,
        background: 'rgba(45,209,106,0.10)',
        borderRadius: '5px',
        padding: '1px 5px',
        boxShadow: '0 0 0 1px rgba(45,209,106,0.22) inset',
      }}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Pipeline legend                                                     */
/* ------------------------------------------------------------------ */

function Legend({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.45 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        flexWrap: 'wrap',
        marginTop: '28px',
        fontFamily: T.mono,
        fontSize: '9.5px',
        letterSpacing: '0.14em',
        color: T.faint,
        textTransform: 'uppercase',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span aria-hidden="true" style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
          {[5, 11, 7, 13, 6].map((h, i) => (
            <i key={i} style={{ width: '2.5px', height: `${h}px`, borderRadius: '2px', background: T.greenBright }} />
          ))}
        </span>
        {LEGEND[0]}
      </span>
      <span aria-hidden="true" style={{ color: T.greenBright }}>→</span>
      <span>{LEGEND[1]}</span>
      <span aria-hidden="true" style={{ color: T.greenBright }}>→</span>
      <span>{LEGEND[2]}</span>
      <span aria-hidden="true" style={{ color: T.greenBright }}>→</span>
      <span style={{ color: T.greenBright }}>{LEGEND[3]}</span>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Quote card — auto-scope being assembled                             */
/* ------------------------------------------------------------------ */

function QuoteRow({ item, index, reduced }: { item: LineItem; index: number; reduced: boolean }) {
  const isSuggested = item.state === 'suggested'
  const isBuilding = item.state === 'building'
  const isAlert = item.icon === 'alert'
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: isSuggested ? 0.55 : 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.3 + index * 0.1 }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 0',
        borderBottom: index === LINE_ITEMS.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* shimmer sweep over the row being built */}
      {isBuilding && !reduced && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '8px',
            pointerEvents: 'none',
            background: 'linear-gradient(100deg,transparent 20%,rgba(93,255,160,0.16) 50%,transparent 80%)',
            backgroundSize: '240% 100%',
            animation: 'shimmerSweep 1.8s ease-in-out infinite',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <span
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            background: isAlert ? 'rgba(232,93,4,0.08)' : 'rgba(45,209,106,0.10)',
            border: isAlert ? '1px solid rgba(232,93,4,0.2)' : '1px solid rgba(45,209,106,0.22)',
          }}
        >
          <LineIcon icon={item.icon} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: isBuilding || isSuggested ? T.muted : T.heading,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ minWidth: 0 }}>{item.name}</span>
            {isBuilding && (
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: T.neon,
                  boxShadow: `0 0 9px ${T.neon}`,
                  animation: reduced ? undefined : 'blink 1s ease-in-out infinite',
                }}
              />
            )}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: isSuggested ? T.faintest : T.faint,
              marginTop: '2px',
            }}
          >
            {item.meta}
          </div>
        </div>
      </div>
      <span
        style={{
          fontFamily: T.mono,
          fontWeight: 700,
          fontSize: '15px',
          color: isBuilding || isSuggested ? T.faint : T.body,
          flexShrink: 0,
          marginLeft: '12px',
        }}
      >
        {item.price}
      </span>
    </motion.div>
  )
}

function QuoteCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.15 }}
      style={{ ...cardStyle, overflow: 'hidden', minWidth: 0 }}
    >
      {/* head */}
      <div
        style={{
          padding: '20px 22px 16px',
          borderBottom: `1px solid ${T.hair}`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Micro color={T.greenBright}>{QUOTE.scopeLabel}</Micro>
          <div
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '20px',
              color: T.heading,
              marginTop: '7px',
              letterSpacing: '-0.02em',
            }}
          >
            {QUOTE.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '11px' }}>
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                background: 'linear-gradient(150deg,#2ad16a,#047a32)',
                fontSize: '10px',
                fontWeight: 700,
                color: '#04210f',
                fontFamily: T.display,
              }}
            >
              {QUOTE.customerInitials}
            </span>
            <span style={{ fontSize: '12px', color: T.body, fontWeight: 500 }}>{QUOTE.customer}</span>
          </div>
        </div>

        {/* building badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
            fontFamily: T.mono,
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: T.neon,
            textTransform: 'uppercase',
            padding: '6px 10px',
            borderRadius: '9px',
            background: 'rgba(45,209,106,0.12)',
            border: '1px solid rgba(45,209,106,0.3)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              border: '1.6px solid rgba(93,255,160,0.3)',
              borderTopColor: T.neon,
              animation: reduced ? undefined : 'spin 0.9s linear infinite',
            }}
          />
          Building
        </span>
      </div>

      {/* line items */}
      <div style={{ padding: '8px 22px 6px' }}>
        {LINE_ITEMS.map((item, i) => (
          <QuoteRow key={item.name} item={item} index={i} reduced={reduced} />
        ))}
      </div>

      {/* running total */}
      <div
        style={{
          margin: '6px 22px 0',
          padding: '18px 0 6px',
          borderTop: `1px solid ${T.hair}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div>
          <Micro color={T.muted} style={{ letterSpacing: '0.18em', fontSize: '10px' }}>
            Running total
          </Micro>
          <div style={{ fontFamily: T.mono, fontSize: '11px', color: T.faint, marginTop: '6px' }}>
            {QUOTE.totalSub}
          </div>
        </div>
        <div
          style={{
            fontFamily: T.display,
            fontWeight: 800,
            fontSize: '34px',
            color: T.heading,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          <span style={{ color: T.greenBright, fontSize: '22px', verticalAlign: '6px', marginRight: '1px' }}>$</span>
          {QUOTE.total}
        </div>
      </div>

      {/* footer actions */}
      <div style={{ padding: '14px 22px 20px', display: 'flex', gap: '10px' }}>
        <div
          role="button"
          tabIndex={0}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            color: T.body,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${T.border}`,
          }}
        >
          Edit scope
        </div>
        <div
          role="button"
          tabIndex={0}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#04210f',
            background: `linear-gradient(180deg, ${T.neon}, ${T.greenBright})`,
            boxShadow: '0 0 26px rgba(45,209,106,0.45), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          Send quote →
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function LiveEar() {
  const reduced = useReducedMotion()

  return (
    <section
      aria-labelledby="liveear-heading"
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
          style={{ maxWidth: '620px', marginBottom: 'clamp(28px, 4vw, 44px)' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: T.neon,
                boxShadow: `0 0 10px ${T.neon}, 0 0 18px rgba(93,255,160,0.7)`,
                animation: reduced ? undefined : 'blink 1.6s ease-in-out infinite',
              }}
            />
            <Micro color={T.neon} style={{ fontSize: '10px', letterSpacing: '0.22em' }}>
              LIVE EAR · ON-SITE AI
            </Micro>
          </span>
          <h2
            id="liveear-heading"
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: 'clamp(30px, 5vw, 46px)',
              lineHeight: 1.02,
              color: T.heading,
              letterSpacing: '-0.025em',
              margin: 0,
            }}
          >
            Walk the yard. Talk.{' '}
            <span
              style={{
                backgroundImage: `linear-gradient(120deg, ${T.neon}, ${T.greenBright} 70%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
              }}
            >
              It's quoted.
            </span>
          </h2>
          <p
            style={{
              margin: '14px 0 0',
              fontFamily: T.sans,
              fontSize: 'clamp(14px, 2.5vw, 14.5px)',
              color: T.muted,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            Speak naturally as you walk a property. Live Ear hears the work, tags each task, and
            assembles a priced scope in real time — before you're back at the truck.
          </p>
        </motion.div>

        {/* main grid: orb + transcript | quote card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* left column: orb stack, transcript, legend */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '32px',
              }}
            >
              <MicOrb reduced={reduced} />
              <ListenLabel reduced={reduced} />
            </div>
            <Transcript reduced={reduced} />
            <Legend reduced={reduced} />
          </div>

          {/* right column: quote card */}
          <QuoteCard reduced={reduced} />
        </div>
      </div>

      <GrainVignette />
    </section>
  )
}
