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
  card: 'rgba(255,255,255,0.04)',
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

const AGGREGATE = {
  rating: '4.9',
  reviews: '1,284',
  delta: '+37 this month',
  trendLabel: 'Rating · last 12 months',
  trendValue: '▲ +0.3',
}

type SyncSource = 'google' | 'yelp' | 'facebook'
const SYNCED: { key: SyncSource; name: string }[] = [
  { key: 'google', name: 'Google' },
  { key: 'yelp', name: 'Yelp' },
  { key: 'facebook', name: 'Facebook' },
]

type FlowStep = { label: string; on: boolean }
const FLOW: FlowStep[] = [
  { label: 'Payment', on: true },
  { label: 'SMS Sent', on: true },
  { label: 'Review', on: false },
]

const AUTO_STATS: { n: string; k: string; green: boolean }[] = [
  { n: '312', k: 'Sent', green: false },
  { n: '71%', k: 'Opened', green: true },
  { n: '41%', k: 'Reviewed', green: true },
]

type Avatar = 'a' | 'b' | 'c' | 'd'
type Source = 'google' | 'yelp' | 'facebook'
type Review = {
  initials: string
  avatar: Avatar
  name: string
  meta: string
  source: Source
  quote: ReactNode
  replied?: string
}
const REVIEWS: Review[] = [
  {
    initials: 'SM',
    avatar: 'a',
    name: 'Sarah Mendel',
    meta: 'Highland Park, IL · 2 hrs ago',
    source: 'google',
    quote: (
      <>
        The crew transformed our backyard in a single afternoon —{' '}
        <span style={{ color: '#eafff2', fontWeight: 500 }}>
          edges crisp, beds mulched, not a blade out of place.
        </span>{' '}
        The before/after photos in the app sealed it. Booking again for the fall cleanup.
      </>
    ),
  },
  {
    initials: 'DR',
    avatar: 'b',
    name: 'Devon Ramirez',
    meta: 'Evanston, IL · Yesterday',
    source: 'yelp',
    quote: (
      <>
        Marcus and his team are{' '}
        <span style={{ color: '#eafff2', fontWeight: 500 }}>
          punctual, tidy, and genuinely care about the work.
        </span>{' '}
        They flagged an irrigation leak I didn&apos;t even know about and fixed it on the spot. Worth
        every dollar.
      </>
    ),
    replied: 'Replied by Cutty · 1 hr ago',
  },
  {
    initials: 'PT',
    avatar: 'd',
    name: 'Priya Thakkar',
    meta: 'Wilmette, IL · 2 days ago',
    source: 'facebook',
    quote: (
      <>
        Switched from a national chain and the difference is night and day.{' '}
        <span style={{ color: '#eafff2', fontWeight: 500 }}>
          Same crew every visit, real-time updates, and the lawn has never looked greener.
        </span>
      </>
    ),
    replied: 'Replied by Cutty · 4 hrs ago',
  },
]

const FILTERS: { label: string; on: boolean }[] = [
  { label: 'All', on: true },
  { label: '5★', on: false },
  { label: 'Unreplied', on: false },
]

const DRAFT = {
  ctxName: 'Devon Ramirez',
  ctxInitials: 'DR',
  ctxQuote:
    '"Marcus and his team are punctual, tidy, and genuinely care... fixed an irrigation leak on the spot."',
  reply:
    "Devon, this made our whole crew smile — thank you. Marcus takes real pride in catching the little things, and that irrigation leak was exactly the kind of save we love to make. We'll keep your yard in top shape every visit. See you soon!",
  tones: [
    { label: 'Warm', on: true },
    { label: 'Concise', on: false },
    { label: 'Playful', on: false },
  ],
  queue: '6',
  queueSub: 'drafts ready · auto-post in 12m',
}

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
  overflow: 'hidden',
}

const AVATAR_GRADIENT: Record<Avatar, { bg: string; color: string; glow: string }> = {
  a: { bg: 'linear-gradient(140deg,#5dffa0,#05a845)', color: '#04230f', glow: 'rgba(42,209,106,0.3)' },
  b: { bg: 'linear-gradient(140deg,#7dd3fc,#0ea5e9)', color: '#03263a', glow: 'rgba(14,165,233,0.3)' },
  c: { bg: 'linear-gradient(140deg,#fdba74,#E85D04)', color: '#3a1500', glow: 'rgba(232,93,4,0.3)' },
  d: { bg: 'linear-gradient(140deg,#c4b5fd,#7c3aed)', color: '#1e0a3a', glow: 'rgba(124,58,237,0.3)' },
}

