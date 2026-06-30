import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/useScrollBeat'

/* ------------------------------------------------------------------ */
/* Tokens (inlined for an isolated, parallel build)                    */
/* ------------------------------------------------------------------ */

const T = {
  bg: '#09090b',
  green: '#05a845',
  greenBright: '#2ad16a',
  greenDeep: '#047a32',
  neon: '#5dffa0',
  orange: '#E85D04',
  orangeBright: '#f97316',
  violet: '#7c3aed',
  ink: '#04150b',
  h: '#fafafa',
  body: '#d4d4d8',
  muted: '#a1a1aa',
  faint: '#71717a',
  card: 'rgba(255,255,255,0.04)',
  bd: 'rgba(255,255,255,0.08)',
  hair: 'rgba(255,255,255,0.07)',
  fontDisplay: "'Outfit', sans-serif",
  fontBody: "'Inter', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
} as const

const SPRING = { type: 'spring', stiffness: 320, damping: 28 } as const

/* ------------------------------------------------------------------ */
/* Data shapes + seed data (verbatim from the spec / mockup)           */
/* ------------------------------------------------------------------ */

interface Bullet {
  label: string
  detail: string
}

const BULLETS: Bullet[] = [
  {
    label: 'Clock in on site',
    detail: 'GPS-stamped. Hours land in payroll, not on a clipboard.',
  },
  {
    label: 'Live Ear voice notes',
    detail: 'Talk; it transcribes and files notes to the right job.',
  },
  {
    label: 'Next stop, auto-routed',
    detail: 'Distance and ETA to every remaining stop, in order.',
  },
]

interface JobChip {
  id: string
  label: string
}

interface CurrentJob {
  ref: string
  name: string
  address: string
  status: string
  chips: JobChip[]
  timer: string
}

interface LiveEar {
  transcript: string
  saved: boolean
}

type Photo =
  | { kind: 'thumb'; label: string; grad: [string, string, string] }
  | { kind: 'capture' }

interface Stop {
  id: string
  time: string
  ampm: 'AM' | 'PM'
  client: string
  services: string
  distance: string
  unit: string
}

interface Tab {
  id: string
  label: string
  active?: boolean
}

const currentJob: CurrentJob = {
  ref: '#4187',
  name: 'Johnson Property',
  address: '847 Oak St, Maple Grove',
  status: 'ON SITE',
  chips: [
    { id: 'mow', label: 'Mow' },
    { id: 'edge', label: 'Edge' },
    { id: 'trim', label: 'Trim' },
  ],
  timer: '0:42:18',
}

const liveEar: LiveEar = {
  transcript: 'Client wants the beds re-edged and the gate left unlocked.',
  saved: true,
}

const photos: Photo[] = [
  { kind: 'thumb', label: 'BEFORE', grad: ['#0e3a1f', '#1a6b38', '#2ad16a'] },
  { kind: 'thumb', label: 'FRONT BED', grad: ['#2a1505', '#7a3a12', '#f97316'] },
  { kind: 'capture' },
]

const nextStops: Stop[] = [
  {
    id: 's1',
    time: '10:30',
    ampm: 'AM',
    client: 'Garcia Residence',
    services: 'Mow · Blow · Fertilize',
    distance: '2.4',
    unit: 'MI',
  },
  {
    id: 's2',
    time: '11:15',
    ampm: 'AM',
    client: 'Westlake HOA — Lot C',
    services: 'Hedge trim · Cleanup',
    distance: '5.1',
    unit: 'MI',
  },
]

const tabs: Tab[] = [
  { id: 'today', label: 'Today', active: true },
  { id: 'map', label: 'Map' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'me', label: 'Me' },
]

/* ------------------------------------------------------------------ */
/* Local keyframes (waveform shimmer + dot pulse fallback)             */
/* ------------------------------------------------------------------ */

