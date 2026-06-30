import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
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
  h: '#fafafa',
  body: '#d4d4d8',
  muted: '#a1a1aa',
  faint: '#71717a',
  card: 'rgba(255,255,255,0.04)',
  cardHi: 'rgba(255,255,255,0.055)',
  bd: 'rgba(255,255,255,0.08)',
  hair: 'rgba(255,255,255,0.07)',
  fontDisplay: "'Outfit', sans-serif",
  fontBody: "'Inter', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
} as const

const SPRING = { type: 'spring', stiffness: 320, damping: 28 } as const

/* ------------------------------------------------------------------ */
/* Seed data (verbatim from the spec / mockup)                         */
/* ------------------------------------------------------------------ */

type Presence = 'online' | 'active' | 'offline'

interface Conversation {
  id: string
  initials: string
  avatar: [string, string]
  name: string
  time: string
  preview: string
  unread: boolean
  presence: Presence
  aiTag?: boolean
  active?: boolean
}

const CONVERSATIONS: Conversation[] = [
  {
    id: 'mj',
    initials: 'MJ',
    avatar: ['#E85D04', '#f97316'],
    name: 'Marcus Johnson',
    time: '9:41a',
    preview: 'Can you guys come Thursday instead?',
    unread: true,
    presence: 'online',
    active: true,
  },
  {
    id: 'dr',
    initials: 'DR',
    avatar: ['#0ea5e9', '#3b82f6'],
    name: 'Diana Reyes',
    time: '9:18a',
    preview: 'Perfect, thank you! The yard looks…',
    unread: true,
    presence: 'offline',
  },
  {
    id: 't2',
    initials: 'TC',
    avatar: ['#8b5cf6', '#a855f7'],
    name: 'Crew · Truck 2',
    time: '8:52a',
    preview: 'Reassigned Oakridge to Luis',
    unread: true,
    presence: 'active',
    aiTag: true,
  },
  {
    id: 'sp',
    initials: 'SP',
    avatar: ['#05a845', '#047a32'],
    name: 'Sandra Pope',
    time: 'Yest',
    preview: 'Got it — see you next week 👍',
    unread: false,
    presence: 'offline',
  },
  {
    id: 'kb',
    initials: 'KB',
    avatar: ['#f43f5e', '#fb7185'],
    name: 'Kevin Barnett · Lead',
    time: 'Yest',
    preview: 'Looking for a quote on weekly mowing',
    unread: true,
    presence: 'active',
  },
  {
    id: 'al',
    initials: 'AL',
    avatar: ['#14b8a6', '#22d3ee'],
    name: 'Aaron Liu',
    time: 'Mon',
    preview: 'Can I add hedge trimming too?',
    unread: false,
    presence: 'offline',
  },
]

type FilterId = 'clients' | 'crews' | 'leads' | 'reviews'

interface Filter {
  id: FilterId
  label: string
  count: number
}

const FILTERS: Filter[] = [
  { id: 'clients', label: 'Clients', count: 3 },
  { id: 'crews', label: 'Crews', count: 1 },
  { id: 'leads', label: 'Leads', count: 5 },
  { id: 'reviews', label: 'Reviews', count: 0 },
]

interface Message {
  id: string
  dir: 'in' | 'out'
  text: string
  meta: string
}

const MSG_IN: Message = {
  id: 'm1',
  dir: 'in',
  text: 'Can you guys come Thursday instead? Something came up Wednesday.',
  meta: '9:38 AM · DELIVERED',
}

const MSG_OUT: Message = {
  id: 'm2',
  dir: 'out',
  text: "No problem at all — moving you to Thursday. I'll text a confirmation shortly.",
  meta: '9:40 AM · DELIVERED',
}

interface DraftData {
  chip: string
  parts: string[]
  highlight: boolean[]
}

const DRAFT: DraftData = {
  chip: 'Cutty drafted this',
  parts: [
    'Absolutely — booked you ',
    'Thu 9:00 AM',
    '. Total holds at ',
    '$365',
    '. Want me to send the invoice now?',
  ],
  highlight: [false, true, false, true, false],
}

const CUSTOMER = {
  initials: 'MJ',
  name: 'Marcus Johnson',
  address: '412 Briarwood Ln, Asheville NC',
  ltv: '$2,140',
  jobs: '4',
} as const

