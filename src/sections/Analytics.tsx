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
  orangeSoft: '#ff9a6b',
  violet: '#a78bfa',
  heading: '#fafafa',
  body: '#d4d4d8',
  muted: '#a1a1aa',
  faint: '#71717a',
  faint2: '#52525b',
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

type Tone = 'green' | 'orange' | 'violet'
type Delta = { text: string; dir: 'up' | 'down' }
type Kpi = {
  num: number
  display: string
  prefix?: string
  suffix?: string
  decimals: number
  label: string
  tone: Tone
  delta: Delta
  icon: 'revenue' | 'job' | 'crew' | 'churn'
  spark?: string
  sparkColor?: string
}

const KPIS: Kpi[] = [
  {
    num: 148200,
    display: '$148,200',
    prefix: '$',
    decimals: 0,
    label: 'Revenue · 90 days',
    tone: 'orange',
    delta: { text: '+18%', dir: 'up' },
    icon: 'revenue',
  },
  {
    num: 312,
    display: '$312',
    prefix: '$',
    decimals: 0,
    label: 'Avg job value',
    tone: 'green',
    delta: { text: '+6%', dir: 'up' },
    icon: 'job',
  },
  {
    num: 87,
    display: '87%',
    suffix: '%',
    decimals: 0,
    label: 'Crew utilization',
    tone: 'green',
    delta: { text: '+4pt', dir: 'up' },
    icon: 'crew',
    spark: '0,22 12,18 24,20 36,12 48,14 60,7 78,5',
    sparkColor: T.greenBright,
  },
  {
    num: 2.1,
    display: '2.1%',
    suffix: '%',
    decimals: 1,
    label: 'Customer churn',
    tone: 'violet',
    delta: { text: '-0.6pt', dir: 'down' },
    icon: 'churn',
    spark: '0,8 12,11 24,9 36,15 48,14 60,19 78,22',
    sparkColor: T.violet,
  },
]

type CrewBar = { initials: string; name: string; pct: number; active: boolean }
const CREW: CrewBar[] = [
  { initials: 'MC', name: 'Marcus', pct: 92, active: true },
  { initials: 'DV', name: 'Dani', pct: 86, active: true },
  { initials: 'LO', name: 'Lopez', pct: 81, active: true },
  { initials: 'TR', name: 'Tariq', pct: 74, active: false },
]

type JobSlice = { name: string; pct: number; color: string }
const JOB_MIX: JobSlice[] = [
  { name: 'Mow', pct: 44, color: '#2ad16a' },
  { name: 'Trim', pct: 26, color: '#05a845' },
  { name: 'Mulch', pct: 18, color: '#E85D04' },
  { name: 'Aerate', pct: 12, color: '#a78bfa' },
]
const JOB_TOTAL = '1,284'

type SeasonBar = { month: string; h: number; y: number; fill: string; glow?: string; label?: string }
const SEASON: SeasonBar[] = [
  { month: 'FEB', h: 24, y: 50, fill: 'rgba(45,209,106,0.45)' },
  { month: 'MAR', h: 34, y: 40, fill: 'rgba(45,209,106,0.6)' },
  { month: 'APR', h: 52, y: 22, fill: '#2ad16a', glow: '0 0 8px rgba(45,209,106,0.55)', label: '#2ad16a' },
  { month: 'MAY', h: 64, y: 10, fill: '#5dffa0', glow: '0 0 10px rgba(93,255,160,0.6)', label: '#5dffa0' },
  { month: 'JUN', h: 44, y: 30, fill: 'rgba(45,209,106,0.55)' },
  { month: 'JUL', h: 28, y: 46, fill: 'rgba(45,209,106,0.4)' },
  { month: 'AUG', h: 18, y: 56, fill: 'rgba(232,93,4,0.5)' },
]