const LOCAL_STYLES = `
@keyframes ywWave {
  0%, 100% { transform: scaleY(0.55); opacity: 0.7; }
  50%      { transform: scaleY(1.15); opacity: 1; }
}
@keyframes ywDot {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.12); }
}
.yw-wave-bar {
  transform-box: fill-box;
  transform-origin: center;
  animation: ywWave 1.8s ease-in-out infinite;
}
.yw-field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: clamp(40px, 6vw, 80px);
  align-items: center;
}
.yw-field-phone-wrap {
  display: flex;
  justify-content: flex-end;
}
.yw-field-phone {
  transform: perspective(1400px) rotateY(-12deg) rotateX(4deg);
}
@media (prefers-reduced-motion: reduce) {
  .yw-wave-bar { animation: none; }
}
@media (max-width: 879px) {
  .yw-field-grid {
    grid-template-columns: 1fr;
    gap: clamp(36px, 8vw, 56px);
  }
  .yw-field-phone-wrap {
    justify-content: center;
  }
  .yw-field-phone {
    transform: none;
  }
}
`

/* ------------------------------------------------------------------ */
/* Responsive hook                                                     */
/* ------------------------------------------------------------------ */

function useIsNarrow(maxWidth: number): boolean {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(`(max-width: ${maxWidth - 1}px)`)
    const onChange = () => setNarrow(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [maxWidth])
  return narrow
}

/* ------------------------------------------------------------------ */
/* Icons (hand-rolled SVGs — mirror the mockup glyphs)                 */
/* ------------------------------------------------------------------ */

interface IconProps {
  size?: number
  color?: string
}

function IconLeaf({ size = 19, color = T.neon }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 4C9 4 4 11 4 19c0 0 0 1 1 1 7 0 15-5 15-15 0-1 0-1 0-1Z"
        fill={color}
        fillOpacity={0.92}
      />
      <path
        d="M6 18C9 13 13 9 18 7"
        stroke={T.ink}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconPin({ size = 12, color = T.muted }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"
        stroke={color}
        strokeWidth={1.7}
      />
      <circle cx="12" cy="10" r="2.4" stroke={color} strokeWidth={1.7} />
    </svg>
  )
}

function IconClock({ size = 11, color = '#ffb27a' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 7v5l3.2 2"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    </svg>
  )
}

function IconMow({ size = 14, color = T.neon }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 17c3 0 3-3 6-3s3 3 6 3 3-3 6-3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M4 12V7m4 5V7m4 5V8m4 4V7m4 5V8"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconEdge({ size = 14, color = T.neon }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19 19 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <path
        d="M5 19l-2 2m16-16 2-2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconTrim({ size = 14, color = T.neon }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l7 7m5 5-3-3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx="6" cy="6" r="2.4" stroke={color} strokeWidth={1.6} />
      <circle cx="6" cy="18" r="2.4" stroke={color} strokeWidth={1.6} />
      <path d="M8 17 18 7" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  )
}

function chipIcon(id: string) {
  if (id === 'mow') return <IconMow />
  if (id === 'edge') return <IconEdge />
  return <IconTrim />
}

function IconMic({ size = 16, color = T.neon }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
        stroke={color}
        strokeWidth={1.8}
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconCheck({ size = 13, color = T.neon }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCamera({ size = 22, color = T.greenBright }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={1.7}
      />
      <circle cx="12" cy="13" r="3.2" stroke={color} strokeWidth={1.7} />
    </svg>
  )
}

function IconTabToday({ size = 22, color = T.neon }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="17" rx="3" stroke={color} strokeWidth={1.8} />
      <path
        d="M3.5 9h17M8 2.5v3M16 2.5v3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx="8.5" cy="14" r="1.4" fill={color} />
    </svg>
  )
}

function IconTabMap({ size = 22, color = T.faint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <path d="M9 3v15M15 6v15" stroke={color} strokeWidth={1.7} />
    </svg>
  )
}

function IconTabEarnings({ size = 22, color = T.faint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v18M16 6.5c0-1.7-1.8-2.5-4-2.5s-4 .8-4 2.8S10 9 12 9.5s4 .8 4 2.7-1.8 2.8-4 2.8-4-.8-4-2.5"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconTabMe({ size = 22, color = T.faint }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" stroke={color} strokeWidth={1.7} />
      <path
        d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </svg>
  )
}