const LINKED_JOB = {
  title: 'Lawn + Edge · Full Yard',
  sub: 'Thu Jul 2 · 9:00 AM · Luis G.',
  amount: '$365',
  status: 'RESCHEDULED',
} as const

interface Suggestion {
  id: string
  title: string
  sub: string
  add?: string
  arrow?: boolean
}

const SUGGESTIONS: Suggestion[] = [
  {
    id: 'aerate',
    title: 'Upsell seasonal aeration',
    sub: 'Soil due · last done 14 mo ago',
    add: '+$85',
  },
  {
    id: 'review',
    title: 'Ask for a review',
    sub: 'Happy client · 4 jobs, 0 reviews',
    arrow: true,
  },
]

const PROOF = [
  { label: 'AVG REPLY TIME', value: '< 8 sec' },
  { label: 'CHANNELS', value: 'SMS · Portal · Reviews' },
  { label: 'DRAFTED TODAY', value: '24 replies' },
] as const

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
/* Icons (lucide-style hand-rolled SVGs)                               */
/* ------------------------------------------------------------------ */

interface IconProps {
  size?: number
  color?: string
}

function svgProps(size: number, color: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

function IconUsers({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconTruck({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h2" />
      <path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  )
}

function IconBolt({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </svg>
  )
}

function IconStar({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2Z" />
    </svg>
  )
}

function IconSend({ size = 15, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  )
}

function IconCheck({ size = 13, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function IconPin({ size = 13, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function IconSparkle({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </svg>
  )
}

function IconArrowUp({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}

function IconArrowRight({ size = 14, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}

function IconPhone({ size = 13, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  )
}

function IconDots({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
      <circle cx="5" cy="12" r="1.4" />
    </svg>
  )
}

function IconClip({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg {...svgProps(size, color)}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function filterIcon(id: FilterId, color: string) {
  if (id === 'clients') return <IconUsers size={14} color={color} />
  if (id === 'crews') return <IconTruck size={14} color={color} />
  if (id === 'leads') return <IconBolt size={14} color={color} />
  return <IconStar size={14} color={color} />
}

/* ------------------------------------------------------------------ */
/* Small style atoms                                                   */
/* ------------------------------------------------------------------ */

function monoLabel(color: string, size = 9.5): CSSProperties {
  return {
    fontFamily: T.fontMono,
    fontSize: `${size}px`,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color,
  }
}

const presenceColor: Record<Presence, string> = {
  online: T.neon,
  active: T.greenBright,
  offline: T.faint,
}

function Avatar({
  initials,
  avatar,
  presence,
  size = 36,
}: {
  initials: string
  avatar: [string, string]
  presence: Presence
  size?: number
}) {
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `linear-gradient(150deg, ${avatar[0]}, ${avatar[1]})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: T.fontDisplay,
          fontWeight: 800,
          fontSize: size * 0.36,
          color: '#fff',
          letterSpacing: '0.01em',
        }}
      >
        {initials}
      </div>
      <span
        style={{
          position: 'absolute',
          right: -1,
          bottom: -1,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: presenceColor[presence],
          border: '2px solid #0b0b0d',
          boxShadow:
            presence === 'online'
              ? `0 0 8px ${T.neon}`
              : 'none',
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main section                                                        */
/* ------------------------------------------------------------------ */

export default function Channels() {
  const reduced = useReducedMotion()
  const narrow = useIsNarrow(980) // < 980 → drop right context
  const mobile = useIsNarrow(640) // < 640 → thread only

  const showContext = !narrow
  const showRail = !mobile

  // Reveal helper — when reduced, render statically (no motion props).
  const reveal = (
    initial: CSSProperties,
    delay = 0
  ): Record<string, unknown> => {
    if (reduced) return {}
    return {
      initial: { opacity: 0, ...initial },
      whileInView: { opacity: 1, x: 0, y: 0, scale: 1 },
      viewport: { once: true, margin: '-15% 0px' },
      transition: { ...SPRING, delay },
    }
  }

  const gridColumns = showContext
    ? '320px 1fr 300px'
    : showRail
      ? '300px 1fr'
      : '1fr'

  return (
    <section
      aria-labelledby="channels-heading"
      style={{
        background: T.bg,
        width: '100%',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '80px 24px',
          boxSizing: 'border-box',
        }}
      >
        <CopyHeader reveal={reveal} reduced={reduced} />

        <motion.div
          {...reveal({ y: 30, scale: 0.985 }, 0.1)}
          style={{
            position: 'relative',
            marginTop: 48,
            borderRadius: mobile ? 18 : 24,
            border: `1px solid ${T.bd}`,
            background:
              'radial-gradient(60% 50% at 17% 6%, rgba(45,209,106,0.16), transparent 70%),' +
              'radial-gradient(50% 40% at 50% 0%, rgba(93,255,160,0.10), transparent 75%),' +
              'radial-gradient(40% 40% at 96% 4%, rgba(232,93,4,0.12), transparent 70%),' +
              'radial-gradient(60% 60% at 50% 110%, rgba(124,58,237,0.14), transparent 70%),' +
              'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow:
              '0 40px 120px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          <FrameGrain />
          <FrameVignette />

          <div style={{ position: 'relative', zIndex: 2, padding: mobile ? 14 : 18 }}>
            <FrameTopBar reduced={reduced} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                gap: 16,
                marginTop: 14,
                alignItems: 'stretch',
              }}
            >
              {showRail && <LeftRail />}
              <CenterThread reveal={reveal} reduced={reduced} mobile={mobile} />
              {showContext && <RightContext />}
            </div>
          </div>
        </motion.div>

        <ProofRow reveal={reveal} mobile={mobile} />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Copy header                                                         */
/* ------------------------------------------------------------------ */

type Reveal = (initial: CSSProperties, delay?: number) => Record<string, unknown>

function CopyHeader({ reveal, reduced }: { reveal: Reveal; reduced: boolean }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
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
          Cutty · Live in the Yard
        </span>
      </motion.span>

      <motion.h2
        id="channels-heading"
        {...reveal({ y: 18 }, 0.08)}
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 800,
          fontSize: 'clamp(28px, 4vw, 42px)',
          letterSpacing: '-0.025em',
          color: T.h,
          lineHeight: 1.12,
          margin: '20px 0 0 0',
        }}
      >
        One inbox. Cutty drafts the reply, you tap{' '}
        <span
          style={{
            background: 'linear-gradient(120deg,#5dffa0,#2ad16a)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
          }}
        >
          Send
        </span>
        .
      </motion.h2>

      <motion.p
        {...reveal({ y: 14 }, 0.16)}
        style={{
          fontFamily: T.fontBody,
          fontWeight: 400,
          fontSize: 'clamp(14px, 1.6vw, 17px)',
          color: T.muted,
          lineHeight: 1.6,
          maxWidth: 640,
          margin: '16px auto 0',
        }}
      >
        Every client, crew, and lead — SMS, client portal, and reviews — lands in one
        thread. Cutty reads the context and writes the reply. You just say go.
      </motion.p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Live dot                                                            */
/* ------------------------------------------------------------------ */

function LiveDot({ reduced, size = 7 }: { reduced: boolean; size?: number }) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: T.neon,
    boxShadow: `0 0 8px ${T.neon}, 0 0 14px rgba(93,255,160,0.5)`,
    flexShrink: 0,
  }
  if (reduced) return <span style={base} />
  return (
    <motion.span
      style={base}
      animate={{ scale: [1, 1.25, 1], opacity: [1, 0.6, 1] }}
      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Frame overlays                                                      */
/* ------------------------------------------------------------------ */

function FrameGrain() {
  return (
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
      <filter id="channels-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#channels-grain)" />
    </svg>
  )
}

function FrameVignette() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        background:
          'radial-gradient(120% 100% at 50% 0%, transparent 55%, rgba(0,0,0,0.45) 100%)',
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Frame top bar                                                       */
/* ------------------------------------------------------------------ */

function FrameTopBar({ reduced }: { reduced: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 14,
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 9px',
            borderRadius: 999,
            border: '1px solid rgba(45,209,106,0.3)',
            background: 'rgba(45,209,106,0.10)',
          }}
        >
          <LiveDot reduced={reduced} size={6} />
          <span style={monoLabel(T.greenBright, 9)}>Live</span>
        </span>
        <span style={monoLabel(T.faint, 9.5)}>Inbox · 9 Unread</span>
      </div>
      <span style={{ display: 'inline-flex', color: T.faint }}>
        <IconDots size={16} color={T.faint} />
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Left rail                                                           */
/* ------------------------------------------------------------------ */

const panelStyle: CSSProperties = {
  background: T.card,
  border: `1px solid ${T.bd}`,
  borderRadius: 20,
}

function LeftRail() {
  return (
    <div style={{ ...panelStyle, padding: 12, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {FILTERS.map((f) => (
          <FilterChip key={f.id} filter={f} active={f.id === 'clients'} />
        ))}
      </div>

      <AutopilotCard />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        {CONVERSATIONS.map((c) => (
          <ConversationRow key={c.id} c={c} />
        ))}
      </div>
    </div>
  )
}

function FilterChip({ filter, active }: { filter: Filter; active: boolean }) {
  const dim = filter.count === 0
  const iconColor = active ? T.greenBright : T.faint
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 9px',
        borderRadius: 11,
        background: active ? 'rgba(45,209,106,0.08)' : 'rgba(255,255,255,0.02)',
        border: active ? '1px solid rgba(45,209,106,0.2)' : `1px solid ${T.bd}`,
        minWidth: 0,
      }}
    >
      {filterIcon(filter.id, iconColor)}
      <span
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 700,
          fontSize: 11.5,
          color: active ? T.h : T.muted,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}
      >
        {filter.label}
      </span>
      <span
        style={{
          fontFamily: T.fontMono,
          fontWeight: 700,
          fontSize: 9,
          lineHeight: 1,
          padding: '3px 6px',
          borderRadius: 999,
          color: dim ? T.muted : '#042312',
          background: dim
            ? 'rgba(255,255,255,0.07)'
            : 'linear-gradient(135deg,#2ad16a,#05a845)',
          boxShadow: dim ? 'none' : '0 0 8px rgba(45,209,106,0.4)',
          flexShrink: 0,
        }}
      >
        {filter.count}
      </span>
    </div>
  )
}

function AutopilotCard() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 14,
        background:
          'linear-gradient(135deg,rgba(45,209,106,0.12),rgba(5,122,50,0.05))',
        border: '1px solid rgba(45,209,106,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <span style={{ display: 'inline-flex', color: T.greenBright, flexShrink: 0 }}>
          <IconSparkle size={15} color={T.greenBright} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 700,
              fontSize: 12,
              color: T.h,
              lineHeight: 1.2,
            }}
          >
            Autopilot
          </div>
          <div style={{ ...monoLabel(T.faint, 8), letterSpacing: '0.14em', marginTop: 2 }}>
            Drafting replies
          </div>
        </div>
      </div>
      <div
        aria-label="Autopilot on"
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: 'linear-gradient(180deg,#5dffa0,#2ad16a)',
          boxShadow: '0 0 12px rgba(45,209,106,0.45)',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#042312',
          }}
        />
      </div>
    </div>
  )
}

function ConversationRow({ c }: { c: Conversation }) {
  const baseBg = c.active ? 'rgba(45,209,106,0.07)' : 'transparent'
  const baseBorder = c.active
    ? '1px solid rgba(45,209,106,0.22)'
    : '1px solid transparent'
  const hover = { backgroundColor: 'rgba(255,255,255,0.04)' }
  return (
    <motion.div
      whileHover={hover}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 9px',
        borderRadius: 12,
        background: baseBg,
        border: baseBorder,
        cursor: 'pointer',
        minWidth: 0,
      }}
    >
      <Avatar initials={c.initials} avatar={c.avatar} presence={c.presence} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 700,
              fontSize: 12.5,
              color: c.active ? T.h : '#e4e4e7',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            {c.name}
          </span>
          <span
            style={{
              fontFamily: T.fontMono,
              fontSize: 9,
              color: T.faint,
              flexShrink: 0,
            }}
          >
            {c.time}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
            minWidth: 0,
          }}
        >
          {c.aiTag && (
            <span style={{ display: 'inline-flex', color: T.greenBright, flexShrink: 0 }}>
              <IconSparkle size={11} color={T.greenBright} />
            </span>
          )}
          <span
            style={{
              fontFamily: T.fontBody,
              fontSize: 11.5,
              color: c.aiTag ? T.greenBright : c.unread ? T.body : T.muted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
              lineHeight: 1.4,
            }}
          >
            {c.preview}
          </span>
          {c.unread && !c.active && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: T.greenBright,
                boxShadow: '0 0 6px rgba(45,209,106,0.6)',
                flexShrink: 0,
              }}
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Center thread                                                       */
/* ------------------------------------------------------------------ */

function CenterThread({
  reveal,
  reduced,
  mobile,
}: {
  reveal: Reveal
  reduced: boolean
  mobile: boolean
}) {
  return (
    <div
      style={{
        ...panelStyle,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <ThreadHead mobile={mobile} />
      <div
        style={{
          flex: 1,
          padding: mobile ? '16px 14px' : '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minWidth: 0,
        }}
      >
        <DayStamp />
        <Bubble msg={MSG_IN} {...reveal({ y: 8 }, 0.35)} />
        <DraftCard reveal={reveal} reduced={reduced} />
        <Bubble msg={MSG_OUT} {...reveal({ y: 8 }, 1.0)} />
        <TypingIndicator reduced={reduced} />
      </div>
      <Composer />
    </div>
  )
}

function ThreadHead({ mobile }: { mobile: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: mobile ? '12px 14px' : '13px 18px',
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar initials="MJ" avatar={['#E85D04', '#f97316']} presence="online" size={32} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 700,
              fontSize: 13.5,
              color: T.h,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Marcus Johnson
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={monoLabel(T.greenBright, 8.5)}>SMS</span>
            <span style={{ color: T.faint, fontSize: 9 }}>·</span>
            <span style={{ ...monoLabel(T.faint, 8.5), letterSpacing: '0.14em' }}>
              Online now
            </span>
          </div>
        </div>
      </div>
      <span style={{ display: 'inline-flex', color: T.faint }}>
        <IconPhone size={15} color={T.faint} />
      </span>
    </div>
  )
}

function DayStamp() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ ...monoLabel(T.faint, 8.5), letterSpacing: '0.18em' }}>
        Today · 9:38 AM
      </span>
    </div>
  )
}

function Bubble({
  msg,
  ...motionProps
}: { msg: Message } & Record<string, unknown>) {
  const isIn = msg.dir === 'in'
  return (
    <motion.div
      {...motionProps}
      style={{
        alignSelf: isIn ? 'flex-start' : 'flex-end',
        maxWidth: '82%',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        alignItems: isIn ? 'flex-start' : 'flex-end',
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: '10px 13px',
          borderRadius: isIn ? '18px 18px 18px 6px' : '18px 18px 6px 18px',
          background: isIn
            ? 'rgba(255,255,255,0.055)'
            : 'linear-gradient(160deg,rgba(45,209,106,0.16),rgba(5,122,50,0.10))',
          border: isIn
            ? `1px solid ${T.bd}`
            : '1px solid rgba(45,209,106,0.3)',
          color: isIn ? T.body : '#eafff2',
          fontFamily: T.fontBody,
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {msg.text}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {!isIn && (
          <span style={{ display: 'inline-flex', color: T.greenBright }}>
            <IconCheck size={11} color={T.greenBright} />
          </span>
        )}
        <span style={{ ...monoLabel(T.faint, 8), letterSpacing: '0.14em' }}>
          {msg.meta}
        </span>
      </div>
    </motion.div>
  )
}

function DraftCard({ reveal, reduced }: { reveal: Reveal; reduced: boolean }) {
  const baseShadow =
    '0 0 34px rgba(45,209,106,0.28), inset 0 0 24px rgba(45,209,106,0.06)'

  const motionProps: Record<string, unknown> = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 14, scale: 0.96 },
        whileInView: {
          opacity: 1,
          y: 0,
          scale: 1,
          boxShadow: [
            baseShadow,
            '0 0 50px rgba(45,209,106,0.45), inset 0 0 24px rgba(45,209,106,0.06)',
            baseShadow,
          ],
        },
        viewport: { once: true, margin: '-15% 0px' },
        transition: {
          ...SPRING,
          delay: 0.7,
          boxShadow: { duration: 1.2, delay: 0.7, times: [0, 0.5, 1] },
        },
      }

  return (
    <motion.div
      {...motionProps}
      style={{
        alignSelf: 'flex-end',
        maxWidth: '88%',
        padding: '12px 14px 13px',
        borderRadius: 18,
        background:
          'linear-gradient(160deg,rgba(45,209,106,0.20),rgba(5,122,50,0.10)), rgba(10,20,14,0.6)',
        border: '1px solid rgba(93,255,160,0.45)',
        boxShadow: baseShadow,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          borderRadius: 999,
          background: 'rgba(93,255,160,0.14)',
          border: '1px solid rgba(93,255,160,0.4)',
          marginBottom: 9,
        }}
      >
        <IconSparkle size={11} color={T.neon} />
        <span
          style={{
            fontFamily: T.fontMono,
            fontWeight: 700,
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: T.neon,
          }}
        >
          {DRAFT.chip}
        </span>
      </div>

      <p
        style={{
          fontFamily: T.fontBody,
          fontSize: 13.5,
          lineHeight: 1.55,
          color: '#eafff2',
          margin: '0 0 12px 0',
        }}
      >
        {DRAFT.parts.map((part, i) =>
          DRAFT.highlight[i] ? (
            <b
              key={i}
              style={{
                color: T.neon,
                fontWeight: 700,
                textShadow: '0 0 10px rgba(93,255,160,0.4)',
              }}
            >
              {part}
            </b>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>

      <div style={{ display: 'flex', gap: 9 }}>
        <SendButton reduced={reduced} />
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: 11,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${T.bd}`,
            color: T.body,
            fontFamily: T.fontDisplay,
            fontWeight: 700,
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          Edit
        </button>
      </div>
    </motion.div>
  )
}

function SendButton({ reduced }: { reduced: boolean }) {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 18px',
    borderRadius: 11,
    background: 'linear-gradient(180deg,#5dffa0,#2ad16a 60%,#05a845)',
    border: 'none',
    color: '#042312',
    fontFamily: T.fontDisplay,
    fontWeight: 700,
    fontSize: 12.5,
    cursor: 'pointer',
    boxShadow:
      '0 0 18px rgba(45,209,106,0.5), inset 0 1px 0 rgba(255,255,255,0.35)',
  }
  const interactive = reduced
    ? {}
    : {
        whileHover: { scale: 1.03 },
        whileTap: { scale: 0.97 },
        transition: SPRING,
      }
  return (
    <motion.button type="button" {...interactive} style={style}>
      <IconSend size={14} color="#042312" />
      Send
    </motion.button>
  )
}

function TypingIndicator({ reduced }: { reduced: boolean }) {
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '9px 13px',
        borderRadius: '18px 18px 18px 6px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${T.bd}`,
      }}
    >
      {[0, 1, 2].map((i) => {
        const dot: CSSProperties = {
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: T.faint,
        }
        if (reduced) return <span key={i} style={dot} />
        return (
          <motion.span
            key={i}
            style={dot}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              repeat: Infinity,
              duration: 1.4,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        )
      })}
    </div>
  )
}

function Composer() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderTop: `1px solid ${T.hair}`,
      }}
    >
      <span style={{ display: 'inline-flex', color: T.faint, flexShrink: 0 }}>
        <IconClip size={16} color={T.faint} />
      </span>
      <div
        style={{
          flex: 1,
          padding: '9px 13px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${T.bd}`,
          fontFamily: T.fontBody,
          fontSize: 12.5,
          color: T.faint,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        Type a message — or let Cutty draft it…
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'linear-gradient(180deg,#5dffa0,#2ad16a 60%,#05a845)',
          boxShadow: '0 0 14px rgba(45,209,106,0.45)',
          flexShrink: 0,
        }}
      >
        <IconSend size={15} color="#042312" />
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Right context                                                       */
/* ------------------------------------------------------------------ */

const ctxCardStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.055)',
  border: `1px solid ${T.bd}`,
  borderRadius: 16,
  padding: 15,
}

function RightContext() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <CustomerCard />
      <LinkedJobCard />
      <SuggestionsCard />
    </div>
  )
}