const REVENUE = {
  peakLabel: 'JULY · PEAK MONTH',
  peakValue: 57840,
  peakDisplay: '$57,840',
  peakDelta: '+22%',
  peakContext: 'vs June · 184 jobs',
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
          'radial-gradient(900px 600px at 18% 4%, rgba(5,168,69,0.18), transparent 60%)',
          'radial-gradient(760px 520px at 96% 12%, rgba(232,93,4,0.10), transparent 62%)',
          'radial-gradient(700px 700px at 70% 104%, rgba(124,58,237,0.10), transparent 60%)',
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
        <filter id="analyticsGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#analyticsGrain)" />
      </svg>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Generic count-up hook (spring-eased, fires when in view)            */
/* ------------------------------------------------------------------ */

function useCountUp(
  target: number,
  formatted: string,
  reduced: boolean,
  opts?: { prefix?: string; suffix?: string; decimals?: number },
) {
  const decimals = opts?.decimals ?? 0
  const prefix = opts?.prefix ?? ''
  const suffix = opts?.suffix ?? ''
  const [display, setDisplay] = useState(reduced ? formatted : `${prefix}${(0).toFixed(decimals)}${suffix}`)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (reduced) {
      setDisplay(formatted)
      return
    }
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setDisplay(formatted)
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
        const duration = 900
        const start = performance.now()
        const fmt = (v: number) => {
          const rounded = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US')
          return `${prefix}${rounded}${suffix}`
        }
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setDisplay(fmt(target * eased))
          if (p < 1) raf = requestAnimationFrame(tick)
          else setDisplay(formatted)
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
  }, [target, formatted, reduced, prefix, suffix, decimals])

  return { ref, display }
}

/* ------------------------------------------------------------------ */
/* KPI icons                                                           */
/* ------------------------------------------------------------------ */

function KpiIcon({ icon, color }: { icon: Kpi['icon']; color: string }) {
  switch (icon) {
    case 'revenue':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'job':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="2" stroke={color} strokeWidth="2" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" stroke={color} strokeWidth="2" />
        </svg>
      )
    case 'crew':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M16 19a4 4 0 0 0-8 0M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4 21a4 4 0 0 1 5-3.9M20 21a4 4 0 0 0-5-3.9"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'churn':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
        </svg>
      )
  }
}

function DeltaPill({ delta }: { delta: Delta }) {
  const up = delta.dir === 'up'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: T.mono,
        fontWeight: 700,
        fontSize: '11px',
        padding: '3px 8px',
        borderRadius: '7px',
        color: up ? T.neon : T.orangeSoft,
        background: up ? 'rgba(45,209,106,0.13)' : 'rgba(232,93,4,0.13)',
      }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {up ? (
          <>
            <path d="M5 12l5-5 4 4 5-7" stroke={T.neon} strokeWidth="3" />
            <path d="M19 4h-4M19 4v4" stroke={T.neon} strokeWidth="3" />
          </>
        ) : (
          <>
            <path d="M19 12l-5 5-4-4-5 7" stroke={T.neon} strokeWidth="3" />
            <path d="M5 20h4M5 20v-4" stroke={T.neon} strokeWidth="3" />
          </>
        )}
      </svg>
      {delta.text}
    </span>
  )
}

const TONE_KIC: Record<Tone, CSSProperties> = {
  green: { background: 'rgba(45,209,106,0.10)', border: '1px solid rgba(45,209,106,0.22)' },
  orange: { background: 'rgba(232,93,4,0.10)', border: '1px solid rgba(232,93,4,0.26)' },
  violet: { background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.26)' },
}
const TONE_ICON: Record<Tone, string> = {
  green: T.greenBright,
  orange: T.orangeBright,
  violet: T.violet,
}

