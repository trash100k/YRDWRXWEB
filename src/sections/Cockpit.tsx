import React from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/useScrollBeat'

/* ============================================================================
 * Operational Cockpit — product-tour section ("Your whole operation, on one screen.")
 * Owner-POV command center: KPI row + live crew map + Cutty Intel feed, framed as
 * a screenshot-grade "product window" glass panel beneath a marketing header column.
 *
 * Self-contained: every sub-component + style const lives in this file (no
 * src/components/ui dependency). Inline styles only; canonical spring
 * {stiffness:320,damping:28}; all decorative/looping motion gated behind
 * useReducedMotion() so the section reads as a finished still frame under
 * prefers-reduced-motion (it is also rendered inside ReducedScene).
 * ==========================================================================*/

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 }

// ---- tokens (mirror design-tokens.md §1; do NOT import ui primitives) -------
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
  cardHi: 'rgba(255,255,255,0.055)',
  bd: 'rgba(255,255,255,0.08)',
  hair: 'rgba(255,255,255,0.07)',
  bg: '#09090b',
}
const MONO = "'JetBrains Mono', monospace"
const DISPLAY = "'Outfit', sans-serif"
const BODY = "'Inter', sans-serif"

// =============================================================================
// Data shapes + seed (verbatim from scratchpad/mockups/cockpit.html)
// =============================================================================

type Delta = { dir: 'up' | 'flat'; label: string }
type SparkKind = 'area' | 'bars' | 'curve' | 'donut'
type Kpi = {
  id: string
  label: string
  value: string
  sub: string
  delta: Delta
  glow: 'green' | 'orange'
  spark: SparkKind
}

const KPIS: Kpi[] = [
  {
    id: 'revenue',
    label: 'Revenue Today',
    value: '$4,820',
    sub: 'vs $4,305 yesterday',
    delta: { dir: 'up', label: '12%' },
    glow: 'green',
    spark: 'area',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    value: '14',
    sub: '9 done · 3 active · 2 queued',
    delta: { dir: 'up', label: '9 / 14 DONE' },
    glow: 'green',
    spark: 'bars',
  },
  {
    id: 'crews',
    label: 'Crews Active',
    value: '6',
    sub: '42 stops · 118 mi planned',
    delta: { dir: 'up', label: 'ALL ROLLING' },
    glow: 'green',
    spark: 'curve',
  },
  {
    id: 'collected',
    label: 'Collected',
    value: '92%',
    sub: '$620 outstanding · 1 overdue',
    delta: { dir: 'flat', label: '3%' },
    glow: 'orange',
    spark: 'donut',
  },
]

type JobStatus = 'done' | 'paid' | 'progress' | 'enroute' | 'queued'
type CrewAva = { code: string; name: string; from: string; to: string }
type Job = {
  id: string
  time: string
  ampm: 'AM' | 'PM'
  client: string
  detail: string
  crew: CrewAva
  status: JobStatus
  active?: boolean
}

const CREW_A: CrewAva = { code: 'A1', name: 'Crew A · Diaz', from: '#2ad16a', to: '#047a32' }
const CREW_B: CrewAva = { code: 'B2', name: 'Crew B · Okafor', from: '#60a5fa', to: '#2563eb' }
const CREW_C: CrewAva = { code: 'C3', name: 'Crew C · Rivera', from: '#f97316', to: '#9a3412' }
const CREW_D: CrewAva = { code: 'D4', name: 'Crew D · Patel', from: '#a78bfa', to: '#6d28d9' }

