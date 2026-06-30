import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/useScrollBeat'

/* ============================================================================
 * Invoicing & Payments — product-tour section ("Paid before you park the truck.")
 *
 * The one warm-accent screen of the tour: orange is the hero "money" accent for
 * the outstanding figure, while neon green carries the PAID stamp, the $365.00
 * glow total, and the Stripe payment-received toast — "the money just landed."
 *
 * Self-contained: every sub-component, style token, and SVG lives in this file
 * (no src/components/ui dependency). Inline styles only; canonical spring
 * {stiffness:320,damping:28}; all reveals are whileInView + viewport once. Every
 * decorative/looping animation is gated behind useReducedMotion() so the section
 * reads as a finished still frame under prefers-reduced-motion (PAID stamp placed,
 * toast visible, dots static).
 * ==========================================================================*/

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 }

// ---- tokens (mirror design-tokens.md §1; no ui-primitive imports) -----------
const t = {
  green: '#05a845',
  greenBright: '#2ad16a',
  greenDeep: '#047a32',
  greenNeon: '#5dffa0',
  orange: '#E85D04',
  orangeBright: '#f97316',
  h: '#fafafa',
  body: '#d4d4d8',
  muted: '#a1a1aa',
  faint: '#71717a',
  card: 'rgba(255,255,255,0.04)',
  bd: 'rgba(255,255,255,0.08)',
  hair: 'rgba(255,255,255,0.07)',
}
const MONO = "'JetBrains Mono', monospace"
const DISPLAY = "'Outfit', sans-serif"
const BODY = "'Inter', sans-serif"

// =============================================================================
// Data shapes + seed (verbatim from scratchpad/mockups/invoice.html)
// =============================================================================

type LineItem = { desc: string; qty: string; amount: string }

type InvoiceData = {
  number: string
  issued: string
  billedToName: string
  billedToAddr: string[]
  jobId: string
  crew: string
  status: string
  paidDate: string
  lineItems: LineItem[]
  subtotal: string
  tax: string
  taxLabel: string
  total: string
  payMethod: string
}

const INVOICE: InvoiceData = {
  number: 'INVOICE #1042',
  issued: 'ISSUED 06 / 30 / 2026 · DUE ON RECEIPT',
  billedToName: 'Johnson Property',
  billedToAddr: ['4218 Magnolia Ridge Dr', 'Franklin, TN 37064'],
  jobId: 'Job #JX-2287',
  crew: 'Crew: Meridian Team 3',
  status: 'PAID IN FULL',
  paidDate: 'JUN 30 · 2026',
  lineItems: [
    { desc: 'Lawn mow & edge — full property', qty: '0.6 ac', amount: '$185.00' },
    { desc: 'Hedge & shrub trim', qty: '11 units', amount: '$120.00' },
    { desc: 'Bed cleanup + blow-down', qty: 'flat', amount: '$60.00' },
  ],
  subtotal: '$365.00',
  tax: '$0.00',
  taxLabel: 'Tax (exempt)',
  total: '$365.00',
  payMethod: 'Visa ···· 4471 · auto-charged',
}

const TOAST = {
  amount: '$365.00 received',
  meta: 'VISA ····4471 · TXN ch_3PqL · 2 MIN AGO',
}

type PaymentsWeek = {
  total: string
  onTimePct: string
  invoicesCollected: string
  bars: number[]
  peakIdx: number[]
  peakLabel: string
}

const PAYMENTS_WEEK: PaymentsWeek = {
  total: '$12,480',
  onTimePct: '96% on-time',
  invoicesCollected: '31 invoices collected',
  bars: [0.4, 0.62, 0.49, 0.8, 0.68, 0.9, 0.55],
  peakIdx: [3, 5],
  peakLabel: 'PEAK · THU $3,140',
}

const OUTSTANDING = {
  amount: '$1,940',
  invoiceCount: 'across 4 invoices',
  avgDaysToPay: '1.3',
}

type StepIcon = 'mail' | 'clock' | 'star'
type FlagColor = 'neon' | 'faint' | 'orange'
type AutomationStep = {
  icon: StepIcon
  title: string
  sub: string
  flag: string
  flagColor: FlagColor
}