function KpiCard({ kpi, index, reduced }: { kpi: Kpi; index: number; reduced: boolean }) {
  const { ref, display } = useCountUp(kpi.num, kpi.display, reduced, {
    prefix: kpi.prefix,
    suffix: kpi.suffix,
    decimals: kpi.decimals,
  })
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.05 + index * 0.07 }}
      style={{ ...cardStyle, padding: '18px 20px 16px', minWidth: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            display: 'grid',
            placeItems: 'center',
            ...TONE_KIC[kpi.tone],
          }}
        >
          <KpiIcon icon={kpi.icon} color={TONE_ICON[kpi.tone]} />
        </span>
        <DeltaPill delta={kpi.delta} />
      </div>
      <div
        ref={ref}
        style={{
          fontFamily: T.display,
          fontWeight: 800,
          fontSize: 'clamp(26px, 4vw, 32px)',
          color: T.heading,
          letterSpacing: '-0.02em',
          marginTop: '14px',
          lineHeight: 1,
        }}
      >
        {display}
      </div>
      <div style={{ marginTop: '9px', fontSize: '12px', color: T.muted, fontWeight: 500 }}>{kpi.label}</div>
      {kpi.spark && (
        <svg
          viewBox="0 0 78 30"
          fill="none"
          aria-hidden="true"
          style={{ position: 'absolute', right: '18px', bottom: '14px', width: '78px', height: '30px', opacity: 0.9 }}
        >
          <polyline
            points={kpi.spark}
            stroke={kpi.sparkColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Main revenue chart                                                  */
/* ------------------------------------------------------------------ */

const ACTUAL_PATH =
  'M40,250 C95,242 110,224 130,216 C170,200 195,196 220,182 C260,162 285,170 310,150 C350,122 375,140 400,128 C440,108 465,96 490,108 C530,128 555,80 580,72 C620,58 645,84 670,64'
const AREA_PATH = `${ACTUAL_PATH} L670,360 L40,360 Z`
const FORECAST_PATH = 'M670,64 C700,56 730,78 760,60 C790,44 820,58 840,40'
const PRIOR_POINTS = '40,256 130,244 220,232 310,210 400,222 490,196 580,184 670,170 760,200'

type DataPoint = { cx: number; cy: number; r: number; fill: string; stroke: string; sw: number; opacity?: number; glow?: boolean }
const POINTS: DataPoint[] = [
  { cx: 40, cy: 250, r: 3.5, fill: '#09090b', stroke: '#2ad16a', sw: 2 },
  { cx: 130, cy: 216, r: 3.5, fill: '#09090b', stroke: '#2ad16a', sw: 2 },
  { cx: 220, cy: 182, r: 3.5, fill: '#09090b', stroke: '#2ad16a', sw: 2 },
  { cx: 310, cy: 150, r: 3.5, fill: '#09090b', stroke: '#2ad16a', sw: 2 },
  { cx: 400, cy: 128, r: 3.5, fill: '#09090b', stroke: '#2ad16a', sw: 2 },
  { cx: 490, cy: 108, r: 3.5, fill: '#09090b', stroke: '#2ad16a', sw: 2 },
  { cx: 580, cy: 72, r: 5.5, fill: '#5dffa0', stroke: '#09090b', sw: 2.5, glow: true },
  { cx: 670, cy: 64, r: 3.5, fill: '#09090b', stroke: '#5dffa0', sw: 2 },
  { cx: 760, cy: 60, r: 3.5, fill: '#09090b', stroke: '#5dffa0', sw: 2, opacity: 0.8 },
  { cx: 840, cy: 40, r: 3.5, fill: '#09090b', stroke: '#5dffa0', sw: 2, opacity: 0.8 },
]

type XLabel = { x: number; label: string; fill: string }
const X_LABELS: XLabel[] = [
  { x: 40, label: 'JAN', fill: '#71717a' },
  { x: 130, label: 'FEB', fill: '#71717a' },
  { x: 220, label: 'MAR', fill: '#71717a' },
  { x: 310, label: 'APR', fill: '#71717a' },
  { x: 400, label: 'MAY', fill: '#71717a' },
  { x: 490, label: 'JUN', fill: '#71717a' },
  { x: 580, label: 'JUL', fill: '#5dffa0' },
  { x: 670, label: 'AUG', fill: '#71717a' },
  { x: 760, label: 'SEP', fill: '#52525b' },
  { x: 840, label: 'OCT', fill: '#52525b' },
]

const Y_LABELS = [
  { y: 36, label: '$60k' },
  { y: 106, label: '$45k' },
  { y: 176, label: '$30k' },
  { y: 246, label: '$15k' },
  { y: 316, label: '$0' },
]

function LegendSwatch({ background }: { background: string }) {
  return <span style={{ width: '12px', height: '4px', borderRadius: '3px', background, flexShrink: 0 }} />
}

function LegendItem({ background, children }: { background: string; children: ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: T.muted, fontWeight: 500 }}>
      <LegendSwatch background={background} />
      {children}
    </span>
  )
}

function RevenueChart({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.18 }}
      style={{
        ...cardStyle,
        padding: '22px 24px 16px',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: '380px',
      }}
    >
      {/* panel head */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <Micro color={T.greenBright} style={{ display: 'block', marginBottom: '6px' }}>
            MONTHLY RECURRING + ONE-OFF
          </Micro>
          <div
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '18px',
              color: T.heading,
              letterSpacing: '-0.01em',
            }}
          >
            Revenue trajectory
          </div>
        </div>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
          <LegendItem background="linear-gradient(90deg,#047a32,#2ad16a)">Actual</LegendItem>
          <LegendItem background="repeating-linear-gradient(90deg,#5dffa0 0 4px,transparent 4px 8px)">
            Forecast
          </LegendItem>
          <LegendItem background="#71717a">Prior year</LegendItem>
        </div>
      </div>

      {/* chart */}
      <div style={{ flex: 1, position: 'relative', marginTop: '14px', minHeight: '280px' }}>
        <svg
          viewBox="0 0 880 360"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            <linearGradient id="anArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2ad16a" stopOpacity="0.42" />
              <stop offset="0.55" stopColor="#05a845" stopOpacity="0.14" />
              <stop offset="1" stopColor="#05a845" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="anLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#047a32" />
              <stop offset="0.7" stopColor="#2ad16a" />
              <stop offset="1" stopColor="#5dffa0" />
            </linearGradient>
            <filter id="anGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* gridlines */}
          <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
            <line x1="0" y1="40" x2="880" y2="40" />
            <line x1="0" y1="110" x2="880" y2="110" />
            <line x1="0" y1="180" x2="880" y2="180" />
            <line x1="0" y1="250" x2="880" y2="250" />
            <line x1="0" y1="320" x2="880" y2="320" />
          </g>

          {/* y labels */}
          <g fontFamily="JetBrains Mono" fontSize="10" fill="#71717a">
            {Y_LABELS.map((y) => (
              <text key={y.label} x="2" y={y.y}>
                {y.label}
              </text>
            ))}
          </g>

          {/* prior year */}
          <polyline
            points={PRIOR_POINTS}
            fill="none"
            stroke="#52525b"
            strokeWidth="2"
            strokeDasharray="1 5"
            strokeLinecap="round"
            opacity="0.7"
          />

          {/* area fill */}
          <path d={AREA_PATH} fill="url(#anArea)" />

          {/* actual line — draws in on view */}
          <motion.path
            d={ACTUAL_PATH}
            fill="none"
            stroke="url(#anLine)"
            strokeWidth="3.4"
            strokeLinecap="round"
            filter="url(#anGlow)"
            initial={reduced ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 1.4, ease: 'easeInOut', delay: reduced ? 0 : 0.3 }}
          />

          {/* forecast tail */}
          <path
            d={`${FORECAST_PATH} L840,360 L670,360 Z`}
            fill="url(#anArea)"
            opacity="0.28"
          />
          <motion.path
            d={FORECAST_PATH}
            fill="none"
            stroke="#5dffa0"
            strokeWidth="2.8"
            strokeDasharray="7 7"
            strokeLinecap="round"
            opacity="0.9"
            initial={reduced ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 0.7, ease: 'easeOut', delay: reduced ? 0 : 1.5 }}
          />

          {/* data points */}
          <g>
            {POINTS.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill={p.fill}
                stroke={p.stroke}
                strokeWidth={p.sw}
                opacity={p.opacity ?? 1}
                filter={p.glow ? 'url(#anGlow)' : undefined}
                initial={reduced ? false : { scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: p.opacity ?? 1 }}
                viewport={{ once: true }}
                transition={{ ...SPRING, delay: reduced ? 0 : 0.5 + i * 0.07 }}
                style={{ transformOrigin: `${p.cx}px ${p.cy}px` }}
              />
            ))}
          </g>

          {/* peak guide line */}
          <line x1="580" y1="72" x2="580" y2="320" stroke="rgba(93,255,160,0.35)" strokeWidth="1" strokeDasharray="3 4" />

          {/* x labels */}
          <g fontFamily="JetBrains Mono" fontSize="10" textAnchor="middle">
            {X_LABELS.map((x) => (
              <text key={x.label} x={x.x} y="346" fill={x.fill}>
                {x.label}
              </text>
            ))}
          </g>
        </svg>

        {/* peak tooltip */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...SPRING, delay: reduced ? 0 : 1.1 }}
          style={{
            position: 'absolute',
            left: '54%',
            top: '2%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,12,11,0.92)',
            border: '1px solid rgba(93,255,160,0.32)',
            borderRadius: '13px',
            padding: '11px 14px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.9), 0 0 24px rgba(45,209,106,0.22)',
            minWidth: '158px',
            pointerEvents: 'none',
          }}
        >
          <Micro color={T.greenBright} style={{ display: 'block', marginBottom: '7px' }}>
            {REVENUE.peakLabel}
          </Micro>
          <div
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '24px',
              color: T.heading,
              letterSpacing: '-0.02em',
            }}
          >
            {REVENUE.peakDisplay}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
              fontSize: '11px',
              color: T.muted,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                color: T.neon,
                fontFamily: T.mono,
                fontWeight: 700,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12l5-5 4 4 5-7" stroke={T.neon} strokeWidth="3" />
              </svg>
              {REVENUE.peakDelta}
            </span>
            {REVENUE.peakContext}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Side — crew utilization bars                                        */