const SOURCE_STYLE: Record<Source, { bg: string; border: string; color: string }> = {
  google: { bg: 'rgba(66,133,244,0.12)', border: 'rgba(66,133,244,0.3)', color: '#a9c6ff' },
  yelp: { bg: 'rgba(232,53,53,0.12)', border: 'rgba(232,53,53,0.3)', color: '#ffb0b0' },
  facebook: { bg: 'rgba(59,89,152,0.14)', border: 'rgba(59,89,152,0.35)', color: '#b6c5ee' },
}

const SOURCE_NAME: Record<Source, string> = {
  google: 'Google',
  yelp: 'Yelp',
  facebook: 'Facebook',
}

/* ------------------------------------------------------------------ */
/* Brand / glyph icons (paths copied from mockup)                      */
/* ------------------------------------------------------------------ */

function StarIcon({ size = 14, fill = T.neon }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7L12 2z"
        fill={fill}
      />
    </svg>
  )
}

function HalfStarIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="reviewsHalfStar" x1="0" x2="1">
          <stop offset="90%" stopColor={T.neon} />
          <stop offset="90%" stopColor="#2a3a30" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7L12 2z"
        fill="url(#reviewsHalfStar)"
      />
    </svg>
  )
}

function SourceIcon({ source, size = 12 }: { source: Source; size?: number }) {
  switch (source) {
    case 'google':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.8 12.2c0-.7-.06-1.3-.17-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.5z" fill="#4285F4" />
          <path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.4-4H3.2v2.6A10 10 0 0 0 12 22z" fill="#34A853" />
          <path d="M6.6 14a6 6 0 0 1 0-3.8V7.6H3.2a10 10 0 0 0 0 8.8L6.6 14z" fill="#FBBC05" />
          <path d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.2 7.6L6.6 10.2c.7-2.3 2.9-4 5.4-4z" fill="#EA4335" />
        </svg>
      )
    case 'yelp':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C7 2 3 5.6 3 10c0 2.5 1.3 4.7 3.3 6.2L5.5 21l4.8-2.4c.5.1 1.1.1 1.7.1 5 0 9-3.6 9-8s-4-8.8-9-8.8z" fill="#FF1A1A" />
        </svg>
      )
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" fill="#1877F2" />
        </svg>
      )
  }
}

