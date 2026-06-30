import { Fragment } from 'react'
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
  violet: '#7c3aed',
  stripe: '#a7a4ff',
  heading: '#fafafa',
  body: '#d4d4d8',
  muted: '#a1a1aa',
  faint: '#71717a',
  card: 'rgba(255,255,255,0.04)',
  cardHi: 'rgba(255,255,255,0.055)',
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

type RailState = 'done' | 'cur' | 'todo'
type RailNode = { label: string; state: RailState }
const RAIL_NODES: RailNode[] = [
  { label: 'Import', state: 'done' },
  { label: 'Payments', state: 'done' },
  { label: 'Crew', state: 'cur' },
]
// Connector fills between nodes: first solid (done→done), second partial (done→current)
const RAIL_LINES: Array<'fill' | 'partial' | 'empty'> = ['fill', 'partial']

const STEP1 = {
  stepno: 'Step 01 · Data',
  title: 'Import customers',
  desc: 'Sync from your books or drop a CSV. We dedupe and map automatically.',
  found: '248 customers',
}

const STEP2 = {
  stepno: 'Step 02 · Money',
  title: 'Connect payments',
  desc: 'Get paid by card, ACH & tap. Payouts land next business day.',
  paylines: [
    { label: 'Auto-invoice on job close', value: 'On' },
    { label: 'Payout schedule', value: 'Daily' },
  ],
}

type Crew = { initial: string; name: string; role: string; from: string; to: string }
const STEP3 = {
  stepno: 'Step 03 · People',
  title: 'Add your crew',
  desc: 'Invite foremen & techs. They get the field app instantly.',
  crew: [
    { initial: 'M', name: 'Marcus Reyes', role: 'Foreman', from: '#2ad16a', to: '#047a32' },
    { initial: 'D', name: 'Dani Okafor', role: 'Tech', from: '#f97316', to: '#9a3412' },
  ] as Crew[],
  invitePhone: '(602) 555-0148',
}

const FINISH = { label: 'Finish setup', timer: '0:12 elapsed' }
const HERO = {
  eyebrow: 'First-run setup · 12-second magic',
  subBeforeNote: 'Three steps. Then ',
  cuttyWord: 'Cutty',
  subAfterNote: ' runs the rest — scheduling crews, chasing invoices, and routing jobs while you sleep.',
}

// Live preview cockpit
const COCKPIT = {
  greeting: 'Good morning, GreenView Lawn Co.',
  sub: 'Tuesday · 7 crews · 248 active accounts',
}

type Kpi = {
  label: string
  value: string
  suffix?: string
  valueTone: 'g' | 'o' | 'plain'
  delta: string
  deltaColor: string
  glow: 'g' | 'o' | 'none'
}
const KPIS: Kpi[] = [
  {
    label: 'Revenue · MTD',
    value: '$84,210',
    valueTone: 'g',
    delta: '▲ 18.4% vs last month',
    deltaColor: T.greenBright,
    glow: 'g',
  },
  {
    label: 'Jobs today',
    value: '37',
    valueTone: 'o',
    delta: '11 routed · 26 queued',
    deltaColor: T.orangeBright,
    glow: 'o',
  },
  {
    label: 'Outstanding',
    value: '$12,640',
    valueTone: 'plain',
    delta: '9 invoices · Cutty chasing',
    deltaColor: T.muted,
    glow: 'none',
  },
  {
    label: 'Crew on clock',
    value: '5',
    suffix: ' / 7',
    valueTone: 'g',
    delta: 'Marcus · Dani live',
    deltaColor: T.greenBright,
    glow: 'none',
  },
]

