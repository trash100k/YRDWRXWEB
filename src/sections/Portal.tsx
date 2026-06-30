import { useState } from 'react'
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
  card: 'rgba(255,255,255,0.045)',
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

const CLIENT = {
  first: 'Sarah',
  full: 'Sarah Whitman',
  initials: 'SW',
  subline: 'Your property is looking great this season.',
  address: '162 Birchwood Ln',
  city: 'Cedar Park, TX',
}

const NAV_LINKS = ['My Portal', 'Visits', 'Invoices', 'Messages'] as const

type ScopeIcon = 'mow' | 'mulch' | 'hedge'
type ScopeRow = { title: string; detail: string; price: string; icon: ScopeIcon }
const QUOTE = {
  id: 'Q-2208',
  validity: 'VALID 14 DAYS',
  title: 'Spring Cleanup & Lawn Refresh',
  badge: 'New quote · awaiting your approval',
  total: '365',
  totalSub: 'No hidden fees · taxes included',
}
const SCOPE: ScopeRow[] = [
  {
    title: 'Full property mow & edge',
    detail: 'Front, back & side lawns · 0.4 acre',
    price: '$140',
    icon: 'mow',
  },
  {
    title: 'Bed weeding & fresh mulch',
    detail: '2 garden beds · 4 cu yd premium bark',
    price: '$165',
    icon: 'mulch',
  },
  {
    title: 'Hedge trim & debris haul',
    detail: 'Front boxwoods · cleanup included',
    price: '$60',
    icon: 'hedge',
  },
]

const VISIT = {
  day: 'Thu, May 2',
  time: '9:00 AM',
  label: 'Upcoming visit',
  crewNames: 'Marcus & Dani',
  eta: 'ETA ~12 min',
}

const INVOICE = {
  number: '#1058',
  desc: 'Spring Cleanup & Lawn Refresh',
  amount: '$365.00',
  due: 'Due May 9',
  secure: 'Secured by Stripe · Visa · Mastercard · Apple Pay',
}

type Bubble = { from: 'crew' | 'me'; name: string; text: string; time: string }
const THREAD: Bubble[] = [
  {
    from: 'crew',
    name: 'Marcus · Crew Lead',
    text: "Morning Sarah! We're loaded up and heading your way. We'll start with the back lawn so the gate stays clear.",
    time: '8:48 AM',
  },
  {
    from: 'me',
    name: 'You',
    text: "Perfect, thank you! The side gate code is 4072. Coffee's on the porch if you want it ☕",
    time: '8:51 AM',
  },
  {
    from: 'crew',
    name: 'Dani',
    text: "You're the best — we'll have the beds looking sharp. Quick question, want the hydrangeas trimmed back too?",
    time: '8:53 AM',
  },
]

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
}

/* ------------------------------------------------------------------ */
/* Icons (paths copied from mockup)                                    */
/* ------------------------------------------------------------------ */