const AUTOMATION_STEPS: AutomationStep[] = [
  { icon: 'mail', title: 'Invoice sent on job complete', sub: 'Triggered 12:41 PM · delivered', flag: 'DONE', flagColor: 'neon' },
  { icon: 'clock', title: 'Reminder at +3 days', sub: 'Skipped — paid same day', flag: 'N/A', flagColor: 'faint' },
  { icon: 'star', title: 'Receipt + review request on payment', sub: 'Queued · sends in 4 min', flag: 'NEXT', flagColor: 'orange' },
]

const TIME_SAVED = {
  hours: '14.5 hrs',
  context: 'on chasing payments',
  detail: '218 invoices handled untouched',
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// =============================================================================
// Responsive hook — matchMedia listeners (zero-dep, inside this file)
// =============================================================================

type Layout = 'desktop' | 'tablet' | 'mobile'

function useLayout(): Layout {
  const [layout, setLayout] = useState<Layout>('desktop')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mobileMq = window.matchMedia('(max-width: 639px)')
    const tabletMq = window.matchMedia('(max-width: 999px)')

    const compute = () => {
      if (mobileMq.matches) setLayout('mobile')
      else if (tabletMq.matches) setLayout('tablet')
      else setLayout('desktop')
    }

    compute()
    mobileMq.addEventListener('change', compute)
    tabletMq.addEventListener('change', compute)
    return () => {
      mobileMq.removeEventListener('change', compute)
      tabletMq.removeEventListener('change', compute)
    }
  }, [])

  return layout
}

// =============================================================================
// Small inline primitives
// =============================================================================

function MicroLabel({
  children,
  variant = 'faint',
  style,
}: {
  children: React.ReactNode
  variant?: 'faint' | 'green'
  style?: React.CSSProperties
}) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: '9.5px',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: variant === 'green' ? t.greenBright : t.faint,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

function PulseDot({ reduced, color = t.greenNeon, size = 7 }: { reduced: boolean; color?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        animation: reduced ? undefined : 'scanPulse 1.8s ease-in-out infinite',
      }}
    />
  )
}

function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${t.bd}`,
        borderRadius: '18px',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        padding: '20px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ---- inline SVG glyphs ------------------------------------------------------

function CheckGlyph({ color = t.greenNeon, size = 12 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.5L6.5 12L13 4.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LeafMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 4C9 4 4 9 4 18c0 1 0 2 0 2s9 1 14-4c4-4 2-12 2-12z"
        fill="rgba(45,209,106,0.16)"
        stroke={t.greenBright}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M16 8C12 11 8 15 6.5 19.5" stroke={t.greenNeon} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function StepIconGlyph({ kind }: { kind: StepIcon }) {
  const stroke = t.greenNeon
  if (kind === 'mail') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke={stroke} strokeWidth="1.6" />
        <path d="M3.5 6.5L12 13L20.5 6.5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'clock') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" stroke={stroke} strokeWidth="1.6" />
        <path d="M12 7.5V12L15 14" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l2.6 5.3 5.9.86-4.25 4.14 1 5.87L12 16.9l-5.25 2.77 1-5.87L3.5 9.16l5.9-.86L12 3z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="rgba(93,255,160,0.12)"
      />
    </svg>
  )
}

// =============================================================================
// Decorative background — SectionGlow + GrainVignette (pointer-events:none)
// =============================================================================

function SectionGlow() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: [
          'radial-gradient(60% 50% at 50% 0%, rgba(93,255,160,0.12), transparent 60%)',
          'radial-gradient(70% 60% at 50% 40%, rgba(5,168,69,0.14), transparent 60%)',
          'radial-gradient(55% 50% at 88% 84%, rgba(232,93,4,0.10), transparent 60%)',
          'radial-gradient(50% 50% at 12% 82%, rgba(124,58,237,0.08), transparent 60%)',
          'linear-gradient(160deg,#09090b 0%,#050506 60%,#060607 100%)',
        ].join(','),
      }}
    />
  )
}

function FloorGlow() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '8%',
        width: '460px',
        height: '180px',
        transform: 'translateX(-50%)',
        background: 'radial-gradient(50% 50% at 50% 50%, rgba(5,168,69,0.28), transparent 70%)',
        filter: 'blur(22px)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

function GrainVignette() {
  return (
    <>
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 1 }}
      >
        <filter id="invoice-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#invoice-grain)" />
      </svg>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          background: 'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </>
  )
}

// =============================================================================
// Header
// =============================================================================

function Header({ reduced }: { reduced: boolean }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 40px' }}>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ ...SPRING, delay: 0 }}
        style={{ marginBottom: '16px' }}
      >
        <MicroLabel variant="green" style={{ fontSize: '10px', letterSpacing: '0.24em' }}>
          Invoicing &amp; Payments
        </MicroLabel>
      </motion.div>

      <motion.h2
        initial={reduced ? false : { opacity: 0, y: 20 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ ...SPRING, delay: 0.08 }}
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 'clamp(28px, 4.4vw, 44px)',
          color: t.h,
          lineHeight: 1.12,
          margin: '0 0 14px 0',
        }}
      >
        <span
          style={{
            background: `linear-gradient(90deg, ${t.greenBright}, ${t.greenNeon})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          Paid
        </span>{' '}
        before you park the truck.
      </motion.h2>

      <motion.p
        initial={reduced ? false : { opacity: 0, y: 20 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ ...SPRING, delay: 0.16 }}
        style={{
          fontFamily: BODY,
          fontWeight: 400,
          fontSize: 'clamp(15px, 2vw, 16px)',
          color: t.muted,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Cutty fires the invoice the second a job is marked complete, charges the card on
        file, and sends the receipt — so payment lands before the crew leaves the
        driveway. No chasing, no paper, no net-30.
      </motion.p>
    </div>
  )
}