const CHART = { label: 'Weekly revenue', value: '$84.2k' }
const MAP = { label: "Today's routes · Phoenix metro", count: '37 stops optimized' }
type Pin = { left: string; top: string; tone: 'neon' | 'orange' }
const MAP_PINS: Pin[] = [
  { left: '14%', top: '62%', tone: 'neon' },
  { left: '34%', top: '36%', tone: 'neon' },
  { left: '55%', top: '48%', tone: 'orange' },
  { left: '72%', top: '28%', tone: 'neon' },
  { left: '88%', top: '40%', tone: 'orange' },
]
const CUTTY_TIP =
  "is ready. I'll route today's 37 jobs and text reminders the moment you finish."

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
  borderRadius: '18px',
  background: T.card,
  border: `1px solid ${T.border}`,
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '0 18px 50px rgba(0,0,0,0.4)',
  overflow: 'hidden',
}

const activeCardShadow =
  '0 18px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(45,209,106,0.25), 0 0 40px rgba(5,168,69,0.18) inset'

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
          'radial-gradient(1000px 600px at 22% 8%, rgba(5,168,69,0.18), transparent 60%)',
          'radial-gradient(820px 560px at 90% 18%, rgba(45,209,106,0.11), transparent 62%)',
          'radial-gradient(700px 520px at 78% 100%, rgba(232,93,4,0.10), transparent 60%)',
          'radial-gradient(660px 540px at 4% 94%, rgba(124,58,237,0.09), transparent 62%)',
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
            'radial-gradient(120% 100% at 50% 42%, transparent 55%, rgba(0,0,0,0.55) 100%)',
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
        <filter id="onboardGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#onboardGrain)" />
      </svg>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Small icon set (paths copied from mockup)                           */
/* ------------------------------------------------------------------ */

function CheckBadge({ size = 18, dot = 11 }: { size?: number; dot?: number }) {
  return (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: `linear-gradient(180deg, ${T.greenBright}, ${T.green})`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        boxShadow: '0 0 12px rgba(45,209,106,0.55)',
      }}
    >
      <svg width={dot} height={dot} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12.5l4.2 4.2L19 7"
          stroke="#04210f"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function StepIcon({ kind }: { kind: 'data' | 'money' | 'people' }) {
  if (kind === 'data') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 7c0-1.5 4-2.5 9-2.5S21 5.5 21 7v10c0 1.5-4 2.5-9 2.5S3 18.5 3 17V7z"
          stroke={T.neon}
          strokeWidth="1.5"
        />
        <path
          d="M3 7c0 1.5 4 2.5 9 2.5S21 8.5 21 7M3 12c0 1.5 4 2.5 9 2.5S21 13.5 21 12"
          stroke={T.neon}
          strokeWidth="1.5"
        />
      </svg>
    )
  }
  if (kind === 'money') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="13" rx="2.5" stroke={T.neon} strokeWidth="1.5" />
        <path d="M3 10h18" stroke={T.neon} strokeWidth="1.5" />
        <path d="M7 15h4" stroke={T.neon} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke={T.neon} strokeWidth="1.5" />
      <path
        d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        stroke={T.neon}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.3" stroke={T.neon} strokeWidth="1.5" />
      <path d="M16 14.3c2.2.4 4 2.2 4 4.7" stroke={T.neon} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CuttyLeaf({ size = 16, fill }: { size?: number; fill: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2C12 8 6 9 4 14c-1.5 3.7 1 7 6 7s7.5-3.3 6-7c-2-5-8-6-8-12z" fill={fill} />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Progress rail                                                       */
/* ------------------------------------------------------------------ */

function ProgressRail({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.12 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0,
        marginBottom: '22px',
        maxWidth: '560px',
      }}
    >
      {RAIL_NODES.map((node, i) => {
        const line = RAIL_LINES[i - 1]
        return (
          <Fragment key={node.label}>
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{
                  flex: 1,
                  height: '2px',
                  margin: '14px 12px 0',
                  borderRadius: '2px',
                  background:
                    line === 'fill'
                      ? `linear-gradient(90deg, ${T.green}, ${T.greenBright})`
                      : line === 'partial'
                        ? `linear-gradient(90deg, ${T.greenBright} 50%, rgba(255,255,255,0.07) 50%)`
                        : 'rgba(255,255,255,0.07)',
                  boxShadow: line === 'fill' ? '0 0 10px rgba(45,209,106,0.4)' : 'none',
                }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '7px' }}>
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: T.mono,
                  fontSize: '12px',
                  fontWeight: 700,
                  ...(node.state === 'done'
                    ? {
                        background: `linear-gradient(180deg, ${T.greenBright}, ${T.green})`,
                        color: '#04210f',
                        boxShadow: '0 0 16px rgba(45,209,106,0.5)',
                      }
                    : node.state === 'cur'
                      ? {
                          background: 'rgba(232,93,4,0.14)',
                          color: T.orangeBright,
                          border: '1.5px solid rgba(249,115,22,0.55)',
                          boxShadow: '0 0 16px rgba(232,93,4,0.32)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.04)',
                          color: T.faint,
                          border: `1px solid ${T.border}`,
                        }),
                }}
              >
                {node.state === 'done' ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12.5l4.2 4.2L19 7"
                      stroke="#04210f"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  String(i + 1)
                )}
              </span>
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: '8.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                  color: T.body,
                  whiteSpace: 'nowrap',
                }}
              >
                {node.label}
              </span>
            </div>
          </Fragment>
        )
      })}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Step cards                                                          */