function CustomerCard() {
  return (
    <div style={ctxCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <Avatar
          initials={CUSTOMER.initials}
          avatar={['#E85D04', '#f97316']}
          presence="online"
          size={40}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: T.fontDisplay,
              fontWeight: 700,
              fontSize: 13.5,
              color: T.h,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {CUSTOMER.name}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 3,
              color: T.muted,
            }}
          >
            <IconPin size={11} color={T.faint} />
            <span
              style={{
                fontFamily: T.fontBody,
                fontSize: 11,
                color: T.muted,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
              }}
            >
              {CUSTOMER.address}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginTop: 13,
        }}
      >
        <Stat label="Lifetime" value={CUSTOMER.ltv} valueColor={T.orangeBright} />
        <Stat label="Jobs" value={CUSTOMER.jobs} valueColor={T.h} />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor: string
}) {
  return (
    <div
      style={{
        padding: '9px 10px',
        borderRadius: 11,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${T.bd}`,
      }}
    >
      <div style={{ ...monoLabel(T.faint, 8), letterSpacing: '0.16em' }}>{label}</div>
      <div
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 800,
          fontSize: 16,
          color: valueColor,
          marginTop: 4,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function LinkedJobCard() {
  return (
    <div style={ctxCardStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 11,
        }}
      >
        <span style={monoLabel(T.faint, 9)}>Linked Job</span>
        <span
          style={{
            fontFamily: T.fontMono,
            fontWeight: 700,
            fontSize: 8.5,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: T.orangeBright,
            padding: '3px 7px',
            borderRadius: 999,
            background: 'rgba(232,93,4,0.12)',
            border: '1px solid rgba(249,115,22,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          {LINKED_JOB.status}
        </span>
      </div>
      <div
        style={{
          fontFamily: T.fontDisplay,
          fontWeight: 700,
          fontSize: 13,
          color: T.h,
          lineHeight: 1.3,
        }}
      >
        {LINKED_JOB.title}
      </div>
      <div
        style={{
          fontFamily: T.fontBody,
          fontSize: 11.5,
          color: T.muted,
          marginTop: 4,
          lineHeight: 1.4,
        }}
      >
        {LINKED_JOB.sub}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 11,
          borderTop: `1px solid ${T.hair}`,
        }}
      >
        <span style={{ ...monoLabel(T.faint, 8.5), letterSpacing: '0.16em' }}>Total</span>
        <span
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 800,
            fontSize: 17,
            color: T.orangeBright,
            lineHeight: 1,
          }}
        >
          {LINKED_JOB.amount}
        </span>
      </div>
    </div>
  )
}

function SuggestionsCard() {
  return (
    <div style={ctxCardStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 11,
        }}
      >
        <IconSparkle size={12} color={T.greenBright} />
        <span style={monoLabel(T.greenBright, 9)}>Cutty Suggests</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SUGGESTIONS.map((s) => (
          <SuggestionRow key={s.id} s={s} />
        ))}
      </div>
    </div>
  )
}

function SuggestionRow({ s }: { s: Suggestion }) {
  return (
    <motion.div
      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 11px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${T.bd}`,
        cursor: 'pointer',
        minWidth: 0,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 8,
          background: 'rgba(45,209,106,0.12)',
          border: '1px solid rgba(45,209,106,0.25)',
          color: T.greenBright,
          flexShrink: 0,
        }}
      >
        {s.add ? (
          <IconArrowUp size={13} color={T.greenBright} />
        ) : (
          <IconStar size={13} color={T.greenBright} />
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 700,
            fontSize: 12,
            color: T.h,
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {s.title}
        </div>
        <div
          style={{
            fontFamily: T.fontBody,
            fontSize: 10.5,
            color: T.muted,
            marginTop: 2,
            lineHeight: 1.35,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {s.sub}
        </div>
      </div>
      {s.add ? (
        <span
          style={{
            fontFamily: T.fontDisplay,
            fontWeight: 800,
            fontSize: 13,
            color: T.orangeBright,
            flexShrink: 0,
          }}
        >
          {s.add}
        </span>
      ) : (
        <span style={{ display: 'inline-flex', color: T.faint, flexShrink: 0 }}>
          <IconArrowRight size={14} color={T.faint} />
        </span>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Proof row                                                           */
/* ------------------------------------------------------------------ */

function ProofRow({ reveal, mobile }: { reveal: Reveal; mobile: boolean }) {
  const proofIcons: ReactNode[] = [
    <IconBolt key="b" size={14} color={T.greenBright} />,
    <IconUsers key="u" size={14} color={T.greenBright} />,
    <IconSparkle key="s" size={14} color={T.greenBright} />,
  ]
  return (
    <motion.div
      {...reveal({ y: 16 }, 0.2)}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: mobile ? 'column' : 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 28,
      }}
    >
      {PROOF.map((p, i) => (
        <div
          key={p.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 16px',
            borderRadius: 14,
            background: T.card,
            border: `1px solid ${T.bd}`,
            minWidth: 0,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 9,
              background: 'rgba(45,209,106,0.10)',
              border: '1px solid rgba(45,209,106,0.22)',
              flexShrink: 0,
            }}
          >
            {proofIcons[i]}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...monoLabel(T.faint, 8.5), letterSpacing: '0.18em' }}>
              {p.label}
            </div>
            <div
              style={{
                fontFamily: T.fontDisplay,
                fontWeight: 800,
                fontSize: 14,
                color: T.h,
                marginTop: 3,
                lineHeight: 1.1,
              }}
            >
              {p.value}
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}