function tabIcon(id: string, active: boolean) {
  const color = active ? T.neon : T.faint
  if (id === 'today') return <IconTabToday color={color} />
  if (id === 'map') return <IconTabMap color={color} />
  if (id === 'earnings') return <IconTabEarnings color={color} />
  return <IconTabMe color={color} />
}

/* ------------------------------------------------------------------ */
/* Style atoms                                                         */
/* ------------------------------------------------------------------ */

function monoMicro(color: string, size = 9.5): CSSProperties {
  return {
    fontFamily: T.fontMono,
    fontSize: `${size}px`,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color,
  }
}

const cardBase: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.bd}`,
  borderRadius: 20,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
}

type Reveal = (initial: CSSProperties, delay?: number) => Record<string, unknown>

/* ------------------------------------------------------------------ */
/* Live dot                                                            */
/* ------------------------------------------------------------------ */

function LiveDot({ reduced, size = 8 }: { reduced: boolean; size?: number }) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: T.neon,
    boxShadow:
      '0 0 0 3px rgba(93,255,160,0.18), 0 0 12px rgba(93,255,160,0.9)',
    flexShrink: 0,
  }
  if (reduced) return <span style={base} />
  return (
    <motion.span
      style={base}
      animate={{ scale: [1, 1.18, 1], opacity: [1, 0.55, 1] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Main section                                                        */
/* ------------------------------------------------------------------ */

export default function Field() {
  const reduced = useReducedMotion()
  const mobile = useIsNarrow(880)

  const reveal: Reveal = (initial, delay = 0) => {
    if (reduced) return {}
    return {
      initial: { opacity: 0, x: 0, y: 0, ...initial },
      whileInView: { opacity: 1, x: 0, y: 0, scale: 1 },
      viewport: { once: true, margin: '-15%' },
      transition: { ...SPRING, delay },
    }
  }

  return (
    <section
      aria-labelledby="field-heading"
      style={{
        background: T.bg,
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{LOCAL_STYLES}</style>
      <SectionShell />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(56px, 8vw, 96px) 24px',
          boxSizing: 'border-box',
        }}
      >
        <div className="yw-field-grid">
          <CopyColumn reveal={reveal} reduced={reduced} />
          <PhoneDevice reveal={reveal} reduced={reduced} mobile={mobile} />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section shell — glow stack + vignette + grain                       */
/* ------------------------------------------------------------------ */

function SectionShell() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background:
            'radial-gradient(620px 460px at 86% 8%, rgba(42,209,106,0.12), transparent 62%),' +
            'radial-gradient(540px 480px at 8% 36%, rgba(5,168,69,0.09), transparent 64%),' +
            'radial-gradient(560px 520px at 94% 88%, rgba(232,93,4,0.06), transparent 62%),' +
            'radial-gradient(600px 560px at 14% 100%, rgba(124,58,237,0.06), transparent 64%)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background:
            'radial-gradient(120% 80% at 50% 38%, transparent 58%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      <svg
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.04,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <filter id="yw-field-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#yw-field-grain)" />
      </svg>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Copy column                                                         */
/* ------------------------------------------------------------------ */

function CopyColumn({ reveal, reduced }: { reveal: Reveal; reduced: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      {/* Kicker */}
      <motion.span
        {...reveal({ y: 12 }, 0)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 13px',
          borderRadius: 999,
          border: '1px solid rgba(93,255,160,0.28)',
          background: 'rgba(6,20,12,0.40)',
        }}
      >
        <LiveDot reduced={reduced} size={7} />
        <span
          style={{
            fontFamily: T.fontMono,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: T.neon,
            textShadow: '0 0 10px rgba(93,255,160,0.45)',
          }}
        >
          Field Mode
        </span>
      </motion.span>

      {/* H2 */}
      <motion.h2
        id="field-heading"
        {...reveal({ y: 18 }, 0.08)}
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 800,
          fontSize: 'clamp(28px, 4.4vw, 44px)',
          letterSpacing: '-0.025em',
          color: T.h,
          lineHeight: 1.08,
          margin: '20px 0 0 0',
        }}
      >
        Your crew&rsquo;s whole day. One{' '}
        <span
          style={{
            background: 'linear-gradient(120deg,#5dffa0,#2ad16a)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
          }}
        >
          thumb
        </span>
        .
      </motion.h2>

      {/* Sub */}
      <motion.p
        {...reveal({ y: 14 }, 0.16)}
        style={{
          fontFamily: T.fontBody,
          fontWeight: 400,
          fontSize: 'clamp(15px, 1.6vw, 17px)',
          color: T.muted,
          lineHeight: 1.6,
          maxWidth: 520,
          margin: '18px 0 0',
        }}
      >
        <span style={{ color: T.body, fontWeight: 500 }}>
          &ldquo;My guys won&rsquo;t use new software.&rdquo;
        </span>{' '}
        They will &mdash; because there&rsquo;s nothing to learn. One screen shows the
        job, the timer, the route, and the voice note. They tap once and work.
      </motion.p>

      {/* Feature list */}
      <motion.ul
        {...reveal({ y: 14 }, 0.24)}
        style={{
          listStyle: 'none',
          margin: '26px 0 0',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: 520,
        }}
      >
        {BULLETS.map((b) => (
          <FeatureRow key={b.label} bullet={b} />
        ))}
      </motion.ul>

      {/* Offline caption */}
      <motion.div
        {...reveal({ y: 12 }, 0.32)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 26,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: T.greenBright,
            boxShadow: '0 0 8px rgba(42,209,106,0.7)',
            flexShrink: 0,
          }}
        />
        <span style={{ ...monoMicro(T.faint, 9.5), letterSpacing: '0.2em' }}>
          Works offline · Syncs when back in range
        </span>
      </motion.div>
    </div>
  )
}

function FeatureRow({ bullet }: { bullet: Bullet }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 9,
          background: 'rgba(42,209,106,0.10)',
          border: '1px solid rgba(42,209,106,0.28)',
          flexShrink: 0,
          marginTop: 1,
          boxShadow: '0 0 14px rgba(42,209,106,0.18)',
        }}
      >
        <IconCheck size={13} color={T.neon} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 700,
            fontSize: 15,
            color: T.h,
            lineHeight: 1.3,
          }}
        >
          {bullet.label}
        </div>
        <div
          style={{
            fontFamily: T.fontBody,
            fontSize: 13,
            color: T.muted,
            lineHeight: 1.5,
            marginTop: 2,
          }}
        >
          {bullet.detail}
        </div>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Phone device                                                        */
/* ------------------------------------------------------------------ */

function PhoneDevice({
  reveal,
  reduced,
  mobile,
}: {
  reveal: Reveal
  reduced: boolean
  mobile: boolean
}) {
  const entrance: Record<string, unknown> = reduced
    ? {}
    : {
        initial: mobile
          ? { opacity: 0, y: 40 }
          : { opacity: 0, x: 40, rotateY: -20 },
        whileInView: { opacity: 1, x: 0, y: 0, rotateY: mobile ? 0 : -12 },
        viewport: { once: true, margin: '-15%' },
        transition: { ...SPRING, delay: 0.1 },
      }

  const hover: Record<string, unknown> =
    reduced || mobile ? {} : { whileHover: { y: -6, transition: SPRING } }

  return (
    <div className="yw-field-phone-wrap" style={{ position: 'relative', minWidth: 0 }}>
      {/* floor glow ellipse */}
      {!mobile && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -30,
            width: '76%',
            height: 90,
            transform: 'translateX(-50%)',
            background:
              'radial-gradient(50% 100% at 50% 50%, rgba(42,209,106,0.28), transparent 72%)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      <motion.div
        className="yw-field-phone"
        {...entrance}
        {...hover}
        style={{
          position: 'relative',
          zIndex: 1,
          width: 'clamp(280px, 86vw, 360px)',
          maxWidth: 360,
          aspectRatio: '480 / 960',
          borderRadius: 44,
          padding: 10,
          background: '#050506',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow:
            '0 40px 90px -30px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)',
          transformStyle: 'preserve-3d',
        }}
      >
        <PhoneScreen reveal={reveal} reduced={reduced} />
      </motion.div>
    </div>
  )
}

function PhoneScreen({ reveal, reduced }: { reveal: Reveal; reduced: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: 36,
        overflow: 'hidden',
        isolation: 'isolate',
        background:
          'radial-gradient(78% 32% at 78% 6%, rgba(42,209,106,0.14), transparent 60%),' +
          'radial-gradient(70% 34% at 12% 30%, rgba(5,168,69,0.10), transparent 62%),' +
          'radial-gradient(66% 38% at 90% 78%, rgba(232,93,4,0.07), transparent 60%),' +
          'radial-gradient(74% 44% at 18% 96%, rgba(124,58,237,0.06), transparent 62%),' +
          'linear-gradient(170deg, #09090b 0%, #060607 55%, #050506 100%)',
        fontFamily: T.fontBody,
        color: T.body,
      }}
    >
      {/* content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          height: '100%',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          containerType: 'inline-size',
        }}
      >
        <StatusBar />
        <FieldHeader reduced={reduced} />

        <motion.div {...reveal({ y: 14 }, 0.15)}>
          <CurrentJobCard job={currentJob} />
        </motion.div>

        <motion.div {...reveal({ y: 14 }, 0.28)}>
          <LiveEarCard ear={liveEar} reduced={reduced} />
        </motion.div>

        <motion.div {...reveal({ y: 14 }, 0.4)}>
          <PhotoRow photos={photos} />
        </motion.div>

        <motion.div {...reveal({ y: 14 }, 0.52)}>
          <NextStops stops={nextStops} />
        </motion.div>

        <TabBar />
      </div>

      {/* screen vignette */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 60,
          background:
            'radial-gradient(120% 80% at 50% 42%, transparent 56%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      {/* screen grain */}
      <svg
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.035,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          zIndex: 61,
        }}
      >
        <filter id="yw-screen-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves={2}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#yw-screen-grain)" />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Status bar                                                          */
/* ------------------------------------------------------------------ */

function StatusBar() {
  return (
    <div
      style={{
        height: 42,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: T.fontMono,
        fontSize: 12,
        fontWeight: 700,
        color: T.h,
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
    >
      <span>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* signal */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx="1" fill="#fafafa" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="1" fill="#fafafa" />
          <rect x="9" y="3" width="3" height="9" rx="1" fill="#fafafa" />
          <rect x="13.5" y="0.5" width="3" height="11.5" rx="1" fill="#fafafa" />
        </svg>
        {/* wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
          <path
            d="M8 11.2 8.01 11.2"
            stroke="#fafafa"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M4.6 8a4.8 4.8 0 0 1 6.8 0"
            stroke="#fafafa"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M2 5.2a8.4 8.4 0 0 1 12 0"
            stroke="#fafafa"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {/* battery */}
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none" aria-hidden="true">
          <rect
            x="0.6"
            y="0.6"
            width="22"
            height="10.8"
            rx="2.6"
            stroke="#fafafa"
            strokeOpacity="0.5"
            strokeWidth="1.1"
          />
          <rect x="2.2" y="2.2" width="16" height="7.6" rx="1.4" fill="#2ad16a" />
          <rect
            x="24"
            y="3.6"
            width="1.8"
            height="4.8"
            rx="0.9"
            fill="#fafafa"
            fillOpacity="0.5"
          />
        </svg>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Field header                                                        */
/* ------------------------------------------------------------------ */

function FieldHeader({ reduced }: { reduced: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 0 14px',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            flexShrink: 0,
            background:
              'linear-gradient(150deg, rgba(42,209,106,0.22), rgba(5,168,69,0.08))',
            border: '1px solid rgba(93,255,160,0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 22px rgba(42,209,106,0.30)',
          }}
        >
          <IconLeaf size={19} />
        </div>
        <div style={{ lineHeight: 1.1, minWidth: 0 }}>
          <div
            style={{
              margin: 0,
              fontFamily: T.fontDisplay,
              fontWeight: 800,
              fontSize: 17,
              color: T.h,
              letterSpacing: '-0.01em',
            }}
          >
            Field Mode
          </div>
          <div style={{ ...monoMicro(T.faint, 9.5), marginTop: 2 }}>
            3 stops left · crew&nbsp;A
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '7px 12px',
          borderRadius: 999,
          background: 'rgba(42,209,106,0.10)',
          border: '1px solid rgba(42,209,106,0.28)',
          fontFamily: T.fontMono,
          fontSize: 10,
          fontWeight: 700,
          color: T.neon,
          letterSpacing: '0.12em',
          flexShrink: 0,
        }}
      >
        <LiveDot reduced={reduced} size={8} />
        LIVE
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Current job card                                                    */
/* ------------------------------------------------------------------ */

function CurrentJobCard({ job }: { job: CurrentJob }) {
  return (
    <div
      style={{
        ...cardBase,
        padding: 16,
        background:
          'radial-gradient(280px 160px at 88% -10%, rgba(42,209,106,0.14), transparent 70%),' +
          'rgba(255,255,255,0.045)',
        boxShadow:
          '0 16px 40px -20px rgba(5,168,69,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={monoMicro(T.greenBright, 9.5)}>Current Job · {job.ref}</div>
          <div
            style={{
              margin: '7px 0 1px',
              fontFamily: T.fontDisplay,
              fontWeight: 800,
              fontSize: 22,
              color: T.h,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            {job.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: T.muted,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <IconPin size={12} color={T.muted} />
            {job.address}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 9px',
            borderRadius: 999,
            background: 'rgba(232,93,4,0.12)',
            border: '1px solid rgba(249,115,22,0.3)',
            color: '#ffb27a',
            fontFamily: T.fontMono,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
        >
          <IconClock size={11} color="#ffb27a" />
          {job.status}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          margin: '13px 0 15px',
          flexWrap: 'wrap',
        }}
      >
        {job.chips.map((chip) => (
          <div
            key={chip.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 11px',
              borderRadius: 10,
              background: 'rgba(42,209,106,0.09)',
              border: '1px solid rgba(42,209,106,0.22)',
              color: '#c7f7d9',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {chipIcon(chip.id)}
            {chip.label}
          </div>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={`Clock out — ${job.timer}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault()
          }
        }}
        style={{
          width: '100%',
          border: 'none',
          padding: '15px 18px',
          borderRadius: 15,
          background: 'linear-gradient(135deg, #2ad16a 0%, #05a845 55%, #047a32 100%)',
          boxShadow:
            '0 0 30px rgba(42,209,106,0.5), 0 10px 26px -10px rgba(5,168,69,0.7), inset 0 1px 0 rgba(255,255,255,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: T.ink,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '2.5px solid rgba(4,21,11,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: T.ink,
              }}
            />
          </span>
          <span
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '0.04em',
            }}
          >
            CLOCK OUT
          </span>
        </span>
        <span
          style={{
            fontFamily: T.fontMono,
            fontWeight: 700,
            fontSize: 22,
            color: T.ink,
            letterSpacing: '0.02em',
          }}
        >
          {job.timer}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Live Ear card                                                       */