/* ------------------------------------------------------------------ */

function CrewPanel({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.24 }}
      style={{ ...cardStyle, padding: '18px 20px 16px', minWidth: 0 }}
    >
      <Micro color={T.greenBright}>CREW UTILIZATION · 90D</Micro>
      {CREW.map((c, i) => (
        <div key={c.initials} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '13px' }}>
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              fontFamily: T.mono,
              fontWeight: 700,
              fontSize: '11px',
              color: '#04210f',
              flexShrink: 0,
              background: c.active
                ? 'linear-gradient(150deg,#2ad16a,#047a32)'
                : 'linear-gradient(150deg,#52525b,#3f3f46)',
            }}
          >
            {c.initials}
          </span>
          <span style={{ fontSize: '12.5px', color: T.body, fontWeight: 500, width: '52px', flexShrink: 0 }}>
            {c.name}
          </span>
          <span
            style={{
              flex: 1,
              height: '8px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <motion.span
              initial={reduced ? false : { width: '0%' }}
              whileInView={{ width: `${c.pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.9, ease: 'easeOut', delay: reduced ? 0 : 0.35 + i * 0.1 }}
              style={{
                display: 'block',
                height: '100%',
                width: `${c.pct}%`,
                borderRadius: '6px',
                background: c.active
                  ? 'linear-gradient(90deg,#047a32,#2ad16a)'
                  : 'linear-gradient(90deg,#3f6e2a,#9bcc6a)',
                boxShadow: c.active ? '0 0 12px rgba(45,209,106,0.5)' : 'none',
              }}
            />
          </span>
          <span
            style={{
              fontFamily: T.mono,
              fontWeight: 700,
              fontSize: '11.5px',
              color: T.heading,
              width: '34px',
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {c.pct}%
          </span>
        </div>
      ))}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Side — job mix donut                                                */
/* ------------------------------------------------------------------ */

const DONUT_R = 46
const DONUT_C = 2 * Math.PI * DONUT_R // ~289

function DonutPanel({ reduced }: { reduced: boolean }) {
  // cumulative offsets matching mockup (gap between segments)
  let cursor = 0
  const segments = JOB_MIX.map((s) => {
    const len = (s.pct / 100) * DONUT_C
    const dash = Math.max(0, len - 4) // small gap
    const offset = -cursor
    cursor += len + 1.5
    return { ...s, dash, gap: DONUT_C - dash, offset }
  })

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.3 }}
      style={{ ...cardStyle, padding: '18px 20px 16px', minWidth: 0 }}
    >
      <Micro color={T.greenBright} style={{ display: 'block', marginBottom: '4px' }}>
        JOB MIX BY TYPE
      </Micro>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '6px', flexWrap: 'wrap' }}>
        <svg width="118" height="118" viewBox="0 0 120 120" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="60" cy="60" r={DONUT_R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
          {segments.map((s, i) => (
            <motion.circle
              key={s.name}
              cx="60"
              cy="60"
              r={DONUT_R}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
              transform="rotate(-90 60 60)"
              style={{
                filter:
                  i === 0
                    ? 'drop-shadow(0 0 6px rgba(45,209,106,0.5))'
                    : i === 2
                      ? 'drop-shadow(0 0 5px rgba(232,93,4,0.45))'
                      : undefined,
                transformOrigin: '60px 60px',
              }}
              initial={reduced ? false : { opacity: 0, strokeDasharray: `0 ${DONUT_C}` }}
              whileInView={{ opacity: 1, strokeDasharray: `${s.dash} ${s.gap}` }}
              viewport={{ once: true }}
              transition={{ duration: reduced ? 0 : 0.7, ease: 'easeOut', delay: reduced ? 0 : 0.4 + i * 0.12 }}
            />
          ))}
          <text x="60" y="56" textAnchor="middle" fontFamily="Outfit" fontWeight="800" fontSize="22" fill="#fafafa">
            {JOB_TOTAL}
          </text>
          <text
            x="60"
            y="72"
            textAnchor="middle"
            fontFamily="JetBrains Mono"
            fontSize="8"
            letterSpacing="1.5"
            fill="#71717a"
          >
            JOBS
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flex: 1, minWidth: '120px' }}>
          {JOB_MIX.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '12px', color: T.body }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: s.color, flexShrink: 0 }} />
              {s.name}
              <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontWeight: 700, fontSize: '11.5px', color: T.muted }}>
                {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Side — seasonal forecast + Cutty insight                            */
/* ------------------------------------------------------------------ */

function SeasonalPanel({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.36 }}
      style={{ ...cardStyle, padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', minWidth: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <Micro color={T.greenBright} style={{ display: 'block', marginBottom: '5px' }}>
            SEASONAL FORECAST
          </Micro>
          <div style={{ fontSize: '12px', color: T.muted }}>Projected demand · next 6 mo</div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: T.mono,
            fontWeight: 700,
            fontSize: '10px',
            padding: '3px 8px',
            borderRadius: '7px',
            color: T.neon,
            background: 'rgba(45,209,106,0.13)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5-5 4 4 5-7" stroke={T.neon} strokeWidth="3" />
          </svg>
          SPRING SPIKE
        </span>
      </div>

      {/* seasonal bars */}
      <div style={{ marginTop: '10px' }}>
        <svg
          viewBox="0 0 360 92"
          width="100%"
          height="86"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <line x1="0" y1="74" x2="360" y2="74" stroke="rgba(255,255,255,0.07)" />
          <g>
            {SEASON.map((b, i) => (
              <motion.rect
                key={b.month}
                x={14 + i * 48}
                y={b.y}
                width="30"
                height={b.h}
                rx="4"
                fill={b.fill}
                style={{ filter: b.glow ? `drop-shadow(${b.glow})` : undefined, transformOrigin: `${14 + i * 48 + 15}px 74px` }}
                initial={reduced ? false : { scaleY: 0, opacity: 0 }}
                whileInView={{ scaleY: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ ...SPRING, delay: reduced ? 0 : 0.45 + i * 0.07 }}
              />
            ))}
          </g>
          <g fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle">
            {SEASON.map((b, i) => (
              <text key={b.month} x={14 + i * 48 + 15} y="88" fill={b.label ?? '#71717a'}>
                {b.month}
              </text>
            ))}
          </g>
        </svg>
      </div>

      {/* Cutty insight */}
      <div
        style={{
          marginTop: '13px',
          display: 'flex',
          gap: '13px',
          padding: '14px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg,rgba(232,93,4,0.12),rgba(45,209,106,0.06))',
          border: '1px solid rgba(232,93,4,0.26)',
        }}
      >
        <span
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'radial-gradient(circle at 35% 30%,rgba(45,209,106,0.4),rgba(5,122,50,0.15))',
            border: '1px solid rgba(93,255,160,0.34)',
            boxShadow: '0 0 18px rgba(45,209,106,0.4)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2l2.2 4.8L19 9l-4.8 2.2L12 16l-2.2-4.8L5 9l4.8-2.2L12 2Z" fill="#5dffa0" />
            <path d="M18 14l1 2.4L21.5 17l-2.5 1L18 20.5 17 18l-2.5-1L17 16l1-2Z" fill="#2ad16a" />
          </svg>
        </span>
        <p style={{ fontSize: '12px', color: T.body, lineHeight: 1.45, margin: 0 }}>
          <b style={{ color: T.heading, fontWeight: 600 }}>Cutty insight.</b> Aeration demand spikes in{' '}
          <b style={{ color: T.heading, fontWeight: 600 }}>3 weeks</b> — pre-book now to capture an est.{' '}
          <b style={{ color: T.neon, fontWeight: 600 }}>+$11,400</b> at current crew capacity.
        </p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function Analytics() {
  const reduced = useReducedMotion()

  return (
    <section
      aria-labelledby="analytics-heading"
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
            marginBottom: 'clamp(24px, 4vw, 34px)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Micro color={T.greenBright} style={{ display: 'block', marginBottom: '12px' }}>
              OPERATIONS · REVENUE INTELLIGENCE
            </Micro>
            <h2
              id="analytics-heading"
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
              Business{' '}
              <span
                style={{
                  backgroundImage: `linear-gradient(120deg, ${T.neon}, ${T.greenBright})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
                }}
              >
                Intelligence
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
              Every job, crew, and dollar — forecast by{' '}
              <b style={{ color: T.greenBright, fontWeight: 600 }}>Cutty</b> in real time.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '9px',
                padding: '9px 14px',
                borderRadius: '11px',
                background: T.card,
                border: `1px solid ${T.border}`,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                fontSize: '12.5px',
                color: T.body,
                fontWeight: 500,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="17" rx="3" />
                <path d="M3 9h18M8 2v4M16 2v4" />
              </svg>
              Last 90 days
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2.4" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '9px',
                padding: '9px 14px',
                borderRadius: '11px',
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
                  background: T.greenBright,
                  boxShadow: `0 0 9px ${T.greenBright}`,
                  animation: reduced ? undefined : 'scanPulse 1.6s ease-in-out infinite',
                }}
              />
              <span style={{ fontSize: '12.5px', color: T.muted }}>Live · synced 2m ago</span>
            </span>
          </div>
        </motion.div>

        {/* KPI band */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '18px',
            marginBottom: '18px',
          }}
        >
          {KPIS.map((kpi, i) => (
            <KpiCard key={kpi.label} kpi={kpi} index={i} reduced={reduced} />
          ))}
        </div>

        {/* main + side grid */}
        <div className="analytics-grid" style={{ display: 'grid', gap: '18px', alignItems: 'stretch' }}>
          <RevenueChart reduced={reduced} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            <CrewPanel reduced={reduced} />
            <DonutPanel reduced={reduced} />
            <SeasonalPanel reduced={reduced} />
          </div>
        </div>
      </div>

      {/* Responsive: two-column on desktop, single column below 980px */}
      <style>{`
        .analytics-grid { grid-template-columns: 1fr; }
        @media (min-width: 980px) {
          .analytics-grid { grid-template-columns: 1fr 392px; }
        }
      `}</style>

      <GrainVignette />
    </section>
  )
}
