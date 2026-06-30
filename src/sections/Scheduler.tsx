import React, { useState } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/useScrollBeat'

/* ============================================================================
 * Route Optimizer — product-tour section ("One street. One route.")
 * Self-contained: crew lanes (left) + auto-optimized live route map (right).
 * Inline styles only; canonical spring {stiffness:320,damping:28}; all
 * decorative/looping motion gated behind useReducedMotion().
 * ==========================================================================*/

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 }

// ---- LEFT: crew lanes -------------------------------------------------------
type Job = {
  stop: number
  client: string
  amount: string
  service: string
  time: string
  addr: string
  state?: 'normal' | 'dragging'
}
type Crew = {
  initials: string
  name: string
  truck: string
  avatar: 'green' | 'orange'
  jobs: Job[]
  dropGhost?: string
  dropAfter?: number
}

const CREWS: Crew[] = [
  {
    initials: 'MR', name: 'Marcus Reyes', truck: 'Truck 04 · North loop', avatar: 'green',
    jobs: [
      { stop: 1, client: 'Halverson Estate', amount: '$220', service: 'Full mow · edge · blow', time: '7:30 — 8:45 AM', addr: '4421 Oak Ridge Dr' },
      { stop: 2, client: 'Cedarbrook HOA', amount: '$310', service: 'Common-area trim · mulch', time: '9:10 — 10:50 AM', addr: '88 Cedarbrook Ln' },
      { stop: 3, client: 'Patel Residence', amount: '$165', service: 'Hedge shape · cleanup', time: '11:15 — 12:20 PM', addr: '2107 Linden Ct', state: 'dragging' },
    ],
  },
  {
    initials: 'DK', name: 'Dani Kwon', truck: 'Truck 02 · South loop', avatar: 'orange',
    dropGhost: 'Drop here · re-route 3 stops', dropAfter: 0,
    jobs: [
      { stop: 4, client: 'Maplewood Café', amount: '$140', service: 'Planter refresh · sweep', time: '8:00 — 9:00 AM', addr: '311 Market St' },
      { stop: 5, client: 'Sorensen Lot', amount: '$205', service: 'Sod repair · irrigation chk', time: '9:40 — 11:10 AM', addr: '740 Pine Hollow' },
      { stop: 6, client: 'Riverside Dental', amount: '$185', service: 'Seasonal cleanup · leaves', time: '11:30 — 12:45 PM', addr: '19 Riverside Ave' },
    ],
  },
]

// ---- TOP-RIGHT: optimized savings banner -----------------------------------
const OPTIMIZED = { savedMi: '34 mi', savedHrs: '1.2 hrs', savedFuel: '−$41' }

// ---- CONTROLS: day selector (today = Mon 30) -------------------------------
const DAYS = [
  { name: 'Sun', num: '29' }, { name: 'Mon', num: '30', today: true }, { name: 'Tue', num: '01' },
  { name: 'Wed', num: '02' }, { name: 'Thu', num: '03' }, { name: 'Fri', num: '04' }, { name: 'Sat', num: '05' },
]

// ---- MAP: route stops (viewBox 0 0 900 420) --------------------------------
type Stop = { n: number; cx: number; cy: number; key?: boolean; truck?: boolean }
const STOPS: Stop[] = [
  { n: 1, cx: 120, cy: 95, key: true },
  { n: 2, cx: 300, cy: 130 },
  { n: 3, cx: 370, cy: 250, key: true, truck: true },
  { n: 4, cx: 520, cy: 215 },
  { n: 5, cx: 600, cy: 320 },
  { n: 6, cx: 730, cy: 290 },
  { n: 7, cx: 800, cy: 150, key: true },
]
const ROUTE_D = 'M120 95 L300 130 L370 250 L520 215 L600 320 L730 290 L800 150'
const MAP_TAGS = [
  { text: 'RIVERSIDE PARK', left: '6%', top: '12%' },
  { text: 'HOLLOW GREEN', left: '70%', top: '64%' },
  { text: 'CIVIC COMMONS', left: '44%', top: '6%' },
  { text: 'LINDEN RIVER', left: '30%', top: '88%' },
]
const MAP_ETA = { label: 'TRUCK 04 · EN ROUTE STOP 3', eta: 'ETA 11:14 AM' }