const JOBS: Job[] = [
  { id: 'j1', time: '7:30', ampm: 'AM', client: 'Harborview Estates', detail: '218 Maple Crest Dr · Mowing + Edge', crew: CREW_A, status: 'done' },
  { id: 'j2', time: '8:00', ampm: 'AM', client: 'Lindgren Residence', detail: '94 Birchwood Ln · Spring Cleanup', crew: CREW_B, status: 'paid' },
  { id: 'j3', time: '9:15', ampm: 'AM', client: 'Westlake Property Mgmt', detail: '1407 Oak St · Mow · Hedge · Blow', crew: CREW_A, status: 'progress', active: true },
  { id: 'j4', time: '9:45', ampm: 'AM', client: 'Westgate Commons', detail: '3300 Cedar Blvd · Commercial Mow', crew: CREW_C, status: 'progress' },
  { id: 'j5', time: '10:30', ampm: 'AM', client: 'Tomlinson, Greg', detail: '56 Willow Bend Ct · Mulch Install', crew: CREW_D, status: 'enroute' },
  { id: 'j6', time: '11:15', ampm: 'AM', client: 'Sienna Ridge HOA', detail: '700 Vista Ridge · Bed Maintenance', crew: CREW_B, status: 'enroute' },
  { id: 'j7', time: '1:00', ampm: 'PM', client: 'Marquez, Elena', detail: '82 Sunset Grove · Irrigation Check', crew: CREW_C, status: 'queued' },
]

type Intel = {
  id: string
  tag: string
  ts: string
  body: React.ReactNode
  warn?: boolean
  actions: { label: string; ghost?: boolean }[]
}

const INTEL: Intel[] = [
  {
    id: 'weather',
    tag: 'Weather Reroute',
    ts: '2 MIN AGO',
    warn: true,
    body: (
      <>
        Rain forecast at <b>2:00 PM</b> — move <b>Oak St mow</b> up to <b>10:30 AM</b> to beat the
        front. Crew A has the gap.
      </>
    ),
    actions: [{ label: 'Apply reschedule' }, { label: 'Dismiss', ghost: true }],
  },
  {
    id: 'upsell',
    tag: 'Upsell Signal',
    ts: '14 MIN AGO',
    body: (
      <>
        <b>Westlake Property Mgmt</b> is <b>4 jobs in</b> this month — pitch a{' '}
        <b>maintenance plan</b> ($340/mo est.) to lock recurring revenue.
      </>
    ),
    actions: [{ label: 'Draft proposal' }],
  },
  {
    id: 'collections',
    tag: 'Collections',
    ts: '31 MIN AGO',
    warn: true,
    body: (
      <>
        Invoice <b>#1038</b> overdue <b>3 days</b> ($620) — auto-nudge SMS sent to Tomlinson. Reply
        expected within 24h.
      </>
    ),
    actions: [{ label: 'View invoice', ghost: true }],
  },
]

const TRUST_CHIPS = ['LIVE CREW GPS', 'AI OPS COPILOT', '96.4% ON-TIME']

// Status-pill color table (mockup §7).
const PILL: Record<JobStatus, { label: string; color: string; bg: string; dot: string; glow: boolean }> = {
  done: { label: 'DONE', color: t.muted, bg: 'rgba(255,255,255,0.05)', dot: t.muted, glow: false },
  paid: { label: 'PAID', color: '#fdba74', bg: 'rgba(232,93,4,0.14)', dot: t.orangeBright, glow: true },
  progress: { label: 'IN PROGRESS', color: t.greenNeon, bg: 'rgba(45,209,106,0.14)', dot: t.greenNeon, glow: true },
  enroute: { label: 'EN ROUTE', color: '#93c5fd', bg: 'rgba(59,130,246,0.13)', dot: '#60a5fa', glow: true },
  queued: { label: 'QUEUED', color: t.muted, bg: 'rgba(255,255,255,0.05)', dot: t.muted, glow: false },
}

// =============================================================================
// Scoped responsive style block (media queries + grid breakpoints inline can't
// express). Namespaced under .cockpit-* so it never collides with other sections.
// =============================================================================

const SCOPED_CSS = `
.cockpit-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.cockpit-split {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.cockpit-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.cockpit-job {
  display: grid;
  grid-template-columns: 52px 1fr auto auto;
  align-items: center;
  gap: 12px;
}
@media (max-width: 900px) {
  .cockpit-kpis { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 860px) {
  .cockpit-split { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .cockpit-job { grid-template-columns: 48px 1fr auto; }
  .cockpit-job .cockpit-crew { display: none; }
}
@media (max-width: 520px) {
  .cockpit-kpis { grid-template-columns: 1fr; }
}
.cockpit-chip { transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease; }
@media (hover: hover) {
  .cockpit-kpi:hover { border-color: rgba(45,209,106,0.3); }
  .cockpit-chip:hover { transform: scale(1.04); border-color: rgba(45,209,106,0.3); }
}
`