function LeafMark({ size = 17, fill = T.neon }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21c-4-1-8-4-8-10 0-4 3-8 8-8 0 6-3 9-3 9s5-1 8-6c1 8-2 14-5 15z"
        fill={fill}
      />
      <path d="M9 12c2 0 5-2 6-5" stroke="#04130a" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ScopeIconSvg({ icon }: { icon: ScopeIcon }) {
  switch (icon) {
    case 'mow':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 19c4-1 7-4 8-8M12 11c1-4 4-7 8-8M5 14c3 0 5 2 5 5M19 7c-3 0-5 2-5 5"
            stroke={T.neon}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'mulch':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3v6M12 21v-3M4 8l4 3M20 8l-4 3M6 18h12"
            stroke={T.neon}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'hedge':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 20V9l5-5 5 5v11M10 20v-5h4v5"
            stroke={T.neon}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

/* ------------------------------------------------------------------ */
/* Before / After yard illustrations (paths from mockup)               */
/* ------------------------------------------------------------------ */

function BeforeYard() {
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="portalSkyB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a30" />
          <stop offset="1" stopColor="#52503f" />
        </linearGradient>
        <linearGradient id="portalGrB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b6a48" />
          <stop offset="1" stopColor="#4a4936" />
        </linearGradient>
      </defs>
      <rect width="400" height="120" fill="url(#portalSkyB)" />
      <rect y="110" width="400" height="110" fill="url(#portalGrB)" />
      <g fill="#5e5d3e" opacity="0.9">
        <path d="M20 150c4-22 10-22 14 0z" />
        <path d="M40 158c3-18 8-18 11 0z" />
        <path d="M70 148c5-26 11-26 16 0z" />
        <path d="M110 160c3-16 7-16 10 0z" />
        <path d="M150 150c4-24 10-24 14 0z" />
        <path d="M200 158c4-20 9-20 13 0z" />
        <path d="M250 150c5-26 11-26 16 0z" />
        <path d="M300 160c3-18 8-18 11 0z" />
        <path d="M340 150c4-22 10-22 14 0z" />
        <path d="M375 158c3-16 7-16 10 0z" />
      </g>
      <g stroke="#807d52" strokeWidth="1.4" opacity="0.6">
        <path d="M55 175l5-22M95 180l-4-20M185 178l3-22M275 180l-5-20M330 176l4-22" />
      </g>
      <ellipse cx="130" cy="195" rx="42" ry="12" fill="#5b5538" opacity="0.8" />
      <ellipse cx="300" cy="200" rx="38" ry="10" fill="#605a3b" opacity="0.7" />
      <circle cx="350" cy="125" r="22" fill="#4d5238" opacity="0.85" />
      <circle cx="40" cy="120" r="16" fill="#525338" opacity="0.8" />
    </svg>
  )
}

function AfterYard() {
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient id="portalSkyA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a3a1f" />
          <stop offset="1" stopColor="#0e5a2c" />
        </linearGradient>
        <linearGradient id="portalGrA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2ad16a" />
          <stop offset="1" stopColor="#047a32" />
        </linearGradient>
        <radialGradient id="portalGlow" cx="0.7" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#5dffa0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#5dffa0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="120" fill="url(#portalSkyA)" />
      <rect width="400" height="120" fill="url(#portalGlow)" />
      <rect y="108" width="400" height="112" fill="url(#portalGrA)" />
      <g opacity="0.18" fill="#5dffa0">
        <polygon points="0,112 80,112 30,220 -40,220" />
        <polygon points="160,112 240,112 230,220 150,220" />
        <polygon points="320,112 400,112 430,220 350,220" />
      </g>
      <path
        d="M0 150 Q200 138 400 150"
        stroke="#06140c"
        strokeWidth="3"
        fill="none"
        opacity="0.45"
      />
      <g>
        <ellipse cx="60" cy="128" rx="26" ry="20" fill="#16803c" />
        <ellipse cx="60" cy="122" rx="22" ry="16" fill="#2ad16a" opacity="0.65" />
        <ellipse cx="340" cy="126" rx="28" ry="22" fill="#16803c" />
        <ellipse cx="340" cy="120" rx="23" ry="17" fill="#2ad16a" opacity="0.65" />
      </g>
      <g>
        <circle cx="150" cy="172" r="4" fill="#f97316" />
        <circle cx="166" cy="178" r="4" fill="#5dffa0" />
        <circle cx="182" cy="172" r="4" fill="#f97316" />
        <circle cx="210" cy="176" r="4" fill="#5dffa0" />
        <circle cx="226" cy="172" r="4" fill="#f97316" />
      </g>
      <path
        d="M0 150 Q200 138 400 150 L400 162 Q200 150 0 162 Z"
        fill="#3a2415"
        opacity="0.55"
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
          'radial-gradient(900px 620px at 16% 4%, rgba(5,168,69,0.20), transparent 60%)',
          'radial-gradient(820px 580px at 96% 10%, rgba(45,209,106,0.10), transparent 62%)',
          'radial-gradient(700px 600px at 86% 96%, rgba(232,93,4,0.10), transparent 60%)',
          'radial-gradient(700px 520px at 8% 92%, rgba(124,58,237,0.10), transparent 60%)',
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
        <filter id="portalGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#portalGrain)" />
      </svg>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Browser-chrome nav                                                  */
/* ------------------------------------------------------------------ */

function PortalNav() {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        padding: '0 0 16px',
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
        <span
          style={{
            width: '30px',
            height: '30px',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '9px',
            background: 'linear-gradient(150deg,rgba(45,209,106,0.22),rgba(5,168,69,0.06))',
            border: '1px solid rgba(45,209,106,0.35)',
            boxShadow: '0 0 18px rgba(45,209,106,0.30)',
          }}
        >
          <LeafMark size={17} />
        </span>
        <span
          style={{
            fontFamily: T.display,
            fontWeight: 800,
            fontSize: '18px',
            color: T.heading,
            letterSpacing: '-0.01em',
          }}
        >
          YardWorx
        </span>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {NAV_LINKS.map((link, i) => (
          <span
            key={link}
            style={{
              fontFamily: T.sans,
              fontSize: '13px',
              fontWeight: 500,
              color: i === 0 ? T.heading : T.muted,
            }}
          >
            {link}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontFamily: T.sans, fontSize: '13px', fontWeight: 500, color: T.muted }}>
          Help
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 7px 6px 13px',
            border: `1px solid ${T.border}`,
            borderRadius: '30px',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <span style={{ fontFamily: T.sans, fontSize: '12.5px', fontWeight: 500, color: T.body }}>
            {CLIENT.full}
          </span>
          <span
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '12px',
              color: '#06140c',
              background: `linear-gradient(150deg,${T.neon},${T.green})`,
              boxShadow: '0 0 14px rgba(45,209,106,0.45)',
            }}
          >
            {CLIENT.initials}
          </span>
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero quote card (left)                                              */
/* ------------------------------------------------------------------ */

function ScopeRowItem({ row }: { row: ScopeRow }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        paddingBottom: '9px',
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
        <span
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '9px',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            background: 'rgba(45,209,106,0.10)',
            border: '1px solid rgba(45,209,106,0.20)',
          }}
        >
          <ScopeIconSvg icon={row.icon} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.sans, fontSize: '13.5px', fontWeight: 500, color: T.body }}>
            {row.title}
          </div>
          <div style={{ fontFamily: T.sans, fontSize: '11px', color: T.faint, marginTop: '1px' }}>
            {row.detail}
          </div>
        </div>
      </div>
      <span style={{ fontFamily: T.mono, fontWeight: 500, fontSize: '13px', color: T.muted, flexShrink: 0 }}>
        {row.price}
      </span>
    </div>
  )
}