// ---- BOTTOM: totals bar -----------------------------------------------------
type Total = { label: string; value: string; unit?: string; tone?: 'green' | 'greenval' | 'money' }
const TOTALS: Total[] = [
  { label: 'STOPS', value: '7', tone: 'green' },
  { label: 'DISTANCE', value: '18.4', unit: 'mi' },
  { label: 'DRIVE + WORK', value: '6.5', unit: 'hrs' },
  { label: 'EFFICIENCY', value: '94%', tone: 'greenval' },
  { label: 'DAY REVENUE', value: '$1,240', tone: 'money' },
]

// ---- palette ----------------------------------------------------------------
const C = {
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
}
const MONO = "'JetBrains Mono', monospace"
const DISPLAY = "'Outfit', sans-serif"
const BODY = "'Inter', sans-serif"

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
        color: C.faint,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

function LiveDot({ reduced, color = C.greenNeon, size = 7 }: { reduced: boolean; color?: string; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '999px',
        background: color,
        boxShadow: `0 0 8px ${color}, 0 0 2px ${color}`,
        flexShrink: 0,
        animation: reduced ? 'none' : 'scanPulse 2.2s ease-in-out infinite',
      }}
      aria-hidden="true"
    />
  )
}

// =============================================================================
// Job card
// =============================================================================

function JobCard({ job, reduced }: { job: Job; reduced: boolean }) {
  const dragging = job.state === 'dragging'

  const base: React.CSSProperties = {
    position: 'relative',
    background: dragging ? 'rgba(5,168,69,0.10)' : C.card,
    border: dragging ? '1px solid rgba(45,209,106,0.45)' : `1px solid ${C.bd}`,
    borderRadius: '12px',
    padding: '11px 12px',
    boxSizing: 'border-box',
    boxShadow: dragging
      ? '0 18px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(45,209,106,0.25), 0 0 24px rgba(45,209,106,0.18)'
      : '0 1px 0 rgba(0,0,0,0.2)',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    cursor: 'default',
  }

  const draggingTransform = 'rotate(-2.2deg) scale(1.03) translateX(8px)'

  const inner = (
    <>
      {/* drag handle dots */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 3px)',
          gap: '3px',
          marginTop: '3px',
          flexShrink: 0,
          opacity: 0.5,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} style={{ width: '3px', height: '3px', borderRadius: '999px', background: C.muted }} />
        ))}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        {/* client + amount */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '13.5px', color: C.h, lineHeight: 1.25 }}>
            {job.client}
          </span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '13px', color: C.orangeBright }}>
            {job.amount}
          </span>
        </div>

        {/* service */}
        <div style={{ fontFamily: BODY, fontSize: '12px', color: C.muted, marginTop: '3px', lineHeight: 1.35 }}>
          {job.service}
        </div>

        {/* stop chip + time · addr */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            flexWrap: 'wrap',
            overflowWrap: 'anywhere',
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: C.greenBright,
              background: 'rgba(5,168,69,0.15)',
              borderRadius: '5px',
              padding: '3px 6px',
              flexShrink: 0,
            }}
          >
            STOP {job.stop}
          </span>
          <span style={{ fontFamily: MONO, fontSize: '10px', color: C.faint, letterSpacing: '0.04em' }}>
            {job.time} · {job.addr}
          </span>
        </div>
      </div>
    </>
  )

  if (dragging) {
    // "being dragged" lifted state — gentle float when motion allowed, frozen otherwise.
    return (
      <motion.div
        style={{ ...base, transformOrigin: 'center', willChange: 'transform' }}
        initial={false}
        animate={
          reduced
            ? { transform: draggingTransform }
            : { transform: [`${draggingTransform} translateY(0px)`, `${draggingTransform} translateY(-3px)`, `${draggingTransform} translateY(0px)`] }
        }
        transition={reduced ? undefined : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
      >
        {inner}
      </motion.div>
    )
  }

  return <div style={base}>{inner}</div>
}

// =============================================================================
// Drop ghost (dashed "drop here" target)
// =============================================================================

function DropGhost({ label, reduced }: { label: string; reduced: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={reduced ? { opacity: 0.7 } : { opacity: [0.5, 0.8, 0.5] }}
      transition={reduced ? undefined : { duration: 2.2, ease: 'easeInOut', repeat: Infinity }}
      style={{
        border: '1px dashed rgba(45,209,106,0.55)',
        borderRadius: '12px',
        padding: '14px 12px',
        background: 'rgba(45,209,106,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
      aria-hidden="true"
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: C.greenBright,
        }}
      >
        {label}
      </span>
    </motion.div>
  )
}