/* ------------------------------------------------------------------ */

const WAVE_BARS: { x: number; y: number; h: number; peak: boolean }[] = [
  { x: 0, y: 11, h: 8, peak: false },
  { x: 7, y: 7, h: 16, peak: false },
  { x: 14, y: 2, h: 26, peak: true },
  { x: 21, y: 9, h: 12, peak: false },
  { x: 28, y: 13, h: 4, peak: false },
  { x: 35, y: 5, h: 20, peak: false },
  { x: 42, y: 1, h: 28, peak: true },
  { x: 49, y: 10, h: 10, peak: false },
  { x: 56, y: 12, h: 6, peak: false },
  { x: 63, y: 6, h: 18, peak: false },
  { x: 70, y: 3, h: 24, peak: false },
  { x: 77, y: 11, h: 8, peak: false },
  { x: 84, y: 8, h: 14, peak: false },
  { x: 91, y: 13, h: 4, peak: false },
  { x: 98, y: 4, h: 22, peak: true },
  { x: 105, y: 9, h: 12, peak: false },
  { x: 112, y: 12, h: 6, peak: false },
  { x: 119, y: 6, h: 18, peak: false },
  { x: 126, y: 2, h: 26, peak: false },
  { x: 133, y: 11, h: 8, peak: false },
  { x: 140, y: 8, h: 14, peak: false },
  { x: 147, y: 13, h: 4, peak: false },
  { x: 154, y: 5, h: 20, peak: false },
  { x: 161, y: 1, h: 28, peak: true },
  { x: 168, y: 10, h: 10, peak: false },
  { x: 175, y: 12, h: 6, peak: false },
  { x: 182, y: 7, h: 16, peak: false },
  { x: 189, y: 3, h: 24, peak: false },
  { x: 196, y: 11, h: 8, peak: false },
  { x: 203, y: 9, h: 12, peak: false },
  { x: 210, y: 13, h: 4, peak: false },
  { x: 217, y: 4, h: 22, peak: true },
  { x: 224, y: 8, h: 14, peak: false },
  { x: 231, y: 12, h: 6, peak: false },
  { x: 238, y: 6, h: 18, peak: false },
  { x: 245, y: 2, h: 26, peak: false },
  { x: 252, y: 11, h: 8, peak: false },
  { x: 259, y: 9, h: 12, peak: false },
  { x: 266, y: 13, h: 4, peak: false },
  { x: 273, y: 5, h: 20, peak: false },
  { x: 280, y: 1, h: 28, peak: true },
  { x: 287, y: 10, h: 10, peak: false },
  { x: 294, y: 12, h: 6, peak: false },
  { x: 301, y: 7, h: 16, peak: false },
  { x: 308, y: 4, h: 22, peak: false },
  { x: 315, y: 11, h: 8, peak: false },
  { x: 322, y: 9, h: 12, peak: false },
  { x: 329, y: 13, h: 4, peak: false },
  { x: 336, y: 5, h: 20, peak: true },
  { x: 343, y: 10, h: 10, peak: false },
  { x: 350, y: 12, h: 6, peak: false },
  { x: 357, y: 7, h: 16, peak: false },
  { x: 364, y: 11, h: 8, peak: false },
  { x: 371, y: 13, h: 4, peak: false },
  { x: 378, y: 9, h: 12, peak: false },
  { x: 385, y: 12, h: 6, peak: false },
]