// =============================================================================
// Left rail
// =============================================================================

function Sparkbars({ data }: { data: PaymentsWeek }) {
  const W = 250
  const H = 78
  const n = data.bars.length
  const gap = 12
  const barW = (W - gap * (n - 1)) / n
  const maxH = H - 8

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label="Payments collected per day this week, peaking Thursday and Saturday" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="bar-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.greenBright} />
          <stop offset="100%" stopColor={t.green} />
        </linearGradient>
        <linearGradient id="bar-peak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.greenNeon} />
          <stop offset="100%" stopColor={t.greenDeep} />
        </linearGradient>
      </defs>
      {data.bars.map((v, i) => {
        const isPeak = data.peakIdx.includes(i)
        const bh = Math.max(4, v * maxH)
        const x = i * (barW + gap)
        const y = H - bh
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx={3}
              fill={isPeak ? 'url(#bar-peak)' : 'url(#bar-base)'}
              style={isPeak ? { filter: 'drop-shadow(0 0 6px rgba(93,255,160,0.6))' } : undefined}
            />
            <text x={x + barW / 2} y={H + 12} textAnchor="middle" fontFamily={MONO} fontSize="7" fontWeight={700} fill={isPeak ? t.greenNeon : t.faint}>
              {DAY_LABELS[i]}
            </text>
          </g>
        )
      })}
      <line x1="0" y1={H} x2={W} y2={H} stroke={t.hair} strokeWidth="1" />
    </svg>
  )
}

function PaymentsThisWeekCard({ data, reduced }: { data: PaymentsWeek; reduced: boolean }) {
  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <PulseDot reduced={reduced} size={6} />
        <MicroLabel variant="green">Payments · This Week</MicroLabel>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '32px', color: t.h, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {data.total}
        </span>
      </div>
      <p style={{ fontFamily: BODY, fontSize: '12px', color: t.muted, margin: '4px 0 16px' }}>
        <span style={{ color: t.greenBright, fontWeight: 600 }}>{data.onTimePct}</span> · {data.invoicesCollected}
      </p>

      <Sparkbars data={data} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: t.greenBright }} />
          <MicroLabel variant="green" style={{ fontSize: '8.5px' }}>Collected</MicroLabel>
        </span>
        <MicroLabel style={{ color: t.greenNeon, fontSize: '8.5px' }}>{data.peakLabel}</MicroLabel>
      </div>
    </GlassCard>
  )
}