// =============================================================================
// Crew lane
// =============================================================================

function Lane({ crew, index, reduced }: { crew: Crew; index: number; reduced: boolean }) {
  const avatarColor = crew.avatar === 'green' ? C.green : C.orange
  const avatarGlow = crew.avatar === 'green' ? 'rgba(5,168,69,0.35)' : 'rgba(232,93,4,0.35)'

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...SPRING, delay: 0.1 + index * 0.08 }}
      style={{
        background: C.cardHi,
        border: `1px solid ${C.bd}`,
        borderRadius: '18px',
        padding: '14px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* lane head */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: `linear-gradient(180deg, ${avatarColor}, rgba(0,0,0,0.25))`,
            boxShadow: `0 0 0 1px ${avatarGlow}, 0 6px 16px rgba(0,0,0,0.4)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: '12px',
            color: '#03210f',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {crew.initials}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '14px', color: C.h, lineHeight: 1.2 }}>
            {crew.name}
          </div>
          <div style={{ fontFamily: MONO, fontSize: '9.5px', letterSpacing: '0.08em', color: C.faint, marginTop: '2px' }}>
            {crew.truck}
          </div>
        </div>
        <LiveDot reduced={reduced} color={crew.avatar === 'green' ? C.greenNeon : C.orangeBright} />
      </div>

      {/* jobs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {crew.jobs.map((job, i) => (
          <React.Fragment key={job.stop}>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ ...SPRING, delay: 0.12 + index * 0.08 + i * 0.05 }}
            >
              <JobCard job={job} reduced={reduced} />
            </motion.div>
            {crew.dropGhost && crew.dropAfter === i && (
              <DropGhost label={crew.dropGhost} reduced={reduced} />
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  )
}

// =============================================================================
// Day selector
// =============================================================================

function DaySelector() {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {DAYS.map((d) => {
        const today = !!d.today
        return (
          <div
            key={d.name + d.num}
            style={{
              minWidth: '48px',
              padding: '7px 8px',
              borderRadius: '10px',
              textAlign: 'center',
              border: today ? '1px solid rgba(45,209,106,0.5)' : `1px solid ${C.bd}`,
              background: today ? 'rgba(5,168,69,0.15)' : C.card,
              boxShadow: today ? '0 0 16px rgba(45,209,106,0.18)' : 'none',
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: today ? C.greenBright : C.faint,
              }}
            >
              {d.name}
            </div>
            <div
              style={{
                fontFamily: DISPLAY,
                fontWeight: 700,
                fontSize: '15px',
                color: today ? C.h : C.muted,
                marginTop: '2px',
              }}
            >
              {d.num}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Auto-optimize toggle (static ON)
// =============================================================================

function AutoOptimizeToggle() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '9px',
        padding: '7px 12px 7px 10px',
        borderRadius: '999px',
        border: '1px solid rgba(45,209,106,0.4)',
        background: 'rgba(5,168,69,0.12)',
      }}
    >
      <span
        style={{
          width: '34px',
          height: '18px',
          borderRadius: '999px',
          background: `linear-gradient(180deg, ${C.greenBright}, ${C.greenDeep})`,
          position: 'relative',
          boxShadow: '0 0 10px rgba(45,209,106,0.4)',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '14px',
            height: '14px',
            borderRadius: '999px',
            background: '#03210f',
          }}
        />
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: C.greenBright,
        }}
      >
        Auto-optimize ON
      </span>
    </div>
  )
}

// =============================================================================
// Route map (SVG)
// =============================================================================

function RouteMap({ reduced }: { reduced: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '900 / 420',
        minHeight: 'clamp(240px, 60vw, 420px)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: `1px solid ${C.bd}`,
        background:
          'radial-gradient(700px 500px at 62% 40%, rgba(5,168,69,0.10), transparent 60%), linear-gradient(160deg, #0a0c0b, #070808 70%)',
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.02)',
      }}
    >
      <svg
        viewBox="0 0 900 420"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="ro-route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.greenDeep} />
            <stop offset="55%" stopColor={C.greenBright} />
            <stop offset="100%" stopColor={C.greenNeon} />
          </linearGradient>
          <radialGradient id="ro-stopglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={C.greenNeon} stopOpacity="0.9" />
            <stop offset="45%" stopColor={C.greenBright} stopOpacity="0.5" />
            <stop offset="100%" stopColor={C.greenBright} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="ro-park" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0c7a3a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0c7a3a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* park blobs / green space */}
        <ellipse cx="120" cy="80" rx="150" ry="100" fill="url(#ro-park)" />
        <ellipse cx="720" cy="300" rx="160" ry="110" fill="url(#ro-park)" />
        <ellipse cx="430" cy="40" rx="120" ry="70" fill="url(#ro-park)" />

        {/* water — linden river */}
        <path
          d="M0 360 C 180 330, 300 400, 470 372 C 640 346, 760 410, 900 380 L900 420 L0 420 Z"
          fill="rgba(40,90,160,0.16)"
        />
        <path
          d="M0 360 C 180 330, 300 400, 470 372 C 640 346, 760 410, 900 380"
          fill="none"
          stroke="rgba(96,165,250,0.22)"
          strokeWidth="2"
        />

        {/* faint street grid */}
        {[70, 150, 230, 310, 390].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="900" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {[140, 280, 420, 560, 700, 840].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="420" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}

        {/* arterials (slightly brighter) */}
        <line x1="0" y1="190" x2="900" y2="170" stroke="rgba(255,255,255,0.09)" strokeWidth="2" />
        <line x1="470" y1="0" x2="500" y2="420" stroke="rgba(255,255,255,0.09)" strokeWidth="2" />

        {/* route — glow underlay */}
        <motion.path
          d={ROUTE_D}
          fill="none"
          stroke={C.greenBright}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'blur(7px)', opacity: 0.55 }}
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={reduced ? undefined : { pathLength: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={reduced ? undefined : { duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
        />
        {/* route — solid gradient */}
        <motion.path
          d={ROUTE_D}
          fill="none"
          stroke="url(#ro-route)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={reduced ? undefined : { pathLength: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={reduced ? undefined : { duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
        />
        {/* route — dashed top accent */}
        <motion.path
          d={ROUTE_D}
          fill="none"
          stroke={C.greenNeon}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="2 9"
          style={{ opacity: 0.8 }}
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={reduced ? undefined : { pathLength: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={reduced ? undefined : { duration: 1.4, ease: 'easeInOut', delay: 0.3 }}
        />

        {/* stops */}
        {STOPS.map((s) => {
          const ringColor = s.key ? C.greenNeon : C.greenBright
          return (
            <motion.g
              key={s.n}
              initial={reduced ? false : { scale: 0, opacity: 0 }}
              whileInView={reduced ? undefined : { scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ ...SPRING, delay: 0.4 + s.n * 0.12 }}
              style={{ transformOrigin: `${s.cx}px ${s.cy}px` }}
            >
              {/* glow ring */}
              <circle cx={s.cx} cy={s.cy} r="22" fill="url(#ro-stopglow)" />
              {/* ring */}
              <circle
                cx={s.cx}
                cy={s.cy}
                r="13"
                fill="rgba(7,12,9,0.85)"
                stroke={ringColor}
                strokeWidth={s.key ? 2.4 : 1.6}
                style={{ filter: `drop-shadow(0 0 ${s.key ? 6 : 3}px ${ringColor})` }}
              />
              {s.truck ? (
                // truck glyph at the EN-ROUTE active stop
                <g>
                  <rect x={s.cx - 8} y={s.cy - 4} width="11" height="8" rx="1.6" fill={C.greenNeon} />
                  <rect x={s.cx + 2} y={s.cy - 5.5} width="6" height="6" rx="1.2" fill={C.greenBright} />
                  <circle cx={s.cx - 4} cy={s.cy + 5} r="1.8" fill="#03210f" />
                  <circle cx={s.cx + 5} cy={s.cy + 5} r="1.8" fill="#03210f" />
                </g>
              ) : (
                <text
                  x={s.cx}
                  y={s.cy + 4}
                  textAnchor="middle"
                  fill={s.key ? C.greenNeon : C.greenBright}
                  fontSize="12"
                  fontWeight="700"
                  fontFamily={MONO}
                >
                  {s.n}
                </text>
              )}
            </motion.g>
          )
        })}
      </svg>

      {/* map text tags */}
      {MAP_TAGS.map((tag) => (
        <div
          key={tag.text}
          style={{
            position: 'absolute',
            left: tag.left,
            top: tag.top,
            fontFamily: MONO,
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: 'rgba(94,232,152,0.55)',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {tag.text}
        </div>
      ))}

      {/* top-right ETA chip */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: -8 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ ...SPRING, delay: 0.55 }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '8px 11px',
          borderRadius: '12px',
          background: 'rgba(9,9,11,0.78)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(45,209,106,0.35)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          maxWidth: '70%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <LiveDot reduced={reduced} size={6} />
          <span
            style={{
              fontFamily: MONO,
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: C.greenBright,
            }}
          >
            {MAP_ETA.label}
          </span>
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '13px', color: C.h, marginTop: '3px' }}>
          {MAP_ETA.eta}
        </div>
      </motion.div>

      {/* bottom-left legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          padding: '9px 11px',
          borderRadius: '12px',
          background: 'rgba(9,9,11,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${C.bd}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '14px', height: '3px', borderRadius: '2px', background: `linear-gradient(90deg, ${C.greenDeep}, ${C.greenNeon})` }} />
          <MicroLabel style={{ color: C.muted }}>Optimized route</MicroLabel>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LiveDot reduced={reduced} size={7} />
          <MicroLabel style={{ color: C.muted }}>Active stop · live</MicroLabel>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '9px', height: '9px', borderRadius: '999px', background: 'rgba(12,122,58,0.6)' }} />
          <MicroLabel style={{ color: C.muted }}>Parks &amp; green space</MicroLabel>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Totals bar
// =============================================================================

function TotalsBar({ reduced }: { reduced: boolean }) {
  const [hover, setHover] = useState(false)

  const valueColor = (tone?: Total['tone']) =>
    tone === 'money' ? C.orangeBright : tone === 'greenval' || tone === 'green' ? C.greenBright : C.h

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
        gap: '10px',
        alignItems: 'stretch',
        background: C.card,
        border: `1px solid ${C.bd}`,
        borderRadius: '16px',
        padding: '14px',
        boxSizing: 'border-box',
      }}
    >
      {TOTALS.map((t, i) => {
        const emphasize = t.label === 'DAY REVENUE' || t.label === 'EFFICIENCY'
        return (
          <motion.div
            key={t.label}
            initial={reduced ? false : { opacity: 0, y: 10, scale: emphasize ? 0.94 : 1 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ ...SPRING, delay: 0.55 + i * 0.06 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              padding: '4px 8px',
              borderLeft: i === 0 ? 'none' : `1px solid ${C.hair}`,
              minWidth: 0,
            }}
          >
            <MicroLabel style={{ color: t.tone === 'green' ? C.greenBright : C.faint }}>{t.label}</MicroLabel>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: '22px', color: valueColor(t.tone), lineHeight: 1 }}>
                {t.value}
              </span>
              {t.unit && (
                <span style={{ fontFamily: BODY, fontSize: '11px', color: C.faint }}>{t.unit}</span>
              )}
            </div>
          </motion.div>
        )
      })}

      {/* Re-optimize button */}
      <motion.button
        type="button"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ ...SPRING, delay: 0.55 + TOTALS.length * 0.06 }}
        animate={{ scale: hover && !reduced ? 1.02 : 1 }}
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{
          gridColumn: '1 / -1',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 18px',
          cursor: 'pointer',
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: '14px',
          color: '#03210f',
          background: hover
            ? `linear-gradient(180deg, ${C.greenNeon}, ${C.green})`
            : `linear-gradient(180deg, ${C.greenBright}, ${C.greenDeep})`,
          boxShadow: '0 0 26px rgba(45,209,106,0.35), 0 6px 18px rgba(0,0,0,0.4)',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5"
            stroke="#03210f"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Re-optimize
      </motion.button>
    </div>
  )
}

// =============================================================================
// Background glow + overlays
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
          'radial-gradient(900px 600px at 68% 38%, rgba(5,168,69,0.16), transparent 60%)',
          'radial-gradient(700px 520px at 12% 8%, rgba(45,209,106,0.10), transparent 58%)',
          'radial-gradient(620px 480px at 96% 92%, rgba(232,93,4,0.10), transparent 60%)',
          'radial-gradient(520px 420px at 30% 100%, rgba(124,58,237,0.07), transparent 60%)',
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
        <filter id="ro-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ro-grain)" />
      </svg>
    </>
  )
}

// =============================================================================
// Section
// =============================================================================

export default function Scheduler() {
  const reduced = useReducedMotion()

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        padding: 'clamp(56px, 8vw, 96px) 24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      aria-labelledby="route-optimizer-heading"
    >
      <GlowField />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={SPRING}
          style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 36px' }}
        >
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
            <span
              style={{
                fontFamily: MONO,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: C.greenBright,
              }}
            >
              Scheduler · Live dispatch · 7 stops
            </span>
          </div>

          <h2
            id="route-optimizer-heading"
            style={{
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 'clamp(28px, 5vw, 44px)',
              color: C.h,
              lineHeight: 1.1,
              margin: '0 0 14px 0',
            }}
          >
            One street.{' '}
            <span
              style={{
                background: `linear-gradient(90deg, ${C.greenBright}, ${C.greenNeon})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              One route.
            </span>
          </h2>

          <p
            style={{
              fontFamily: BODY,
              fontWeight: 400,
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              color: C.body,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Drag a job, drop a crew — YardWorx re-sequences the whole day in real time. Two crews,
            seven stops, every truck on its tightest loop.
          </p>
        </motion.div>

        {/* App frame */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 30 }}
          whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ ...SPRING, delay: 0.05 }}
          style={{
            position: 'relative',
            background: 'rgba(9,9,11,0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1px solid ${C.bd}`,
            borderRadius: '22px',
            padding: '16px',
            boxSizing: 'border-box',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* frame toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: `1px solid ${C.hair}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 21c5-3 8-7 8-11a8 8 0 0 0-8-8 8 8 0 0 0-8 8c0 4 3 8 8 11Z"
                  fill={C.green}
                  opacity="0.25"
                />
                <path
                  d="M12 21c0-6 2-10 6-13M12 21c0-4-1.5-7-4-9"
                  stroke={C.greenBright}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '14px', color: C.h }}>
                Route Optimizer
              </span>
            </div>

            {/* OPTIMIZED savings banner */}
            <motion.div
              initial={reduced ? false : { opacity: 0, x: 12 }}
              whileInView={reduced ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ ...SPRING, delay: 0.5 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                padding: '7px 12px',
                borderRadius: '999px',
                border: '1px solid rgba(45,209,106,0.35)',
                background: 'rgba(5,168,69,0.12)',
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: C.greenNeon,
                }}
              >
                Optimized
              </span>
              <span style={{ fontFamily: MONO, fontSize: '11px', color: C.greenBright, fontWeight: 700 }}>
                {OPTIMIZED.savedMi}
                <span style={{ color: C.faint, fontWeight: 400 }}> saved</span>
              </span>
              <span style={{ fontFamily: MONO, fontSize: '11px', color: C.greenBright, fontWeight: 700 }}>
                {OPTIMIZED.savedHrs}
              </span>
              <span style={{ fontFamily: MONO, fontSize: '11px', color: C.orangeBright, fontWeight: 700 }}>
                {OPTIMIZED.savedFuel}
                <span style={{ color: C.faint, fontWeight: 400 }}> fuel</span>
              </span>
            </motion.div>
          </div>

          {/* Two-column cockpit */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {/* LEFT — crew lanes */}
            <div style={{ minWidth: 0, maxWidth: '380px', width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: '14px', color: C.h }}>
                  Crew Lanes
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: C.greenBright,
                    background: 'rgba(5,168,69,0.15)',
                    border: '1px solid rgba(45,209,106,0.3)',
                    borderRadius: '999px',
                    padding: '4px 9px',
                  }}
                >
                  2 Active · Mon 30
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {CREWS.map((crew, i) => (
                  <Lane key={crew.initials} crew={crew} index={i} reduced={reduced} />
                ))}
              </div>
            </div>

            {/* RIGHT — map / route */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* controls row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <DaySelector />
                <AutoOptimizeToggle />
              </div>

              <RouteMap reduced={reduced} />

              <TotalsBar reduced={reduced} />
            </div>
          </div>
        </motion.div>
      </div>

      <GrainVignette />
    </section>
  )
}