/* ------------------------------------------------------------------ */

function StepCardShell({
  reduced,
  delay,
  glow,
  children,
}: {
  reduced: boolean
  delay: number
  glow: string
  children: ReactNode
}) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : delay }}
      style={{
        ...cardStyle,
        padding: '18px 17px 17px',
        border: '1px solid rgba(45,209,106,0.4)',
        boxShadow: activeCardShadow,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-40px',
          left: '-20px',
          width: '140px',
          height: '90px',
          borderRadius: '50%',
          filter: 'blur(34px)',
          opacity: 0.5,
          background: `radial-gradient(circle, ${glow}, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {children}
    </motion.div>
  )
}

function IconWrap({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '11px',
        display: 'grid',
        placeItems: 'center',
        marginBottom: '13px',
        background: 'rgba(45,209,106,0.1)',
        border: '1px solid rgba(45,209,106,0.3)',
        boxShadow: '0 0 18px rgba(45,209,106,0.18)',
      }}
    >
      {children}
    </span>
  )
}

function StepHeading({ stepno, title, desc }: { stepno: string; title: string; desc: string }) {
  return (
    <>
      <div
        style={{
          fontFamily: T.mono,
          fontSize: '9px',
          letterSpacing: '0.2em',
          color: T.neon,
          marginBottom: '10px',
          textTransform: 'uppercase',
        }}
      >
        {stepno}
      </div>
      <h3
        style={{
          fontFamily: T.display,
          fontWeight: 700,
          fontSize: '16px',
          color: T.heading,
          margin: '0 0 4px',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: '11.5px', color: T.muted, lineHeight: 1.4, margin: '0 0 14px' }}>{desc}</p>
    </>
  )
}

function MiniOpt({
  icon,
  label,
  faint,
}: {
  icon: ReactNode
  label: string
  faint?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '9px 11px',
        borderRadius: '11px',
        fontSize: '12px',
        fontWeight: faint ? 500 : 600,
        color: faint ? T.muted : T.body,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${T.border}`,
        marginBottom: '8px',
      }}
    >
      {icon}
      {label}
    </div>
  )
}

function SuccessRow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '11px',
        padding: '9px 11px',
        borderRadius: '11px',
        background: 'rgba(45,209,106,0.1)',
        border: '1px solid rgba(45,209,106,0.3)',
      }}
    >
      <CheckBadge />
      <span style={{ fontSize: '12px', fontWeight: 600, color: T.neon }}>{children}</span>
    </div>
  )
}