function OutstandingCard() {
  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span
          aria-hidden="true"
          style={{ width: 7, height: 7, borderRadius: '50%', background: t.orangeBright, boxShadow: `0 0 8px ${t.orangeBright}` }}
        />
        <MicroLabel>Outstanding</MicroLabel>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '24px', color: t.orangeBright, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {OUTSTANDING.amount}
        </span>
        <span style={{ fontFamily: BODY, fontSize: '12px', color: t.muted }}>{OUTSTANDING.invoiceCount}</span>
      </div>
      <p style={{ fontFamily: BODY, fontSize: '12px', color: t.faint, margin: '10px 0 0' }}>
        Avg. days to pay <span style={{ color: t.greenBright, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{OUTSTANDING.avgDaysToPay}</span>
      </p>
    </GlassCard>
  )
}

// =============================================================================
// Right rail
// =============================================================================

function CuttyAutomationCard({ reduced }: { reduced: boolean }) {
  const flagStyle = (color: FlagColor): React.CSSProperties => {
    const map: Record<FlagColor, { color: string; bg: string; border: string }> = {
      neon: { color: t.greenNeon, bg: 'rgba(5,168,69,0.12)', border: 'rgba(45,209,106,0.3)' },
      faint: { color: t.faint, bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
      orange: { color: t.orangeBright, bg: 'rgba(232,93,4,0.12)', border: 'rgba(249,115,22,0.35)' },
    }
    const c = map[color]
    return {
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: '8.5px',
      letterSpacing: '0.12em',
      color: c.color,
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '999px',
      padding: '3px 8px',
      flexShrink: 0,
    }
  }

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, ${t.greenNeon}, ${t.green} 60%, ${t.greenDeep})`,
            boxShadow: `0 0 14px rgba(93,255,160,0.45)`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '14px', color: t.h, flex: 1 }}>Cutty automation</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <PulseDot reduced={reduced} size={6} />
          <MicroLabel variant="green" style={{ fontSize: '8.5px' }}>Live</MicroLabel>
        </span>
      </div>
      <p style={{ fontFamily: BODY, fontSize: '11.5px', color: t.faint, margin: '0 0 14px' }}>
        Billing flow · {INVOICE.billedToName}
      </p>

      <div>
        {AUTOMATION_STEPS.map((s, i) => (
          <div
            key={s.title}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${t.hair}`,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 30,
                height: 30,
                borderRadius: '9px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(5,168,69,0.10)',
                border: '1px solid rgba(45,209,106,0.22)',
                flexShrink: 0,
              }}
            >
              <StepIconGlyph kind={s.icon} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: BODY, fontWeight: 600, fontSize: '12.5px', color: t.body, lineHeight: 1.25 }}>
                {s.title}
              </span>
              <span style={{ display: 'block', fontFamily: BODY, fontSize: '11px', color: t.faint, marginTop: '1px' }}>{s.sub}</span>
            </span>
            <span style={flagStyle(s.flagColor)}>{s.flag}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function TimeSavedCard({ reduced }: { reduced: boolean }) {
  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <PulseDot reduced={reduced} size={6} />
        <MicroLabel variant="green">Time Saved · Month</MicroLabel>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '24px', color: t.h, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
          {TIME_SAVED.hours}
        </span>
        <span style={{ fontFamily: BODY, fontSize: '12px', color: t.greenBright, fontWeight: 600 }}>{TIME_SAVED.context}</span>
      </div>
      <p style={{ fontFamily: BODY, fontSize: '12px', color: t.faint, margin: '10px 0 0' }}>{TIME_SAVED.detail}</p>
    </GlassCard>
  )
}

// =============================================================================
// Invoice card (the hero artifact)
// =============================================================================

function StatusChip() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: '9px',
        letterSpacing: '0.12em',
        color: t.greenNeon,
        padding: '4px 9px',
        borderRadius: '999px',
        background: 'rgba(5,168,69,0.12)',
        border: '1px solid rgba(45,209,106,0.3)',
      }}
    >
      <CheckGlyph color={t.greenNeon} size={10} />
      {INVOICE.status}
    </span>
  )
}