function LiveEarCard({ ear, reduced }: { ear: LiveEar; reduced: boolean }) {
  return (
    <div
      style={{
        ...cardBase,
        marginTop: 13,
        padding: '14px 15px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              flexShrink: 0,
              background: 'rgba(42,209,106,0.12)',
              border: '1px solid rgba(42,209,106,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(42,209,106,0.35)',
            }}
          >
            <IconMic size={16} color={T.neon} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={monoMicro(T.greenBright, 9.5)}>Live Ear</div>
            <div
              style={{
                fontFamily: T.fontDisplay,
                fontWeight: 800,
                fontSize: 14,
                color: T.h,
                marginTop: 1,
              }}
            >
              Voice Notes
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: T.fontMono,
            fontSize: 9,
            fontWeight: 700,
            color: T.neon,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          <LiveDot reduced={reduced} size={8} />
          LISTENING
        </div>
      </div>

      {/* waveform */}
      <div
        style={{
          margin: '12px 0',
          height: 42,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 11,
          padding: '0 12px',
          background:
            'linear-gradient(90deg, rgba(42,209,106,0.05), rgba(42,209,106,0.02))',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <svg
          width="100%"
          height="30"
          viewBox="0 0 392 30"
          preserveAspectRatio="none"
          aria-hidden
        >
          <g>
            {WAVE_BARS.map((b, i) => (
              <rect
                key={i}
                className={reduced ? undefined : 'yw-wave-bar'}
                x={b.x}
                y={b.y}
                width={3}
                height={b.h}
                rx={1.5}
                fill={b.peak ? T.neon : T.greenBright}
                style={
                  reduced
                    ? undefined
                    : { animationDelay: `${(i % 9) * 0.12}s` }
                }
              />
            ))}
          </g>
        </svg>
      </div>

      <div
        style={{
          fontSize: 13.5,
          lineHeight: 1.45,
          color: '#e8e8ec',
          fontWeight: 500,
        }}
      >
        <span style={{ color: T.greenBright }}>&ldquo;</span>
        {ear.transcript}
        <span style={{ color: T.greenBright }}>&rdquo;</span>
      </div>

      {ear.saved && (
        <div
          style={{
            marginTop: 11,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 999,
            background: 'rgba(42,209,106,0.1)',
            border: '1px solid rgba(42,209,106,0.28)',
            color: '#c7f7d9',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <IconCheck size={13} color={T.neon} />
          Saved to job
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Photo row                                                           */
/* ------------------------------------------------------------------ */

function PhotoRow({ photos }: { photos: Photo[] }) {
  return (
    <div style={{ marginTop: 13 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 9,
        }}
      >
        <span style={monoMicro(T.faint, 9.5)}>Site Photos</span>
        <span
          style={{ fontFamily: T.fontMono, fontSize: 10, color: T.faint }}
        >
          2 captured
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
        }}
      >
        {photos.map((photo, i) =>
          photo.kind === 'thumb' ? (
            <div
              key={i}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 14,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                background: `linear-gradient(150deg, ${photo.grad[0]}, ${photo.grad[1]} 58%, ${photo.grad[2]})`,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 8,
                  bottom: 7,
                  fontFamily: T.fontMono,
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.9)',
                  letterSpacing: '0.08em',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}
              >
                {photo.label}
              </span>
            </div>
          ) : (
            <div
              key={i}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.04)',
                border: '1px dashed rgba(42,209,106,0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: T.greenBright,
              }}
            >
              <IconCamera size={22} color={T.greenBright} />
              <span
                style={{
                  fontFamily: T.fontMono,
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                }}
              >
                CAPTURE
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Next stops                                                          */
/* ------------------------------------------------------------------ */

function NextStops({ stops }: { stops: Stop[] }) {
  return (
    <div style={{ ...cardBase, marginTop: 13, padding: '13px 15px 6px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span style={monoMicro(T.faint, 9.5)}>Next Stops</span>
        <span
          style={{ fontFamily: T.fontMono, fontSize: 10, color: T.faint }}
        >
          2 of 3 remaining
        </span>
      </div>
      {stops.map((stop, i) => (
        <div
          key={stop.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            padding: '9px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${T.hair}`,
          }}
        >
          <span
            style={{
              fontFamily: T.fontMono,
              fontWeight: 700,
              fontSize: 13,
              color: T.h,
              width: 52,
              flexShrink: 0,
            }}
          >
            {stop.time}
            <span style={{ fontSize: 8.5, color: T.faint, marginLeft: 1 }}>
              {stop.ampm}
            </span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: T.h,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {stop.client}
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.muted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {stop.services}
            </div>
          </div>
          <span
            style={{
              flexShrink: 0,
              textAlign: 'right',
              fontFamily: T.fontMono,
              fontSize: 11,
              color: T.greenBright,
              fontWeight: 700,
            }}
          >
            {stop.distance}
            <span
              style={{
                display: 'block',
                fontSize: 8,
                color: T.faint,
                letterSpacing: '0.12em',
              }}
            >
              {stop.unit}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tab bar                                                             */
/* ------------------------------------------------------------------ */

function TabBar() {
  return (
    <div
      style={{
        marginTop: 'auto',
        height: 76,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-around',
        paddingTop: 12,
        borderTop: `1px solid ${T.hair}`,
        background:
          'linear-gradient(0deg, rgba(5,5,6,0.9), rgba(5,5,6,0.2))',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const active = !!tab.active
        return (
          <div
            key={tab.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              width: 64,
              color: active ? T.neon : T.faint,
            }}
          >
            <span
              style={{
                position: 'relative',
                display: 'inline-flex',
                filter: active
                  ? 'drop-shadow(0 0 8px rgba(93,255,160,0.7))'
                  : 'none',
              }}
            >
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: T.neon,
                    boxShadow: '0 0 8px rgba(93,255,160,0.9)',
                  }}
                />
              )}
              {tabIcon(tab.id, active)}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              {tab.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