// =============================================================================
// Small presentational helpers
// =============================================================================

function MicroLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: t.faint,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

function LiveDot({ reduced, color = t.greenNeon, size = 7 }: { reduced: boolean; color?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '999px',
        background: color,
        boxShadow: `0 0 10px ${color}`,
        flexShrink: 0,
        animation: reduced ? 'none' : 'scanPulse 2.2s ease-in-out infinite',
      }}
    />
  )
}

function PanelHead({
  title,
  count,
  icon,
}: {
  title: string
  count: string
  icon: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 12px',
        borderBottom: `1px solid ${t.hair}`,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
        {icon}
        <h3
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: '14px',
            letterSpacing: '0.01em',
            color: t.h,
            margin: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </h3>
      </div>
      <span
        style={{
          fontFamily: MONO,
          fontSize: '10px',
          fontWeight: 700,
          color: t.faint,
          border: `1px solid ${t.bd}`,
          borderRadius: '999px',
          padding: '3px 9px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {count}
      </span>
    </div>
  )
}

// =============================================================================
// Sparklines (copied straight from the mockup; donut animates its dashoffset)
// =============================================================================

function Sparkline({ kind, reduced }: { kind: SparkKind; reduced: boolean }) {
  if (kind === 'area') {
    return (
      <svg
        width="120"
        height="34"
        viewBox="0 0 120 34"
        fill="none"
        aria-hidden="true"
        style={{ position: 'absolute', right: '16px', bottom: '14px' }}
      >
        <defs>
          <linearGradient id="cockpit-sg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2ad16a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#2ad16a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0 26 L15 22 L30 24 L45 16 L60 19 L75 11 L90 13 L105 6 L120 4"
          stroke="#5dffa0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={reduced ? undefined : { pathLength: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.85, ease: 'easeInOut' }}
        />
        <path
          d="M0 26 L15 22 L30 24 L45 16 L60 19 L75 11 L90 13 L105 6 L120 4 L120 34 L0 34 Z"
          fill="url(#cockpit-sg1)"
        />
      </svg>
    )
  }

  if (kind === 'bars') {
    return (
      <svg
        width="120"
        height="34"
        viewBox="0 0 120 34"
        fill="none"
        aria-hidden="true"
        style={{ position: 'absolute', right: '16px', bottom: '14px' }}
      >
        <rect x="2" y="14" width="9" height="20" rx="2" fill="#2ad16a" opacity="0.85" />
        <rect x="16" y="20" width="9" height="14" rx="2" fill="#2ad16a" opacity="0.55" />
        <rect x="30" y="10" width="9" height="24" rx="2" fill="#2ad16a" opacity="0.9" />
        <rect x="44" y="18" width="9" height="16" rx="2" fill="#2ad16a" opacity="0.6" />
        <rect x="58" y="8" width="9" height="26" rx="2" fill="#5dffa0" />
        <rect x="72" y="16" width="9" height="18" rx="2" fill="#2ad16a" opacity="0.7" />
        <rect x="86" y="6" width="9" height="28" rx="2" fill="#5dffa0" />
        <rect x="100" y="12" width="9" height="22" rx="2" fill="#2ad16a" opacity="0.85" />
      </svg>
    )
  }

  if (kind === 'curve') {
    return (
      <svg
        width="120"
        height="34"
        viewBox="0 0 120 34"
        fill="none"
        aria-hidden="true"
        style={{ position: 'absolute', right: '16px', bottom: '14px' }}
      >
        <motion.path
          d="M0 30 C20 30 22 8 42 8 C62 8 64 28 84 28 C104 28 106 10 120 10"
          stroke="#2ad16a"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={reduced ? undefined : { pathLength: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.85, ease: 'easeInOut' }}
        />
        <circle cx="42" cy="8" r="2.6" fill="#5dffa0" />
        <circle cx="84" cy="28" r="2.6" fill="#5dffa0" />
        <circle cx="120" cy="10" r="2.6" fill="#5dffa0" />
      </svg>
    )
  }

  // donut
  return (
    <svg
      width="58"
      height="58"
      viewBox="0 0 58 58"
      fill="none"
      aria-hidden="true"
      style={{ position: 'absolute', right: '16px', bottom: '32px' }}
    >
      <circle cx="29" cy="29" r="22" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      <motion.circle
        cx="29"
        cy="29"
        r="22"
        stroke="#f97316"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="138.2"
        transform="rotate(-90 29 29)"
        initial={reduced ? false : { strokeDashoffset: 138.2 }}
        whileInView={reduced ? undefined : { strokeDashoffset: 11 }}
        style={reduced ? { strokeDashoffset: 11 } : undefined}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.85, ease: 'easeInOut' }}
      />
    </svg>
  )
}