function PaidStamp({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={reduced ? false : { opacity: 0, y: -24, rotate: -30 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, rotate: -14 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...SPRING, delay: 0.55 }}
      style={{
        position: 'absolute',
        top: '118px',
        right: '30px',
        transform: reduced ? 'rotate(-14deg)' : undefined,
        zIndex: 5,
        border: `3px solid ${t.greenNeon}`,
        color: t.greenNeon,
        background: 'rgba(5,168,69,0.06)',
        borderRadius: '10px',
        padding: '6px 18px',
        textAlign: 'center',
        textShadow: '0 0 16px rgba(93,255,160,0.7)',
        boxShadow: '0 0 26px rgba(45,209,106,0.45), inset 0 0 18px rgba(45,209,106,0.18)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ display: 'block', fontFamily: DISPLAY, fontWeight: 800, fontSize: '30px', letterSpacing: '0.14em', lineHeight: 1 }}>PAID</span>
      <span style={{ display: 'block', fontFamily: MONO, fontWeight: 700, fontSize: '7.5px', letterSpacing: '0.28em', marginTop: '3px' }}>
        {INVOICE.paidDate}
      </span>
    </motion.div>
  )
}

function StripeToast({ reduced, layout }: { reduced: boolean; layout: Layout }) {
  const mobile = layout === 'mobile'
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...SPRING, delay: 0.75 }}
      style={{
        position: mobile ? 'relative' : 'absolute',
        left: mobile ? undefined : '50%',
        bottom: mobile ? undefined : '-28px',
        transform: mobile ? undefined : 'translateX(-50%)',
        marginTop: mobile ? '14px' : undefined,
        width: mobile ? '100%' : '380px',
        maxWidth: '100%',
        zIndex: 6,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '14px',
        background: 'linear-gradient(180deg, rgba(7,30,17,0.92), rgba(6,20,12,0.92))',
        border: '1px solid rgba(45,209,106,0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.55), 0 0 30px rgba(5,168,69,0.35)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          borderRadius: '9px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(5,168,69,0.18)',
          border: '1px solid rgba(45,209,106,0.4)',
          flexShrink: 0,
        }}
      >
        <CheckGlyph color={t.greenNeon} size={15} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: BODY, fontSize: '13px', color: t.body, fontWeight: 600 }}>
          Stripe · <span style={{ color: t.greenNeon, fontVariantNumeric: 'tabular-nums' }}>{TOAST.amount}</span>
        </span>
        <span style={{ display: 'block', fontFamily: MONO, fontWeight: 700, fontSize: '8.5px', letterSpacing: '0.14em', color: t.faint, marginTop: '3px' }}>
          {TOAST.meta}
        </span>
      </span>
      <PulseDot reduced={reduced} size={7} />
    </motion.div>
  )
}