function Step1Card({ reduced }: { reduced: boolean }) {
  return (
    <StepCardShell reduced={reduced} delay={0.18} glow="rgba(45,209,106,0.5)">
      <IconWrap>
        <StepIcon kind="data" />
      </IconWrap>
      <StepHeading {...STEP1} />
      <MiniOpt
        label="Connect QuickBooks"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="4" fill="#2CA01C" />
            <path d="M12 7.5a4.5 4.5 0 100 9M12 7.5v9" stroke="#fff" strokeWidth="1.6" />
          </svg>
        }
      />
      <MiniOpt
        faint
        label="Upload CSV"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path
              d="M12 16V4m0 0l-4 4m4-4l4 4M5 16v3a1 1 0 001 1h12a1 1 0 001-1v-3"
              stroke={T.muted}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />
      <SuccessRow>
        <b style={{ fontFamily: T.display, fontWeight: 800, color: '#fff', fontSize: '13px' }}>
          {STEP1.found}
        </b>{' '}
        found
      </SuccessRow>
    </StepCardShell>
  )
}

function Step2Card({ reduced }: { reduced: boolean }) {
  return (
    <StepCardShell reduced={reduced} delay={0.26} glow="rgba(124,116,255,0.4)">
      <IconWrap>
        <StepIcon kind="money" />
      </IconWrap>
      <StepHeading {...STEP2} />
      {/* stripe connect row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderRadius: '12px',
          background: 'linear-gradient(180deg, rgba(99,91,255,0.12), rgba(99,91,255,0.04))',
          border: '1px solid rgba(124,116,255,0.3)',
          marginBottom: '10px',
        }}
      >
        <span
          style={{
            fontFamily: T.display,
            fontWeight: 800,
            fontSize: '14px',
            color: T.stripe,
            letterSpacing: '-0.02em',
          }}
        >
          stripe
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            color: T.neon,
            padding: '5px 10px',
            borderRadius: '999px',
            background: 'rgba(45,209,106,0.12)',
            border: '1px solid rgba(45,209,106,0.35)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: T.neon,
              boxShadow: `0 0 8px ${T.neon}`,
            }}
          />
          Connected
        </span>
      </div>
      {STEP2.paylines.map((p) => (
        <div
          key={p.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: T.muted,
            padding: '4px 2px',
          }}
        >
          <span>{p.label}</span>
          <b style={{ color: T.body, fontWeight: 600 }}>{p.value}</b>
        </div>
      ))}
      <SuccessRow>
        Ready to <b style={{ fontFamily: T.display, fontWeight: 800, color: '#fff', fontSize: '13px' }}>accept cards</b>
      </SuccessRow>
    </StepCardShell>
  )
}

function Step3Card({ reduced }: { reduced: boolean }) {
  return (
    <StepCardShell reduced={reduced} delay={0.34} glow="rgba(232,93,4,0.4)">
      <IconWrap>
        <StepIcon kind="people" />
      </IconWrap>
      <StepHeading {...STEP3} />
      {/* avatar stack */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        {STEP3.crew.map((c, i) => (
          <span
            key={c.name}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '14px',
              color: '#fff',
              marginLeft: i === 0 ? 0 : '-10px',
              border: '2px solid #0b0b0d',
              boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
              background: `linear-gradient(150deg, ${c.from}, ${c.to})`,
            }}
          >
            {c.initial}
          </span>
        ))}
        <span
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: '18px',
            color: T.faint,
            marginLeft: '-10px',
            background: 'rgba(255,255,255,0.05)',
            border: '2px dashed rgba(255,255,255,0.2)',
          }}
        >
          +
        </span>
      </div>
      {STEP3.crew.map((c) => (
        <div
          key={c.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            padding: '5px 2px',
          }}
        >
          <span style={{ color: T.body, fontWeight: 600 }}>{c.name}</span>
          <span style={{ color: T.faint, fontSize: '10px' }}>{c.role}</span>
        </div>
      ))}
      {/* invite-by-text row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '11px',
          padding: '8px 10px',
          borderRadius: '11px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${T.border}`,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M4 5h16v14H4z" stroke={T.faint} strokeWidth="1.5" />
          <path d="M4 6l8 6 8-6" stroke={T.faint} strokeWidth="1.5" />
        </svg>
        <span
          style={{
            flex: 1,
            fontSize: '11.5px',
            color: T.muted,
            fontFamily: T.mono,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {STEP3.invitePhone}
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '1.5px',
              height: '14px',
              marginLeft: '3px',
              background: T.greenBright,
              boxShadow: `0 0 6px ${T.greenBright}`,
              animation: reduced ? undefined : 'blink 1s step-end infinite',
            }}
          />
        </span>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            color: '#04210f',
            padding: '5px 10px',
            borderRadius: '8px',
            background: `linear-gradient(180deg, ${T.greenBright}, ${T.green})`,
            boxShadow: '0 0 12px rgba(45,209,106,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          Invite by text
        </span>
      </div>
    </StepCardShell>
  )
}

/* ------------------------------------------------------------------ */
/* Finish bar                                                          */
/* ------------------------------------------------------------------ */

function FinishBar({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.42 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        flexWrap: 'wrap',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 30px',
          borderRadius: '15px',
          cursor: 'pointer',
          background: `linear-gradient(180deg, ${T.greenBright}, ${T.green} 60%, ${T.greenDeep})`,
          boxShadow:
            '0 14px 44px rgba(5,168,69,0.45), 0 0 0 1px rgba(93,255,160,0.3) inset, 0 1px 0 rgba(255,255,255,0.35) inset',
        }}
      >
        <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: '16.5px', color: '#042611', letterSpacing: '-0.01em' }}>
          {FINISH.label}
        </span>
        <span
          style={{
            fontFamily: T.mono,
            fontSize: '12px',
            fontWeight: 700,
            color: 'rgba(4,38,17,0.78)',
            padding: '4px 9px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.28)',
          }}
        >
          {FINISH.timer}
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12h14m0 0l-6-6m6 6l-6 6"
            stroke="#042611"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div style={{ fontSize: '12px', color: T.faint, lineHeight: 1.5 }}>
        All set, <b style={{ color: T.muted, fontWeight: 600 }}>Marcus &amp; Dani</b> notified.
        <br />
        You can tune anything later in Settings.
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Live preview cockpit                                                */
/* ------------------------------------------------------------------ */