function HeroCard({ reduced }: { reduced: boolean }) {
  const [approveHover, setApproveHover] = useState(false)
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.05 }}
      style={{
        ...cardStyle,
        padding: '20px 22px',
        overflow: 'hidden',
        background:
          'radial-gradient(420px 220px at 88% 6%, rgba(5,168,69,0.16), transparent 70%), rgba(255,255,255,0.045)',
        border: '1px solid rgba(45,209,106,0.18)',
        boxShadow:
          '0 20px 60px -30px rgba(5,168,69,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '5px 11px',
            borderRadius: '30px',
            background: 'rgba(45,209,106,0.12)',
            border: '1px solid rgba(45,209,106,0.30)',
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
          <Micro color={T.greenBright} style={{ fontSize: '9px' }}>
            {QUOTE.badge}
          </Micro>
        </span>
        <Micro>
          QUOTE #{QUOTE.id} · {QUOTE.validity}
        </Micro>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '22px',
          alignItems: 'center',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '21px',
              color: T.heading,
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}
          >
            {QUOTE.title}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {SCOPE.map((row) => (
              <ScopeRowItem key={row.title} row={row} />
            ))}
          </div>
        </div>

        <div
          style={{
            borderLeft: `1px solid ${T.hair}`,
            paddingLeft: '22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <Micro style={{ marginBottom: '6px' }}>Total · all-in</Micro>
          <div
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '46px',
              lineHeight: 1,
              color: T.heading,
              letterSpacing: '-0.03em',
            }}
          >
            <span
              style={{
                fontSize: '24px',
                color: T.greenBright,
                verticalAlign: 'top',
                position: 'relative',
                top: '4px',
                marginRight: '1px',
              }}
            >
              $
            </span>
            {QUOTE.total}
          </div>
          <div style={{ fontFamily: T.sans, fontSize: '11px', color: T.faint, marginTop: '7px' }}>
            {QUOTE.totalSub}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
            <motion.div
              role="button"
              tabIndex={0}
              onHoverStart={() => setApproveHover(true)}
              onHoverEnd={() => setApproveHover(false)}
              animate={reduced ? undefined : { scale: approveHover ? 1.02 : 1 }}
              transition={SPRING}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
                height: '46px',
                borderRadius: '13px',
                cursor: 'pointer',
                fontFamily: T.display,
                fontWeight: 800,
                fontSize: '14.5px',
                color: '#04130a',
                letterSpacing: '-0.01em',
                background:
                  'linear-gradient(135deg,#5dffa0 0%,#2ad16a 45%,#05a845 100%)',
                filter: approveHover ? 'brightness(1.06)' : 'none',
                boxShadow:
                  '0 12px 34px -10px rgba(45,209,106,0.75), inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 13l4 4 10-11"
                  stroke="#04130a"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Approve &amp; schedule
            </motion.div>
            <div
              role="button"
              tabIndex={0}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '42px',
                borderRadius: '13px',
                cursor: 'pointer',
                fontFamily: T.sans,
                fontSize: '13.5px',
                fontWeight: 600,
                color: T.body,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${T.border}`,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-5A8 8 0 1 1 21 12z"
                  stroke="#d4d4d8"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              Ask a question
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Schedule strip (left)                                               */
/* ------------------------------------------------------------------ */

function ScheduleStrip({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.12 }}
      style={{
        ...cardStyle,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '18px',
        padding: '16px 18px',
        background:
          'radial-gradient(360px 140px at 6% 50%,rgba(232,93,4,0.07),transparent 70%), rgba(255,255,255,0.045)',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          paddingRight: '18px',
          borderRight: `1px solid ${T.hair}`,
          minWidth: '96px',
        }}
      >
        <div style={{ fontFamily: T.display, fontWeight: 800, fontSize: '15px', color: T.heading }}>
          {VISIT.day}
        </div>
        <div
          style={{
            fontFamily: T.mono,
            fontSize: '18px',
            fontWeight: 700,
            color: T.greenBright,
            marginTop: '3px',
          }}
        >
          {VISIT.time}
        </div>
        <Micro style={{ display: 'block', marginTop: '5px' }}>{VISIT.label}</Micro>
      </div>

      <div style={{ flex: 1, minWidth: '160px' }}>
        <div style={{ fontFamily: T.sans, fontSize: '11px', color: T.faint, marginBottom: '4px' }}>
          Your crew
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ display: 'flex' }}>
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: '2px solid #0a0c0b',
                display: 'grid',
                placeItems: 'center',
                fontFamily: T.display,
                fontWeight: 800,
                fontSize: '11px',
                color: '#06140c',
                background: 'linear-gradient(150deg,#5dffa0,#05a845)',
              }}
            >
              M
            </span>
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: '2px solid #0a0c0b',
                display: 'grid',
                placeItems: 'center',
                fontFamily: T.display,
                fontWeight: 800,
                fontSize: '11px',
                color: '#fff',
                marginLeft: '-9px',
                background: 'linear-gradient(150deg,#f97316,#E85D04)',
              }}
            >
              D
            </span>
          </span>
          <span
            style={{
              fontFamily: T.sans,
              fontSize: '13.5px',
              color: T.body,
              fontWeight: 500,
              marginLeft: '11px',
            }}
          >
            {VISIT.crewNames}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 14px',
            borderRadius: '30px',
            background: 'rgba(5,168,69,0.12)',
            border: '1px solid rgba(45,209,106,0.32)',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: T.neon,
              boxShadow: `0 0 10px ${T.neon}`,
              animation: reduced ? undefined : 'scanPulse 1.6s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: T.mono,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: T.neon,
            }}
          >
            ON THE WAY
          </span>
        </span>
        <span style={{ fontFamily: T.sans, fontSize: '11px', color: T.faint, marginLeft: '13px' }}>
          {VISIT.eta}
        </span>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Before / After card (left)                                          */
/* ------------------------------------------------------------------ */

function BeforeAfterCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.18 }}
      style={{
        ...cardStyle,
        padding: '14px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <Micro color={T.greenBright}>The transformation · last visit</Micro>
        <Micro>162 BIRCHWOOD LN · BACKYARD</Micro>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px',
          marginTop: '12px',
        }}
      >
        <BaTile label="Before" tone="before">
          <BeforeYard />
        </BaTile>
        <BaTile label="After" tone="after">
          <AfterYard />
        </BaTile>
      </div>
    </motion.div>
  )
}

function BaTile({
  label,
  tone,
  children,
}: {
  label: string
  tone: 'before' | 'after'
  children: ReactNode
}) {
  const isAfter = tone === 'after'
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '14px',
        overflow: 'hidden',
        border: `1px solid ${T.border}`,
        aspectRatio: '20 / 11',
        minHeight: '120px',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 3,
          padding: '4px 10px',
          borderRadius: '30px',
          fontFamily: T.mono,
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          background: isAfter ? 'rgba(5,168,69,0.22)' : 'rgba(0,0,0,0.55)',
          color: isAfter ? T.neon : '#c9c4b6',
          border: isAfter
            ? '1px solid rgba(45,209,106,0.4)'
            : '1px solid rgba(255,255,255,0.14)',
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Payment card (right)                                                */
/* ------------------------------------------------------------------ */

function PaymentCard({ reduced }: { reduced: boolean }) {
  const [payHover, setPayHover] = useState(false)
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.1 }}
      style={{
        ...cardStyle,
        padding: '18px',
        background:
          'radial-gradient(320px 160px at 92% 0%,rgba(232,93,4,0.12),transparent 70%), rgba(255,255,255,0.045)',
        border: '1px solid rgba(232,93,4,0.16)',
      }}
    >
      <Micro style={{ display: 'block', marginBottom: '12px' }}>Balance due</Micro>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <span
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              background: 'rgba(232,93,4,0.12)',
              border: '1px solid rgba(232,93,4,0.28)',
            }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="3" width="14" height="18" rx="2" stroke="#f97316" strokeWidth="1.6" />
              <path
                d="M8 8h8M8 12h8M8 16h5"
                stroke="#f97316"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.sans, fontSize: '14px', fontWeight: 600, color: T.heading }}>
              Invoice {INVOICE.number}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: '11px', color: T.faint, marginTop: '2px' }}>
              {INVOICE.desc}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '24px',
              color: T.heading,
              letterSpacing: '-0.02em',
            }}
          >
            {INVOICE.amount}
          </div>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: '10px',
              color: T.orangeBright,
              fontWeight: 600,
              marginTop: '1px',
            }}
          >
            {INVOICE.due}
          </div>
        </div>
      </div>

      <motion.div
        role="button"
        tabIndex={0}
        onHoverStart={() => setPayHover(true)}
        onHoverEnd={() => setPayHover(false)}
        animate={reduced ? undefined : { scale: payHover ? 1.02 : 1 }}
        transition={SPRING}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          height: '44px',
          borderRadius: '12px',
          cursor: 'pointer',
          fontFamily: T.display,
          fontWeight: 800,
          fontSize: '14px',
          color: '#fff',
          background: 'linear-gradient(135deg,#f97316,#E85D04)',
          filter: payHover ? 'brightness(1.06)' : 'none',
          boxShadow:
            '0 12px 30px -12px rgba(232,93,4,0.8),inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="#fff" strokeWidth="1.6" />
          <path d="M3 10h18" stroke="#fff" strokeWidth="1.6" />
        </svg>
        Pay now
      </motion.div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          marginTop: '11px',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"
            stroke="#71717a"
            strokeWidth="1.5"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="#71717a"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <Micro style={{ fontSize: '8.5px', letterSpacing: '0.12em' }}>{INVOICE.secure}</Micro>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Message thread card (right)                                         */
/* ------------------------------------------------------------------ */

function MessageBubble({ bubble, reduced, index }: { bubble: Bubble; reduced: boolean; index: number }) {
  const isMe = bubble.from === 'me'
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.25 + index * 0.1 }}
      style={{
        alignSelf: isMe ? 'flex-end' : 'flex-start',
        maxWidth: '84%',
        padding: '10px 13px',
        borderRadius: '14px',
        borderBottomLeftRadius: isMe ? '14px' : '5px',
        borderBottomRightRadius: isMe ? '5px' : '14px',
        fontFamily: T.sans,
        fontSize: '12.5px',
        lineHeight: 1.45,
        background: isMe
          ? 'linear-gradient(135deg,rgba(45,209,106,0.18),rgba(5,168,69,0.10))'
          : 'rgba(255,255,255,0.05)',
        border: isMe ? '1px solid rgba(45,209,106,0.28)' : `1px solid ${T.hair}`,
        color: isMe ? '#eafff2' : T.body,
      }}
    >
      <div
        style={{
          fontFamily: T.mono,
          fontSize: '8.5px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
          textAlign: isMe ? 'right' : 'left',
          color: isMe ? T.neon : T.greenBright,
        }}
      >
        {bubble.name}
      </div>
      {bubble.text}
      <div style={{ fontFamily: T.sans, fontSize: '9px', color: T.faint, marginTop: '4px' }}>
        {bubble.time}
      </div>
    </motion.div>
  )
}

function MessageCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.18 }}
      style={{
        ...cardStyle,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <Micro color={T.greenBright}>Messages with your crew</Micro>
        <Micro>2 NEW</Micro>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '12px' }}>
        {THREAD.map((bubble, i) => (
          <MessageBubble key={bubble.time} bubble={bubble} reduced={reduced} index={i} />
        ))}
      </div>

      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          padding: '9px 9px 9px 14px',
          border: `1px solid ${T.border}`,
          borderRadius: '30px',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        <span style={{ flex: 1, fontFamily: T.sans, fontSize: '12px', color: T.faint }}>
          Message Marcus &amp; Dani…
        </span>
        <span
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            background: `linear-gradient(150deg,${T.neon},${T.green})`,
            boxShadow: '0 0 14px rgba(45,209,106,0.5)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12l16-7-7 16-2-7-7-2z" fill="#04130a" />
          </svg>
        </span>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function Portal() {
  const reduced = useReducedMotion()

  return (
    <section
      aria-labelledby="portal-heading"
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
          style={{ marginBottom: 'clamp(24px, 3.5vw, 34px)' }}
        >
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
            <Micro color={T.greenBright}>CLIENT PORTAL · LIVE</Micro>
          </span>
          <h2
            id="portal-heading"
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
            Their own{' '}
            <span
              style={{
                backgroundImage: `linear-gradient(120deg, ${T.neon}, ${T.greenBright})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
              }}
            >
              portal
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
            Approve quotes, pay invoices, track the crew, and message in one branded place.
          </p>
        </motion.div>

        {/* portal device frame */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.985 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ ...SPRING, delay: reduced ? 0 : 0.05 }}
          style={{
            position: 'relative',
            borderRadius: '24px',
            overflow: 'hidden',
            border: `1px solid ${T.border}`,
            background:
              'radial-gradient(900px 620px at 16% -8%, rgba(5,168,69,0.10), transparent 60%), linear-gradient(160deg,#0a0c0b 0%, #07080a 48%, #050506 100%)',
            boxShadow: '0 40px 120px -40px rgba(0,0,0,0.8)',
            padding: 'clamp(20px, 3vw, 30px)',
          }}
        >
          <PortalNav />

          {/* greeting */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              margin: '22px 0 18px',
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: T.display,
                  fontWeight: 800,
                  fontSize: '30px',
                  lineHeight: 1,
                  color: T.heading,
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Hi, <span style={{ color: T.greenBright }}>{CLIENT.first}</span>
              </h3>
              <div
                style={{
                  marginTop: '7px',
                  fontFamily: T.sans,
                  fontSize: '12.5px',
                  color: T.muted,
                }}
              >
                {CLIENT.subline}
              </div>
            </div>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 14px',
                borderRadius: '13px',
                background: T.card,
                border: `1px solid ${T.border}`,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"
                  stroke="#5dffa0"
                  strokeWidth="1.6"
                />
                <circle cx="12" cy="10" r="2.4" stroke="#5dffa0" strokeWidth="1.6" />
              </svg>
              <span style={{ fontFamily: T.sans, fontSize: '13px', color: T.heading, fontWeight: 600 }}>
                {CLIENT.address}
              </span>
              <span
                style={{ width: '3px', height: '3px', borderRadius: '50%', background: T.faint }}
              />
              <Micro>{CLIENT.city}</Micro>
            </span>
          </div>

          {/* columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
              gap: '18px',
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
              <HeroCard reduced={reduced} />
              <ScheduleStrip reduced={reduced} />
              <BeforeAfterCard reduced={reduced} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
              <PaymentCard reduced={reduced} />
              <MessageCard reduced={reduced} />
            </div>
          </div>

          {/* footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '9px',
              marginTop: '22px',
              paddingTop: '18px',
              borderTop: `1px solid ${T.hair}`,
            }}
          >
            <LeafMark size={14} fill="#2ad16a" />
            <Micro style={{ fontSize: '9px' }}>Powered by</Micro>
            <span
              style={{ fontFamily: T.display, fontWeight: 800, fontSize: '11px', color: T.muted }}
            >
              YardWorx
            </span>
            <Micro style={{ fontSize: '9px', marginLeft: '6px' }}>
              · Your trusted lawn &amp; landscape partner
            </Micro>
          </div>
        </motion.div>
      </div>

      <GrainVignette />
    </section>
  )
}