function CheckBadge() {
  return (
    <span
      style={{
        width: '15px',
        height: '15px',
        borderRadius: '50%',
        background: 'rgba(42,209,106,0.18)',
        display: 'grid',
        placeItems: 'center',
        border: '1px solid rgba(42,209,106,0.5)',
        boxShadow: '0 0 8px rgba(42,209,106,0.4)',
      }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke={T.greenBright} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function ReplyArrowIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v2"
        stroke={T.greenBright}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FlowArrowIcon() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true">
      <path
        d="M1 5h9M7 1l3 4-3 4"
        stroke={T.faint}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
          'radial-gradient(900px 600px at 18% 8%, rgba(5,168,69,0.16), transparent 60%)',
          'radial-gradient(760px 520px at 88% 4%, rgba(232,93,4,0.10), transparent 58%)',
          'radial-gradient(800px 700px at 60% 110%, rgba(93,255,160,0.08), transparent 60%)',
          'radial-gradient(600px 500px at 100% 90%, rgba(124,58,237,0.07), transparent 60%)',
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
        <filter id="reviewsGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#reviewsGrain)" />
      </svg>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Left column — aggregate hero + auto-request engine                  */
/* ------------------------------------------------------------------ */

function AggregateHero({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.05 }}
      style={{
        ...cardStyle,
        padding: '20px 22px 18px',
        background: `radial-gradient(220px 160px at 22% 18%, rgba(42,209,106,0.18), transparent 70%), ${T.card}`,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: T.greenBright,
            boxShadow: '0 0 8px 1px #2ad16a, 0 0 16px 3px rgba(42,209,106,0.5)',
            animation: reduced ? undefined : 'scanPulse 1.6s ease-in-out infinite',
          }}
        />
        <Micro color={T.greenBright}>Aggregate Rating · All Sources</Micro>
      </span>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div
          style={{
            fontFamily: T.display,
            fontWeight: 800,
            fontSize: 'clamp(54px, 11vw, 66px)',
            lineHeight: 0.85,
            color: T.heading,
            letterSpacing: '-0.03em',
            textShadow: '0 0 30px rgba(42,209,106,0.45)',
          }}
        >
          {AGGREGATE.rating}
        </div>
        <div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                initial={reduced ? false : { opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ ...SPRING, delay: reduced ? 0 : 0.2 + i * 0.08 }}
                style={{ display: 'inline-flex', filter: 'drop-shadow(0 0 5px rgba(93,255,160,0.6))' }}
              >
                <StarIcon size={22} />
              </motion.span>
            ))}
            <motion.span
              initial={reduced ? false : { opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ ...SPRING, delay: reduced ? 0 : 0.52 }}
              style={{ display: 'inline-flex', filter: 'drop-shadow(0 0 5px rgba(93,255,160,0.6))' }}
            >
              <HalfStarIcon size={22} />
            </motion.span>
          </div>
          <div style={{ fontSize: '12.5px', color: T.muted }}>
            <b style={{ color: T.heading, fontWeight: 600 }}>{AGGREGATE.reviews}</b> reviews ·{' '}
            <span style={{ color: T.greenBright, fontWeight: 600 }}>{AGGREGATE.delta}</span>
          </div>
        </div>
      </div>

      {/* sparkline */}
      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${T.hair}` }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <Micro style={{ fontSize: '9px', letterSpacing: '0.18em', color: T.faint }}>
            {AGGREGATE.trendLabel}
          </Micro>
          <span style={{ fontFamily: T.mono, fontSize: '11px', fontWeight: 600, color: T.greenBright }}>
            {AGGREGATE.trendValue}
          </span>
        </div>
        <svg width="100%" height="46" viewBox="0 0 300 46" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="reviewsSpk" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="rgba(42,209,106,0.35)" />
              <stop offset="1" stopColor="rgba(42,209,106,0)" />
            </linearGradient>
            <linearGradient id="reviewsSpkLine" x1="0" x2="1">
              <stop offset="0" stopColor="#047a32" />
              <stop offset="1" stopColor="#5dffa0" />
            </linearGradient>
          </defs>
          <path
            d="M0 34 L27 32 L55 35 L82 28 L109 30 L137 24 L164 26 L191 19 L218 21 L246 14 L273 11 L300 8 L300 46 L0 46 Z"
            fill="url(#reviewsSpk)"
          />
          <motion.path
            d="M0 34 L27 32 L55 35 L82 28 L109 30 L137 24 L164 26 L191 19 L218 21 L246 14 L273 11 L300 8"
            fill="none"
            stroke="url(#reviewsSpkLine)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduced ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 1.1, ease: 'easeOut', delay: reduced ? 0 : 0.3 }}
          />
          <circle cx="300" cy="8" r="3.5" fill="#5dffa0" />
          <circle cx="300" cy="8" r="6" fill="none" stroke="#5dffa0" strokeOpacity="0.4" />
        </svg>
      </div>
    </motion.div>
  )
}

function AutoRequestCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.12 }}
      style={{
        ...cardStyle,
        flex: 1,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '9px',
            background: 'rgba(232,93,4,0.14)',
            border: '1px solid rgba(232,93,4,0.35)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 0 14px rgba(232,93,4,0.28)',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 4h16v12H7l-3 3V4z" stroke={T.orangeBright} strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M8 9h8M8 12h5" stroke={T.orangeBright} strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: '14.5px', color: T.heading, margin: 0 }}>
          Auto-Request Engine
        </h3>
      </div>
      <div style={{ fontSize: '11.5px', color: T.muted, margin: '4px 0 14px', lineHeight: 1.5 }}>
        Review request auto-sent the moment a payment clears. Zero manual follow-up.
      </div>

      {/* flow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
        {FLOW.map((step, i) => (
          <span key={step.label} style={{ display: 'contents' }}>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...SPRING, delay: reduced ? 0 : 0.25 + i * 0.1 }}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '8px 4px',
                borderRadius: '10px',
                fontFamily: T.mono,
                fontSize: '8.5px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: step.on ? 'rgba(42,209,106,0.12)' : 'rgba(255,255,255,0.03)',
                border: step.on ? '1px solid rgba(42,209,106,0.4)' : `1px solid ${T.hair}`,
                color: step.on ? T.neon : T.muted,
                boxShadow: step.on ? '0 0 12px rgba(42,209,106,0.25)' : 'none',
              }}
            >
              {step.label}
            </motion.div>
            {i < FLOW.length - 1 && (
              <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                <FlowArrowIcon />
              </span>
            )}
          </span>
        ))}
      </div>

      {/* SMS bubble */}
      <motion.div
        initial={reduced ? false : { opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ ...SPRING, delay: reduced ? 0 : 0.5 }}
        style={{
          background: 'linear-gradient(180deg, rgba(42,209,106,0.10), rgba(255,255,255,0.02))',
          border: '1px solid rgba(42,209,106,0.22)',
          borderRadius: '14px 14px 14px 4px',
          padding: '11px 13px',
          marginBottom: '5px',
        }}
      >
        <div
          style={{
            fontFamily: T.mono,
            fontSize: '8.5px',
            letterSpacing: '0.16em',
            color: T.greenBright,
            textTransform: 'uppercase',
            marginBottom: '5px',
          }}
        >
          SMS · from YardWorx
        </div>
        <div style={{ fontSize: '12px', color: '#eafff2', lineHeight: 1.5 }}>
          Thanks Sarah! Got 30 seconds to rate your YardWorx visit?{' '}
          <span style={{ display: 'inline-flex', verticalAlign: '-2px' }}>
            <StarIcon size={13} />
          </span>{' '}
          <span style={{ color: T.neon, textDecoration: 'underline' }}>yardworx.io/r/8KQ2</span>
        </div>
      </motion.div>
      <div
        style={{
          fontFamily: T.mono,
          fontSize: '9px',
          color: T.faint,
          textAlign: 'right',
          margin: '5px 2px 0',
        }}
      >
        Delivered 2:14 PM
      </div>

      {/* stats */}
      <div
        style={{
          marginTop: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '9px',
          paddingTop: '14px',
          borderTop: `1px solid ${T.hair}`,
        }}
      >
        {AUTO_STATS.map((s, i) => (
          <motion.div
            key={s.k}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...SPRING, delay: reduced ? 0 : 0.6 + i * 0.08 }}
            style={{ textAlign: 'center' }}
          >
            <div
              style={{
                fontFamily: T.display,
                fontWeight: 800,
                fontSize: '19px',
                color: s.green ? T.greenBright : T.heading,
              }}
            >
              {s.n}
            </div>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: '8px',
                letterSpacing: '0.14em',
                color: T.faint,
                textTransform: 'uppercase',
                marginTop: '3px',
              }}
            >
              {s.k}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function LeftColumn({ reduced }: { reduced: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
      <AggregateHero reduced={reduced} />
      <AutoRequestCard reduced={reduced} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Center column — live review stream                                  */
/* ------------------------------------------------------------------ */

function ReviewCard({ review, index, reduced }: { review: Review; index: number; reduced: boolean }) {
  const av = AVATAR_GRADIENT[review.avatar]
  const src = SOURCE_STYLE[review.source]
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.2 + index * 0.12 }}
      style={{
        background: T.cardHi,
        border: `1px solid ${T.border}`,
        borderRadius: '15px',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '9px' }}>
        <span
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontFamily: T.display,
            fontWeight: 700,
            fontSize: '14px',
            flexShrink: 0,
            background: av.bg,
            color: av.color,
            boxShadow: `0 0 14px ${av.glow}`,
          }}
        >
          {review.initials}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: T.heading }}>{review.name}</div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: '9px',
              letterSpacing: '0.08em',
              color: T.faint,
              textTransform: 'uppercase',
              marginTop: '2px',
            }}
          >
            {review.meta}
          </div>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 600,
            flexShrink: 0,
            background: src.bg,
            border: `1px solid ${src.border}`,
            color: src.color,
          }}
        >
          <SourceIcon source={review.source} />
          {SOURCE_NAME[review.source]}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} size={14} />
        ))}
      </div>
      <div style={{ fontSize: '12.5px', color: T.body, lineHeight: 1.55 }}>{review.quote}</div>
      {review.replied && (
        <div
          style={{
            marginTop: '9px',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            fontFamily: T.mono,
            fontSize: '9px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: T.greenBright,
          }}
        >
          <ReplyArrowIcon />
          {review.replied}
        </div>
      )}
    </motion.div>
  )
}

function CenterColumn({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.1 }}
      style={{ ...cardStyle, display: 'flex', flexDirection: 'column', minWidth: 0 }}
    >
      <div
        style={{
          padding: '16px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Micro color={T.greenBright} style={{ fontSize: '9px' }}>
            Live Feed · Auto-Synced
          </Micro>
          <h3
            style={{
              fontFamily: T.display,
              fontWeight: 700,
              fontSize: '15px',
              color: T.heading,
              margin: '4px 0 0',
            }}
          >
            Recent 5-Star Reviews
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '7px' }}>
          {FILTERS.map((f) => (
            <span
              key={f.label}
              style={{
                fontFamily: T.mono,
                fontSize: '9px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '5px 10px',
                borderRadius: '8px',
                background: f.on ? 'rgba(42,209,106,0.12)' : 'transparent',
                border: f.on ? '1px solid rgba(42,209,106,0.4)' : `1px solid ${T.hair}`,
                color: f.on ? T.neon : T.muted,
              }}
            >
              {f.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
        {REVIEWS.map((r, i) => (
          <ReviewCard key={r.name} review={r} index={i} reduced={reduced} />
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Right column — AI reply draft (Cutty)                               */
/* ------------------------------------------------------------------ */

function TypingDots({ reduced }: { reduced: boolean }) {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', marginLeft: 'auto' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: T.greenBright,
            opacity: 0.85,
            animation: reduced ? undefined : 'blink 1.2s ease-in-out infinite',
            animationDelay: reduced ? undefined : `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  )
}