function ChartSvg() {
  return (
    <svg width="100%" height="48" viewBox="0 0 380 48" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="onboardArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.greenBright} stopOpacity="0.35" />
          <stop offset="100%" stopColor={T.greenBright} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,40 C40,38 60,28 90,30 C130,33 150,16 190,18 C230,20 250,10 290,12 C320,13 350,6 380,8 L380,48 L0,48 Z"
        fill="url(#onboardArea)"
      />
      <path
        d="M0,40 C40,38 60,28 90,30 C130,33 150,16 190,18 C230,20 250,10 290,12 C320,13 350,6 380,8"
        fill="none"
        stroke={T.neon}
        strokeWidth="2"
      />
      <circle cx="380" cy="8" r="3" fill={T.neon} />
    </svg>
  )
}

function MapSvg() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 430 118"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0 }}
    >
      <path
        d="M-10,90 C80,70 120,95 200,60 C270,30 330,55 440,30"
        fill="none"
        stroke="rgba(45,209,106,0.45)"
        strokeWidth="2"
        strokeDasharray="2 5"
      />
      <path
        d="M40,110 C100,90 150,40 240,55 C320,68 360,40 430,48"
        fill="none"
        stroke="rgba(232,93,4,0.4)"
        strokeWidth="2"
        strokeDasharray="2 5"
      />
    </svg>
  )
}