// =============================================================================
// KPI card
// =============================================================================

function KpiCard({ kpi, index, reduced }: { kpi: Kpi; index: number; reduced: boolean }) {
  const glowColor =
    kpi.glow === 'green' ? 'rgba(45,209,106,0.18)' : 'rgba(232,93,4,0.18)'
  const deltaUp = kpi.delta.dir === 'up'
  return (
    <motion.div
      className="cockpit-kpi"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...SPRING, delay: reduced ? 0 : index * 0.06 }}
      whileHover={reduced ? undefined : { scale: 1.02 }}
      style={{
        position: 'relative',
        minHeight: '124px',
        borderRadius: '18px',
        padding: '16px 18px',
        background: t.card,
        border: `1px solid ${t.bd}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* corner glow */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-40px',
          top: '-40px',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <MicroLabel style={{ color: kpi.glow === 'orange' ? t.orangeBright : t.greenBright }}>
          {kpi.label}
        </MicroLabel>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontFamily: MONO,
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
            color: deltaUp ? t.greenNeon : t.orangeBright,
            background: deltaUp ? 'rgba(45,209,106,0.12)' : 'rgba(232,93,4,0.12)',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 15 6-6 6 6" />
          </svg>
          {kpi.delta.label}
        </span>
      </div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: '32px',
          letterSpacing: '-0.02em',
          color: t.h,
          marginTop: '10px',
          lineHeight: 1,
        }}
      >
        {kpi.value}
      </div>
      <div style={{ fontFamily: BODY, fontSize: '11.5px', color: t.muted, marginTop: '7px' }}>
        {kpi.sub}
      </div>
      <Sparkline kind={kpi.spark} reduced={reduced} />
    </motion.div>
  )
}

// =============================================================================
// Job row
// =============================================================================

function JobRow({ job, index, reduced }: { job: Job; index: number; reduced: boolean }) {
  const pill = PILL[job.status]
  return (
    <motion.div
      className="cockpit-job"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ ...SPRING, delay: reduced ? 0 : index * 0.04 }}
      style={{
        padding: '11px 12px',
        borderRadius: '13px',
        position: 'relative',
        borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.045)',
        background: job.active ? 'linear-gradient(90deg, rgba(45,209,106,0.06), transparent)' : 'transparent',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: t.body }}>
        {job.time}
        <span style={{ display: 'block', fontSize: '9px', color: t.faint, fontWeight: 500, letterSpacing: '0.1em' }}>
          {job.ampm}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: '13.5px', color: t.h }}>{job.client}</div>
        <div style={{ fontFamily: BODY, fontSize: '11px', color: t.faint, marginTop: '2px' }}>{job.detail}</div>
      </div>
      <div className="cockpit-crew" style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '7px',
            display: 'grid',
            placeItems: 'center',
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: '9px',
            color: '#04130a',
            flexShrink: 0,
            background: `linear-gradient(150deg, ${job.crew.from}, ${job.crew.to})`,
          }}
        >
          {job.crew.code}
        </span>
        <span style={{ fontFamily: BODY, fontSize: '11.5px', color: t.muted, whiteSpace: 'nowrap' }}>
          {job.crew.name}
        </span>
      </div>
      <div>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            padding: '5px 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            color: pill.color,
            background: pill.bg,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: pill.dot,
              boxShadow: pill.glow ? `0 0 7px ${pill.dot}` : 'none',
              animation: pill.glow && !reduced && job.active ? 'scanPulse 2.2s ease-in-out infinite' : 'none',
            }}
          />
          {pill.label}
        </span>
      </div>
    </motion.div>
  )
}

// =============================================================================
// Crew map (inline SVG — grid + 3 routes + 6 glow pins + legend + on-time stat)
// =============================================================================

function CrewMap({ reduced }: { reduced: boolean }) {
  return (
    <section
      style={{
        position: 'relative',
        borderRadius: '20px',
        background: t.card,
        border: `1px solid ${t.bd}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 22px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: '1.18 1 0',
        minHeight: 0,
      }}
    >
      <PanelHead
        title="Crew Map — Live"
        count="6 PINS · 118 MI"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.greenNeon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" />
            <path d="M9 3v15M15 6v15" />
          </svg>
        }
      />
      <div style={{ position: 'relative', flex: 1, minHeight: '220px', aspectRatio: '16 / 9', overflow: 'hidden' }}>
        <svg
          viewBox="0 0 760 300"
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="Live crew map showing six active crews across three routes"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <radialGradient id="cockpit-mapglow" cx="60%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#0c2418" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#070a09" stopOpacity="1" />
            </radialGradient>
            <filter id="cockpit-pinGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="760" height="300" fill="url(#cockpit-mapglow)" />
          {/* water body */}
          <path d="M520 0 C560 60 540 120 600 150 C660 180 700 140 760 160 L760 0 Z" fill="#0a1c2a" opacity="0.55" />
          {/* park / greenspace */}
          <path d="M80 180 C120 150 200 160 220 210 C235 250 160 270 110 250 C70 235 55 205 80 180 Z" fill="#0e2a1a" opacity="0.7" />
          {/* street grid — primary */}
          <g stroke="#1a2620" strokeWidth="6" opacity="0.9" fill="none">
            <path d="M0 70 H760" />
            <path d="M0 150 H760" />
            <path d="M0 230 H760" />
            <path d="M130 0 V300" />
            <path d="M300 0 V300" />
            <path d="M470 0 V300" />
            <path d="M640 0 V300" />
          </g>
          {/* street grid — secondary */}
          <g stroke="#243630" strokeWidth="2" opacity="0.7" fill="none">
            <path d="M0 110 H760" />
            <path d="M0 190 H760" />
            <path d="M0 270 H760" />
            <path d="M70 0 V300" />
            <path d="M215 0 V300" />
            <path d="M385 0 V300" />
            <path d="M555 0 V300" />
            <path d="M700 0 V300" />
            <path d="M0 40 H760" />
          </g>
          {/* diagonal arterial */}
          <path d="M0 300 L300 150 L520 80 L760 30" stroke="#2a3d35" strokeWidth="4" fill="none" opacity="0.8" />
          {/* route polylines */}
          <path d="M120 240 L300 150 L470 150 L640 70" stroke="#2ad16a" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeDasharray="2 6" opacity="0.85" />
          <path d="M130 70 L300 70 L380 150 L555 190" stroke="#5dffa0" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.9" />
          <path d="M470 230 L640 230 L700 150" stroke="#f97316" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeDasharray="2 6" opacity="0.8" />
          {/* pins */}
          <g filter="url(#cockpit-pinGlow)">
            <circle cx="120" cy="240" r="6" fill="#5dffa0" />
            <circle cx="120" cy="240" r="11" fill="none" stroke="#5dffa0" strokeWidth="1.2" opacity="0.5">
              {!reduced && (
                <>
                  <animate attributeName="r" values="11;18;11" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite" />
                </>
              )}
            </circle>
            <circle cx="300" cy="150" r="6" fill="#2ad16a" />
            <circle cx="470" cy="150" r="6" fill="#2ad16a" />
            <circle cx="640" cy="70" r="6" fill="#5dffa0" />
            <circle cx="640" cy="70" r="11" fill="none" stroke="#5dffa0" strokeWidth="1.2" opacity="0.5" />
            <circle cx="555" cy="190" r="6" fill="#2ad16a" />
            <circle cx="700" cy="150" r="6" fill="#f97316" />
            <circle cx="700" cy="150" r="11" fill="none" stroke="#f97316" strokeWidth="1.2" opacity="0.5" />
          </g>
        </svg>
        {/* on-time stat */}
        <div style={{ position: 'absolute', right: '16px', top: '14px', zIndex: 5, textAlign: 'right' }}>
          <MicroLabel style={{ color: t.greenBright }}>On-Time Rate</MicroLabel>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '18px', color: t.h }}>96.4%</div>
        </div>
        {/* legend */}
        <div style={{ position: 'absolute', left: '16px', bottom: '14px', display: 'flex', flexWrap: 'wrap', gap: '14px', zIndex: 5 }}>
          {[
            { label: 'Active', color: '#5dffa0', glow: true },
            { label: 'Routed', color: '#2ad16a', glow: false },
            { label: 'Delayed', color: '#f97316', glow: true },
          ].map((lg) => (
            <span key={lg.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: MONO, fontSize: '10px', color: t.muted }}>
              <span
                aria-hidden="true"
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: lg.color,
                  boxShadow: lg.glow ? `0 0 7px ${lg.color}` : 'none',
                }}
              />
              {lg.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Cutty Intel feed
// =============================================================================

function IntelCard({ item }: { item: Intel }) {
  const barColor = item.warn ? t.orangeBright : t.green
  const barGlow = item.warn ? 'rgba(232,93,4,0.6)' : 'rgba(45,209,106,0.6)'
  return (
    <div
      style={{
        position: 'relative',
        padding: '12px 14px 12px 16px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${t.hair}`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: '10px',
          bottom: '10px',
          width: '3px',
          borderRadius: '3px',
          background: barColor,
          boxShadow: `0 0 10px ${barGlow}`,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '8.5px',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: item.warn ? t.orangeBright : t.greenBright,
          }}
        >
          {item.tag}
        </span>
        <span style={{ fontFamily: MONO, fontSize: '9px', color: t.faint, marginLeft: 'auto' }}>{item.ts}</span>
      </div>
      <p style={{ margin: 0, fontFamily: BODY, fontSize: '12.5px', lineHeight: 1.45, color: t.body }}>
        {item.body}
      </p>
      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {item.actions.map((a) => (
          <span
            key={a.label}
            className="cockpit-chip"
            style={{
              fontFamily: MONO,
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '4px 9px',
              borderRadius: '7px',
              border: `1px solid ${t.bd}`,
              color: a.ghost ? t.muted : t.greenNeon,
              background: a.ghost ? 'transparent' : 'rgba(45,209,106,0.08)',
              cursor: 'default',
            }}
          >
            {a.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function IntelPanel({ reduced }: { reduced: boolean }) {
  return (
    <section
      style={{
        position: 'relative',
        borderRadius: '20px',
        background: t.card,
        border: `1px solid ${t.bd}`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 22px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 0',
        minHeight: 0,
      }}
    >
      <PanelHead
        title="Cutty Intel"
        count="3 NEW"
        icon={
          <span
            aria-hidden="true"
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%, #5dffa0, #047a32)',
              boxShadow: '0 0 12px rgba(45,209,106,0.7)',
              animation: reduced ? 'none' : 'reticlePulse 2.6s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
        }
      />
      <div style={{ flex: 1, overflow: 'hidden', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {INTEL.map((item) => (
          <IntelCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}

// =============================================================================
// Product window (the "screenshot" glass frame)
// =============================================================================

function ProductWindow({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 32, scale: 0.985 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.08 }}
      style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        borderRadius: '22px',
        background: 'rgba(9,9,11,0.55)',
        border: `1px solid ${t.bd}`,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 40px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* window chrome strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '11px 16px',
          borderBottom: `1px solid ${t.hair}`,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012))',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <span key={c} aria-hidden="true" style={{ width: '11px', height: '11px', borderRadius: '50%', background: c, opacity: 0.85 }} />
          ))}
        </div>
        <span
          style={{
            fontFamily: MONO,
            fontSize: '11px',
            color: t.muted,
            padding: '4px 12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${t.bd}`,
            whiteSpace: 'nowrap',
          }}
        >
          yardworx.app/dashboard
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginLeft: 'auto', minWidth: 0 }}>
          <LiveDot reduced={reduced} size={6} />
          <MicroLabel style={{ color: t.muted, whiteSpace: 'nowrap' }}>
            Good morning, Zach · TUE JUN 30 · Yard Online
          </MicroLabel>
        </span>
      </div>

      {/* window body */}
      <div style={{ padding: 'clamp(12px, 3vw, 22px)' }}>
        {/* KPI row */}
        <div className="cockpit-kpis">
          {KPIS.map((kpi, i) => (
            <KpiCard key={kpi.id} kpi={kpi} index={i} reduced={reduced} />
          ))}
        </div>

        {/* content split */}
        <div className="cockpit-split">
          {/* Today's Jobs */}
          <section
            style={{
              borderRadius: '20px',
              background: t.card,
              border: `1px solid ${t.bd}`,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 22px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <PanelHead
              title="Today's Jobs"
              count="14 SCHEDULED"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.greenNeon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              }
            />
            <div style={{ padding: '6px 8px' }}>
              {JOBS.map((job, i) => (
                <JobRow key={job.id} job={job} index={i} reduced={reduced} />
              ))}
            </div>
          </section>

          {/* right column: map + intel */}
          <div className="cockpit-right">
            <CrewMap reduced={reduced} />
            <IntelPanel reduced={reduced} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// Background glow + overlays (anchors offset from Forge/Scheduler so it doesn't
// look cloned — green key sits high-right here, secondary green migrates left)
// =============================================================================

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
          'radial-gradient(900px 600px at 78% -8%, rgba(5,168,69,0.16), transparent 60%)',
          'radial-gradient(700px 560px at 6% 6%, rgba(45,209,106,0.10), transparent 58%)',
          'radial-gradient(620px 520px at 96% 96%, rgba(232,93,4,0.10), transparent 60%)',
          'radial-gradient(700px 600px at 30% 120%, rgba(124,58,237,0.08), transparent 60%)',
        ].join(', '),
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
          zIndex: 5,
          pointerEvents: 'none',
          background: 'radial-gradient(120% 100% at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%)',
          boxShadow: 'inset 0 0 220px 60px rgba(0,0,0,0.55)',
        }}
      />
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 6,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.04,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="cockpit-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cockpit-grain)" />
      </svg>
    </>
  )
}

// =============================================================================
// Section
// =============================================================================

export default function Cockpit() {
  const reduced = useReducedMotion()

  return (
    <section
      aria-label="Operational Cockpit — your whole operation on one screen"
      style={{
        position: 'relative',
        width: '100%',
        background: t.bg,
        padding: 'clamp(56px, 8vw, 96px) 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCOPED_CSS }} />
      <GlowField />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header column */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={SPRING}
          style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 36px' }}
        >
          {/* Kicker */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '999px',
              border: '1px solid rgba(45,209,106,0.3)',
              background: 'rgba(5,168,69,0.10)',
              marginBottom: '18px',
            }}
          >
            <LiveDot reduced={reduced} size={6} />
            <MicroLabel style={{ color: t.greenBright, fontSize: '10px' }}>Operational Cockpit</MicroLabel>
          </div>

          {/* H2 */}
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 'clamp(28px, 4.2vw, 44px)',
              color: t.h,
              lineHeight: 1.1,
              margin: '0 0 14px 0',
            }}
          >
            Your whole operation, on one{' '}
            <span
              style={{
                background: `linear-gradient(120deg, ${t.greenNeon}, ${t.greenBright})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
              }}
            >
              screen.
            </span>
          </h2>

          {/* Sub */}
          <p
            style={{
              fontFamily: BODY,
              fontWeight: 400,
              fontSize: 'clamp(15px, 2.5vw, 17px)',
              color: t.muted,
              lineHeight: 1.6,
              margin: '0 auto 22px',
              maxWidth: '600px',
            }}
          >
            Revenue, crews, routes, and collections — live. Cutty watches the gaps and tells you
            what to do next, before the day gets away from you.
          </p>

          {/* Trust chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
            {TRUST_CHIPS.map((chip) => (
              <span
                key={chip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: MONO,
                  fontSize: '9.5px',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: t.faint,
                  padding: '5px 10px',
                  borderRadius: '999px',
                  border: `1px solid ${t.hair}`,
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <span aria-hidden="true" style={{ width: '5px', height: '5px', borderRadius: '50%', background: t.greenBright }} />
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Product window */}
        <ProductWindow reduced={reduced} />
      </div>

      <GrainVignette />
    </section>
  )
}