function InvoiceCard({ reduced, layout }: { reduced: boolean; layout: Layout }) {
  const amountStyle: React.CSSProperties = {
    fontFamily: DISPLAY,
    fontVariantNumeric: 'tabular-nums',
    color: t.body,
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 28, scale: 0.985 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...SPRING, delay: 0.15 }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: layout === 'desktop' ? '480px' : '460px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: '22px',
          padding: '26px',
          boxSizing: 'border-box',
          background:
            'radial-gradient(120% 80% at 50% 0%, rgba(45,209,106,0.07), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.028))',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow:
            '0 40px 90px rgba(0,0,0,0.6), 0 0 60px rgba(5,168,69,0.16), inset 0 1px 0 rgba(255,255,255,0.07)',
        }}
      >
        <PaidStamp reduced={reduced} />

        {/* Invoice header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: DISPLAY, fontWeight: 800, fontSize: '21px', color: t.h, fontVariantNumeric: 'tabular-nums' }}>
              {INVOICE.number}
            </span>
            <span style={{ display: 'block', fontFamily: MONO, fontWeight: 700, fontSize: '9px', letterSpacing: '0.14em', color: t.faint, marginTop: '5px' }}>
              {INVOICE.issued}
            </span>
          </span>
          <LeafMark size={22} />
        </div>

        {/* Bill row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <span style={{ minWidth: 0 }}>
            <MicroLabel style={{ display: 'block', marginBottom: '5px' }}>Billed To</MicroLabel>
            <span style={{ display: 'block', fontFamily: BODY, fontWeight: 600, fontSize: '13.5px', color: t.body }}>{INVOICE.billedToName}</span>
            {INVOICE.billedToAddr.map((line) => (
              <span key={line} style={{ display: 'block', fontFamily: BODY, fontSize: '11.5px', color: t.faint, lineHeight: 1.4 }}>
                {line}
              </span>
            ))}
            <span style={{ display: 'block', fontFamily: MONO, fontWeight: 700, fontSize: '9px', letterSpacing: '0.1em', color: t.faint, marginTop: '6px' }}>
              {INVOICE.jobId} · {INVOICE.crew}
            </span>
          </span>
          <StatusChip />
        </div>

        <div style={{ borderTop: `1px solid ${t.hair}`, margin: '4px 0 14px' }} />

        {/* Line item header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <MicroLabel>Service</MicroLabel>
          <MicroLabel>Amount</MicroLabel>
        </div>

        {/* Line items */}
        <div>
          {INVOICE.lineItems.map((li) => (
            <div key={li.desc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', padding: '7px 0' }}>
              <span style={{ fontFamily: BODY, fontSize: '13px', color: t.body, minWidth: 0 }}>
                {li.desc} <span style={{ color: t.faint }}>· {li.qty}</span>
              </span>
              <span style={{ ...amountStyle, fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>{li.amount}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${t.hair}`, margin: '12px 0' }} />

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
          <span style={{ fontFamily: BODY, fontSize: '12.5px', color: t.muted }}>Subtotal</span>
          <span style={{ ...amountStyle, fontSize: '12.5px' }}>{INVOICE.subtotal}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
          <span style={{ fontFamily: BODY, fontSize: '12.5px', color: t.muted }}>{INVOICE.taxLabel}</span>
          <span style={{ ...amountStyle, fontSize: '12.5px' }}>{INVOICE.tax}</span>
        </div>

        <div style={{ borderTop: `1px solid ${t.hair}`, margin: '12px 0' }} />

        {/* Grand total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
          <span style={{ minWidth: 0 }}>
            <MicroLabel variant="green" style={{ display: 'block' }}>Total Paid</MicroLabel>
            <span style={{ display: 'block', fontFamily: BODY, fontSize: '11px', color: t.faint, marginTop: '4px' }}>{INVOICE.payMethod}</span>
          </span>
          <span
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: '44px',
              color: t.h,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              textShadow: '0 0 30px rgba(45,209,106,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {INVOICE.total}
          </span>
        </div>

        <div style={{ borderTop: `1px solid ${t.hair}`, margin: '16px 0 12px' }} />

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            aria-hidden="true"
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid rgba(45,209,106,0.4)`,
              background: 'rgba(5,168,69,0.10)',
              flexShrink: 0,
            }}
          >
            <CheckGlyph color={t.greenNeon} size={10} />
          </span>
          <span style={{ fontFamily: BODY, fontSize: '11.5px', color: t.faint, lineHeight: 1.4 }}>
            Auto-collected by <span style={{ color: t.greenBright, fontWeight: 600 }}>Cutty</span> — your AI billing agent. No follow-up needed.
          </span>
        </div>
      </div>

      <StripeToast reduced={reduced} layout={layout} />
    </motion.div>
  )
}

// =============================================================================
// Root section
// =============================================================================

export default function Invoice() {
  const reduced = useReducedMotion()
  const layout = useLayout()

  // Stage grid template per layout
  const desktop = layout === 'desktop'

  const stageStyle: React.CSSProperties = desktop
    ? {
        display: 'grid',
        gridTemplateColumns: '260px minmax(420px, 480px) 260px',
        gap: '28px',
        alignItems: 'start',
        justifyContent: 'center',
      }
    : { display: 'block' }

  const railStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    paddingTop: desktop ? '32px' : 0,
  }

  // Left & right rail cards
  const paymentsCard = <PaymentsThisWeekCard data={PAYMENTS_WEEK} reduced={reduced} />
  const outstandingCard = <OutstandingCard />
  const cuttyCard = <CuttyAutomationCard reduced={reduced} />
  const timeSavedCard = <TimeSavedCard reduced={reduced} />

  // Reveal wrapper for rail cards (staggered)
  const reveal = (node: React.ReactNode, delay: number) => (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...SPRING, delay }}
    >
      {node}
    </motion.div>
  )

  return (
    <section
      aria-label="Invoicing & Payments — paid before you park the truck"
      style={{
        position: 'relative',
        width: '100%',
        padding: '80px 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <SectionGlow />
      <FloorGlow />
      <GrainVignette />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto' }}>
        <Header reduced={reduced} />

        {desktop ? (
          <div style={stageStyle}>
            <div style={railStyle}>
              {reveal(paymentsCard, 0.1)}
              {reveal(outstandingCard, 0.2)}
            </div>

            <InvoiceCard reduced={reduced} layout={layout} />

            <div style={railStyle}>
              {reveal(cuttyCard, 0.25)}
              {reveal(timeSavedCard, 0.35)}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            <InvoiceCard reduced={reduced} layout={layout} />

            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: layout === 'mobile' ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
              }}
            >
              {/* Mobile stack order: Payments → Cutty → Outstanding → Time Saved */}
              {reveal(paymentsCard, 0.1)}
              {reveal(cuttyCard, 0.18)}
              {reveal(outstandingCard, 0.26)}
              {reveal(timeSavedCard, 0.34)}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