function Kpi({ kpi }: { kpi: Kpi }) {
  const valColor =
    kpi.valueTone === 'g' ? T.neon : kpi.valueTone === 'o' ? T.orangeBright : T.heading
  return (
    <div
      style={{
        borderRadius: '14px',
        padding: '13px 14px',
        background: 'rgba(255,255,255,0.04)',
        border:
          kpi.glow === 'g'
            ? '1px solid rgba(45,209,106,0.25)'
            : kpi.glow === 'o'
              ? '1px solid rgba(232,93,4,0.25)'
              : `1px solid ${T.border}`,
        boxShadow:
          kpi.glow === 'g'
            ? '0 0 26px rgba(5,168,69,0.12) inset'
            : kpi.glow === 'o'
              ? '0 0 26px rgba(232,93,4,0.12) inset'
              : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: T.mono,
          fontSize: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: T.faint,
          marginBottom: '6px',
        }}
      >
        {kpi.label}
      </div>
      <div
        style={{
          fontFamily: T.display,
          fontWeight: 800,
          fontSize: '22px',
          color: valColor,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {kpi.value}
        {kpi.suffix && <span style={{ fontSize: '13px', color: T.faint, fontWeight: 500 }}>{kpi.suffix}</span>}
      </div>
      <div style={{ fontSize: '9.5px', fontWeight: 600, marginTop: '5px', color: kpi.deltaColor }}>
        {kpi.delta}
      </div>
    </div>
  )
}

function LivePreview({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.15 }}
      style={{
        position: 'relative',
        borderRadius: '22px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border: `1px solid ${T.border}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 60px rgba(5,168,69,0.1)',
        minWidth: 0,
        alignSelf: 'start',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '240px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,209,106,0.3), transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />
      {/* head */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '15px 18px',
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <Micro color={T.neon}>Live preview · your cockpit</Micro>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: T.mono,
            fontSize: '9.5px',
            letterSpacing: '0.16em',
            color: T.greenBright,
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: T.neon,
              boxShadow: `0 0 10px ${T.neon}`,
              animation: reduced ? undefined : 'scanPulse 1.6s ease-in-out infinite',
            }}
          />
          Coming alive
        </span>
      </div>
      {/* body */}
      <div style={{ position: 'relative', zIndex: 2, padding: '16px 18px 20px' }}>
        <p
          style={{
            fontFamily: T.display,
            fontWeight: 800,
            fontSize: '15px',
            color: T.heading,
            margin: '0 0 2px',
            letterSpacing: '-0.01em',
          }}
        >
          {COCKPIT.greeting}
        </p>
        <p style={{ fontSize: '11px', color: T.faint, margin: '0 0 16px' }}>{COCKPIT.sub}</p>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '11px', marginBottom: '15px' }}>
          {KPIS.map((k) => (
            <Kpi key={k.label} kpi={k} />
          ))}
        </div>

        {/* chart */}
        <div
          style={{
            borderRadius: '14px',
            padding: '13px 14px 8px',
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${T.border}`,
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Micro style={{ fontSize: '8px', letterSpacing: '0.16em' }}>{CHART.label}</Micro>
            <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: '14px', color: T.heading }}>
              {CHART.value}
            </span>
          </div>
          <ChartSvg />
        </div>

        {/* mini route map */}
        <div
          style={{
            position: 'relative',
            borderRadius: '14px',
            height: '118px',
            overflow: 'hidden',
            border: `1px solid ${T.border}`,
            background:
              'radial-gradient(120px 90px at 70% 30%, rgba(5,168,69,0.16), transparent 70%), linear-gradient(160deg,#0a120d,#070809)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '12px',
              zIndex: 3,
              fontFamily: T.mono,
              fontSize: '8px',
              letterSpacing: '0.16em',
              color: T.neon,
              textTransform: 'uppercase',
            }}
          >
            {MAP.label}
          </span>
          <span
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '12px',
              zIndex: 3,
              fontFamily: T.mono,
              fontSize: '9px',
              color: T.muted,
            }}
          >
            {MAP.count}
          </span>
          <MapSvg />
          {MAP_PINS.map((pin, i) => (
            <span
              key={`${pin.left}-${pin.top}-${i}`}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: pin.left,
                top: pin.top,
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                zIndex: 2,
                background: pin.tone === 'orange' ? T.orangeBright : T.neon,
                boxShadow: pin.tone === 'orange' ? `0 0 10px ${T.orangeBright}` : `0 0 10px ${T.neon}`,
              }}
            />
          ))}
        </div>

        {/* cutty tip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '13px',
            padding: '11px 12px',
            borderRadius: '13px',
            background: 'linear-gradient(180deg, rgba(45,209,106,0.1), rgba(45,209,106,0.03))',
            border: '1px solid rgba(45,209,106,0.25)',
          }}
        >
          <span
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '9px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              background: `linear-gradient(150deg, ${T.greenBright}, ${T.greenDeep})`,
              boxShadow: '0 0 16px rgba(45,209,106,0.4)',
            }}
          >
            <CuttyLeaf fill="#042611" />
          </span>
          <span style={{ fontSize: '11px', color: T.body, lineHeight: 1.35 }}>
            <b style={{ color: T.neon, fontWeight: 600 }}>Cutty</b> {CUTTY_TIP}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero column                                                         */
/* ------------------------------------------------------------------ */

function HeroColumn({ reduced }: { reduced: boolean }) {
  return (
    <div style={{ textAlign: 'left', minWidth: 0 }}>
      <motion.span
        initial={reduced ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={SPRING}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          padding: '5px 12px',
          borderRadius: '999px',
          background: 'rgba(45,209,106,0.08)',
          border: '1px solid rgba(45,209,106,0.22)',
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
        <Micro color={T.neon}>{HERO.eyebrow}</Micro>
      </motion.span>

      <motion.h2
        id="onboarding-heading"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ ...SPRING, delay: reduced ? 0 : 0.05 }}
        style={{
          fontFamily: T.display,
          fontWeight: 800,
          fontSize: 'clamp(30px, 4.4vw, 40px)',
          lineHeight: 1.04,
          letterSpacing: '-0.025em',
          color: T.heading,
          margin: '0 0 12px',
        }}
      >
        Let&apos;s build your{' '}
        <span
          style={{
            backgroundImage: `linear-gradient(120deg, ${T.neon}, ${T.greenBright} 55%, ${T.green})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.32))',
          }}
        >
          yard empire.
        </span>
      </motion.h2>

      <motion.p
        initial={reduced ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ ...SPRING, delay: reduced ? 0 : 0.08 }}
        style={{
          fontSize: 'clamp(14px, 2.5vw, 15px)',
          color: T.muted,
          maxWidth: '520px',
          lineHeight: 1.5,
          margin: '0 0 26px',
        }}
      >
        {HERO.subBeforeNote}
        <b style={{ color: T.body, fontWeight: 600 }}>{HERO.cuttyWord}</b>
        {HERO.subAfterNote}
      </motion.p>

      <ProgressRail reduced={reduced} />

      {/* step cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '22px',
        }}
      >
        <Step1Card reduced={reduced} />
        <Step2Card reduced={reduced} />
        <Step3Card reduced={reduced} />
      </div>

      <FinishBar reduced={reduced} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function Onboarding() {
  const reduced = useReducedMotion()

  return (
    <section
      aria-labelledby="onboarding-heading"
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        padding: 'clamp(56px, 8vw, 96px) 24px',
        boxSizing: 'border-box',
      }}
    >
      <GlowField />

      <div
        style={{
          position: 'relative',
          zIndex: 15,
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 470px)',
          gap: '30px',
          alignItems: 'start',
        }}
        className="onboarding-grid"
      >
        <HeroColumn reduced={reduced} />
        <LivePreview reduced={reduced} />
      </div>

      <GrainVignette />

      {/* responsive reflow — single column under 980px */}
      <style>{`
        @media (max-width: 980px) {
          .onboarding-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </section>
  )
}