function RightColumn({ reduced }: { reduced: boolean }) {
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
        minWidth: 0,
        background: `radial-gradient(260px 200px at 80% 0%, rgba(5,168,69,0.14), transparent 70%), ${T.card}`,
      }}
    >
      {/* header */}
      <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${T.hair}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'radial-gradient(circle at 35% 30%, rgba(93,255,160,0.4), rgba(5,122,50,0.3))',
              border: '1px solid rgba(93,255,160,0.45)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 18px rgba(42,209,106,0.5)',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3l1.8 4 4.2.5-3.2 2.9.9 4.2L12 12.6 8.3 14.6l.9-4.2L6 7.5 10.2 7 12 3z"
                fill={T.neon}
              />
              <circle cx="12" cy="19" r="1.6" fill={T.neon} />
            </svg>
          </span>
          <div>
            <h3 style={{ fontFamily: T.display, fontWeight: 700, fontSize: '14.5px', color: T.heading, margin: 0 }}>
              AI Reply Drafts
            </h3>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: '9px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: T.greenBright,
                marginTop: '2px',
              }}
            >
              Drafted by Cutty
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div
        style={{
          padding: '15px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* context review */}
        <div
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: `1px solid ${T.hair}`,
            borderRadius: '12px',
            padding: '11px 13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(140deg,#fdba74,#E85D04)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: T.display,
                fontWeight: 700,
                fontSize: '10px',
                color: '#3a1500',
                flexShrink: 0,
              }}
            >
              {DRAFT.ctxInitials}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: T.heading }}>{DRAFT.ctxName}</span>
            <span style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <StarIcon key={i} size={11} />
              ))}
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: T.muted, lineHeight: 1.5, fontStyle: 'italic' }}>
            {DRAFT.ctxQuote}
          </div>
        </div>

        {/* draft label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Micro color={T.greenBright} style={{ fontSize: '9px' }}>
            Suggested Public Reply
          </Micro>
          <TypingDots reduced={reduced} />
        </div>

        {/* draft */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...SPRING, delay: reduced ? 0 : 0.4 }}
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(42,209,106,0.10), rgba(255,255,255,0.02))',
            border: '1px solid rgba(42,209,106,0.28)',
            borderRadius: '14px',
            padding: '13px 15px',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              borderRadius: '3px',
              background: `linear-gradient(180deg, ${T.neon}, ${T.green})`,
              boxShadow: '0 0 12px rgba(42,209,106,0.6)',
            }}
          />
          <p style={{ fontSize: '12.5px', color: '#eafff2', lineHeight: 1.62, margin: 0 }}>
            {DRAFT.reply}
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '14px',
                background: T.neon,
                verticalAlign: '-2px',
                marginLeft: '1px',
                boxShadow: `0 0 6px ${T.neon}`,
                animation: reduced ? undefined : 'blink 1s step-end infinite',
              }}
            />
          </p>
          <div style={{ display: 'flex', gap: '7px', marginTop: '11px', flexWrap: 'wrap' }}>
            {DRAFT.tones.map((t) => (
              <span
                key={t.label}
                style={{
                  fontFamily: T.mono,
                  fontSize: '8.5px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '4px 9px',
                  borderRadius: '7px',
                  background: t.on ? 'rgba(93,255,160,0.12)' : 'transparent',
                  border: t.on ? '1px solid rgba(93,255,160,0.35)' : `1px solid ${T.hair}`,
                  color: t.on ? T.neon : T.muted,
                }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* actions */}
      <div style={{ padding: '14px 18px', borderTop: `1px solid ${T.hair}`, display: 'flex', gap: '10px' }}>
        <span
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            padding: '11px 0',
            borderRadius: '11px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#04230f',
            cursor: 'pointer',
            background: `linear-gradient(180deg, ${T.neon}, ${T.green})`,
            boxShadow: '0 0 22px rgba(42,209,106,0.5), inset 0 1px 0 rgba(255,255,255,0.35)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 11l18-8-8 18-2-7-8-3z" stroke="#04230f" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          Post Reply
        </span>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '11px 0',
            borderRadius: '11px',
            fontSize: '12.5px',
            fontWeight: 600,
            color: T.body,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${T.border}`,
          }}
        >
          Edit
        </span>
      </div>

      {/* queue */}
      <div
        style={{
          padding: '12px 18px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <Micro style={{ fontSize: '8.5px' }}>In Queue</Micro>
        <span style={{ fontFamily: T.mono, fontSize: '10px', color: T.muted }}>
          <b style={{ color: T.greenBright }}>{DRAFT.queue}</b> {DRAFT.queueSub}
        </span>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function Reviews() {
  const reduced = useReducedMotion()

  return (
    <section
      aria-labelledby="reviews-heading"
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: T.greenBright,
                  boxShadow: '0 0 8px 1px #2ad16a, 0 0 16px 3px rgba(42,209,106,0.5)',
                  animation: reduced ? undefined : 'scanPulse 1.6s ease-in-out infinite',
                }}
              />
              <Micro color={T.greenBright}>Reviews &amp; Reputation · Auto-Engine Live</Micro>
            </span>
            <h2
              id="reviews-heading"
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
              Reputation{' '}
              <span
                style={{
                  backgroundImage: `linear-gradient(120deg, ${T.neon}, ${T.greenBright})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
                }}
              >
                Command Center
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
              Automated review capture, multi-channel sync, and AI public responses — all on autopilot.
            </p>
          </div>

          {/* synced sources */}
          <div style={{ display: 'flex', gap: '9px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Micro style={{ fontSize: '8.5px', marginRight: '2px' }}>Sources synced</Micro>
            {SYNCED.map((s) => (
              <span
                key={s.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 12px',
                  borderRadius: '11px',
                  border: `1px solid ${T.border}`,
                  background: T.card,
                  fontSize: '11.5px',
                  color: T.body,
                  fontWeight: 500,
                }}
              >
                <SourceIcon source={s.key} size={13} />
                {s.name}
                <CheckBadge />
              </span>
            ))}
          </div>
        </motion.div>

        {/* three-column grid — reflows gracefully on narrow viewports */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '18px',
            alignItems: 'stretch',
          }}
        >
          <LeftColumn reduced={reduced} />
          <CenterColumn reduced={reduced} />
          <RightColumn reduced={reduced} />
        </div>
      </div>

      <GrainVignette />
    </section>
  )
}
