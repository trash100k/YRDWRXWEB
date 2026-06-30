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
  amber: '#fbbf6b',
  sky: '#7dd3fc',
  violet: '#c4b5fd',
  heading: '#fafafa',
  body: '#d4d4d8',
  muted: '#a1a1aa',
  faint: '#71717a',
  card: 'rgba(255,255,255,0.04)',
  card2: 'rgba(255,255,255,0.055)',
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

const HEAD_STATS = [
  { v: '418', l: 'In segments', money: false },
  { v: '31%', l: 'Avg open', money: false },
  { v: '$8,400', l: 'Recovered MTD', money: true },
] as const

type SegKey = 'past' | 'lapsed' | 'value' | 'neighbor'
type Segment = { key: SegKey; name: string; ct: string; num: string; on: boolean }
const SEGMENTS: Segment[] = [
  { key: 'past', name: 'Past clients', ct: 'Completed ≥1 job', num: '276', on: false },
  { key: 'lapsed', name: 'Lapsed 6mo', ct: "No job since Dec '25", num: '142', on: true },
  { key: 'value', name: 'High-value', ct: 'LTV > $2,400', num: '63', on: false },
  { key: 'neighbor', name: 'Neighbors of jobs', ct: 'Within 0.3mi, active', num: '89', on: false },
]

const BAR_HEIGHTS = [38, 55, 44, 70, 61, 88, 100]

type ChanKind = 'sms' | 'email'
type Campaign = {
  name: string
  kind: ChanKind
  rev: string
  open: string
  booked: string
  sent: string
  meter: number
}
const CAMPAIGNS: Campaign[] = [
  { name: 'Fall Cleanup Push', kind: 'email', rev: '$3,150', open: '38%', booked: '21', sent: '312', meter: 38 },
  { name: 'Lapsed 90-day Nudge', kind: 'sms', rev: '$2,720', open: '44%', booked: '18', sent: '198', meter: 44 },
  { name: 'Neighbor Referral Blast', kind: 'sms', rev: '$1,480', open: '29%', booked: '9', sent: '134', meter: 29 },
  { name: 'VIP Snow Pre-Sale', kind: 'email', rev: '$1,050', open: '52%', booked: '6', sent: '63', meter: 52 },
]

const COMPOSER = {
  who: 'YardWorx · Spring Aeration Win-back',
  sub: 'SMS · 142 recipients · personalized',
  campaign: 'Spring Aeration — 15% early-bird',
  chars: '168 chars · 1 segment',
  tone: 'Friendly tone',
  send: 'Send 8:30 AM',
  phoneName: 'YardWorx',
  phoneNum: '+1 (612) 555-0147',
  phoneTime: '8:30 AM · Delivered',
}

/* ------------------------------------------------------------------ */
/* Tiny shared style recipes                                           */
/* ------------------------------------------------------------------ */

const microBase: CSSProperties = {
  fontFamily: T.mono,
  fontSize: '9.5px',
  fontWeight: 500,
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
  boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
  overflow: 'hidden',
}

function CardHead({ title, label }: { title: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '4px',
      }}
    >
      <span
        style={{
          fontFamily: T.display,
          fontWeight: 800,
          fontSize: '14px',
          color: T.heading,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </span>
      <Micro>{label}</Micro>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Brand leaf glyph (reused across cards / phone)                      */
/* ------------------------------------------------------------------ */

function LeafGlyph({ size = 17, full = true }: { size?: number; full?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21C12 21 4 16 4 9.5C4 6 6.5 3 12 3C12 9 8 12 8 16C10 13 12 11 12 21Z"
        fill={T.neon}
      />
      {full && <path d="M12 21C12 14 16 11 20 10.5C20 16 16 19 12 21Z" fill={T.greenBright} />}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Segment row icons (paths copied from mockup)                        */
/* ------------------------------------------------------------------ */

function SegIcon({ icon, color }: { icon: SegKey; color: string }) {
  switch (icon) {
    case 'past':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        </svg>
      )
    case 'lapsed':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'value':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" aria-hidden="true">
          <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.9L12 16.5 6.8 19.2l1-5.9L3.5 9.2l5.9-.9z" />
        </svg>
      )
    case 'neighbor':
      return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" aria-hidden="true">
          <path d="M12 21s-7-4.4-7-10a7 7 0 0114 0c0 5.6-7 10-7 10z" />
          <circle cx="12" cy="11" r="2.4" />
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
          'radial-gradient(900px 620px at 18% 4%, rgba(5,168,69,0.20), transparent 60%)',
          'radial-gradient(760px 560px at 96% 12%, rgba(232,93,4,0.12), transparent 58%)',
          'radial-gradient(700px 560px at 60% 104%, rgba(93,255,160,0.10), transparent 62%)',
          'radial-gradient(620px 480px at 90% 96%, rgba(124,58,237,0.10), transparent 60%)',
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
          opacity: 0.04,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="campaignsGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#campaignsGrain)" />
      </svg>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* LEFT card — audience builder                                        */
/* ------------------------------------------------------------------ */

function SegmentChip({ seg, index, reduced }: { seg: Segment; index: number; reduced: boolean }) {
  const on = seg.on
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.2 + index * 0.08 }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 13px',
        borderRadius: '14px',
        background: on
          ? 'linear-gradient(180deg,rgba(5,168,69,0.13),rgba(5,168,69,0.04))'
          : T.card2,
        border: on ? '1px solid rgba(45,209,106,0.5)' : `1px solid ${T.border}`,
        boxShadow: on
          ? '0 0 0 1px rgba(45,209,106,0.18), 0 10px 26px rgba(5,168,69,0.14)'
          : 'none',
        animation: on && !reduced ? 'chipGlow 2.6s ease-out infinite' : undefined,
      }}
    >
      <span
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          background: on
            ? 'radial-gradient(120% 120% at 30% 20%, rgba(93,255,160,0.32), rgba(5,168,69,0.1))'
            : 'rgba(255,255,255,0.04)',
          border: on ? '1px solid rgba(93,255,160,0.35)' : `1px solid ${T.border}`,
        }}
      >
        <SegIcon icon={seg.key} color={on ? T.neon : T.muted} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: T.heading, letterSpacing: '-0.01em' }}>
          {seg.name}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: '10px', color: T.muted, marginTop: '2px', letterSpacing: '0.04em' }}>
          {seg.ct}
        </div>
      </div>
      <span
        style={{
          marginLeft: 'auto',
          fontFamily: T.display,
          fontWeight: 800,
          fontSize: '18px',
          letterSpacing: '-0.02em',
          color: on ? T.neon : T.faint,
          textShadow: on ? '0 0 16px rgba(93,255,160,0.5)' : 'none',
        }}
      >
        {seg.num}
      </span>
      <span
        style={{
          position: 'absolute',
          top: '9px',
          right: '11px',
          width: '15px',
          height: '15px',
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: on ? T.greenBright : 'transparent',
          border: on ? '1px solid ' + T.neon : '1px solid rgba(255,255,255,0.18)',
          boxShadow: on ? '0 0 12px rgba(45,209,106,0.7)' : 'none',
        }}
      >
        {on && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#04140a" strokeWidth="3.5" aria-hidden="true">
            <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </motion.div>
  )
}

function LeftCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.05 }}
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 18px 16px',
        minWidth: 0,
      }}
    >
      <CardHead title="Audience" label="Segments" />
      <p style={{ margin: '8px 0 4px', fontSize: '12px', color: T.muted, fontFamily: T.sans }}>
        Pick who Cutty talks to. Counts update live.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', padding: '8px 0 4px', flex: 1 }}>
        {SEGMENTS.map((seg, i) => (
          <SegmentChip key={seg.key} seg={seg} index={i} reduced={reduced} />
        ))}
      </div>

      {/* Cutty suggestion */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ ...SPRING, delay: reduced ? 0 : 0.55 }}
        style={{
          marginTop: '6px',
          padding: '13px 14px',
          borderRadius: '14px',
          background: 'linear-gradient(110deg,rgba(232,93,4,0.14),rgba(249,115,22,0.05))',
          border: '1px solid rgba(249,115,22,0.3)',
        }}
      >
        <Micro color={T.amber} style={{ letterSpacing: '0.18em', fontSize: '9px' }}>
          CUTTY SUGGESTS
        </Micro>
        <p style={{ margin: '5px 0 0', fontSize: '13.5px', color: T.body, lineHeight: 1.4, fontFamily: T.sans }}>
          Re-engage <b style={{ color: '#fdba74', fontWeight: 700 }}>142 lapsed clients</b> — they aerated last
          spring. Strike before April.
        </p>
      </motion.div>

      {/* selected reach */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${T.hair}`,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <Micro style={{ letterSpacing: '0.18em' }}>Selected reach</Micro>
        <span
          style={{
            fontFamily: T.display,
            fontWeight: 800,
            fontSize: '24px',
            color: T.heading,
            letterSpacing: '-0.03em',
          }}
        >
          <span style={{ color: T.greenBright }}>142</span> recipients
        </span>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* CENTER card — composer                                              */
/* ------------------------------------------------------------------ */

function DraftTool({ icon, label, green }: { icon: ReactNode; label: string; green?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: T.mono,
        fontSize: '9px',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: green ? T.greenBright : T.faint,
      }}
    >
      {icon}
      {label}
    </span>
  )
}

function CenterCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.12 }}
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 18px 18px',
        minWidth: 0,
      }}
    >
      {/* head: composer + cutty chip + channel tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <span
            style={{
              fontFamily: T.display,
              fontWeight: 800,
              fontSize: '14px',
              color: T.heading,
              letterSpacing: '-0.01em',
            }}
          >
            Composer
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '5px 11px 5px 7px',
              borderRadius: '999px',
              background: 'linear-gradient(180deg,rgba(93,255,160,0.16),rgba(5,168,69,0.06))',
              border: '1px solid rgba(93,255,160,0.35)',
              boxShadow: '0 0 18px rgba(5,168,69,0.25)',
            }}
          >
            <span
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: `radial-gradient(circle at 35% 30%, ${T.neon}, ${T.greenDeep})`,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#04140a" strokeWidth="2.6" aria-hidden="true">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <Micro color={T.neon} style={{ fontWeight: 700, letterSpacing: '0.12em' }}>
              Cutty wrote this
            </Micro>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['SMS', 'Email'] as const).map((tab) => {
            const on = tab === 'SMS'
            return (
              <span
                key={tab}
                style={{
                  fontFamily: T.mono,
                  fontSize: '9.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  padding: '6px 11px',
                  borderRadius: '9px',
                  color: on ? T.neon : T.faint,
                  border: on ? '1px solid rgba(93,255,160,0.3)' : '1px solid transparent',
                  background: on ? 'rgba(5,168,69,0.1)' : 'transparent',
                }}
              >
                {tab}
              </span>
            )
          })}
        </div>
      </div>

      {/* body: draft + phone */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(180px, 202px)',
          gap: '18px',
          padding: '14px 0 0',
          minHeight: 0,
        }}
      >
        {/* draft column */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9px',
                background: 'linear-gradient(150deg,#1f2937,#0b0f14)',
                border: `1px solid ${T.border}`,
                display: 'grid',
                placeItems: 'center',
                fontFamily: T.display,
                fontWeight: 800,
                fontSize: '12px',
                color: T.neon,
                flexShrink: 0,
              }}
            >
              YW
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', color: T.heading, fontWeight: 600 }}>{COMPOSER.who}</div>
              <div style={{ fontFamily: T.mono, fontSize: '9px', color: T.faint, letterSpacing: '0.06em', marginTop: '1px' }}>
                {COMPOSER.sub}
              </div>
            </div>
          </div>

          <div
            style={{
              fontFamily: T.mono,
              fontSize: '9px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: T.faint,
              marginBottom: '7px',
            }}
          >
            CAMPAIGN&nbsp;&nbsp;
            <b style={{ color: T.body, fontFamily: T.sans, textTransform: 'none', letterSpacing: 0, fontWeight: 600, fontSize: '13px' }}>
              {COMPOSER.campaign}
            </b>
          </div>

          {/* message box */}
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...SPRING, delay: reduced ? 0 : 0.3 }}
            style={{
              flex: 1,
              borderRadius: '16px',
              background: 'rgba(0,0,0,0.28)',
              border: `1px solid ${T.border}`,
              padding: '18px 19px',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '120px',
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
                background: `linear-gradient(180deg, ${T.neon}, ${T.greenDeep})`,
                boxShadow: '0 0 16px rgba(45,209,106,0.6)',
              }}
            />
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.62, color: '#e9eaec', fontWeight: 400, letterSpacing: '-0.005em', fontFamily: T.sans }}>
              Spring's here, <span style={{ color: T.neon, fontWeight: 600 }}>Sarah</span>{' '}
              <span style={{ display: 'inline-block', verticalAlign: '-2px' }}>
                <LeafGlyph size={16} full={false} />
              </span>{' '}
              Your lawn's due for aeration — book by <span style={{ color: T.neon, fontWeight: 600 }}>Apr 15</span> for{' '}
              <span style={{ color: T.amber, fontWeight: 600 }}>15% off</span>.
              <span style={{ display: 'block', marginTop: '12px', color: T.muted, fontSize: '13.5px' }}>— YardWorx</span>
            </p>
          </motion.div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px', flexWrap: 'wrap' }}>
            <DraftTool
              green
              label={COMPOSER.chars}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.greenBright} strokeWidth="1.8" aria-hidden="true">
                  <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z" strokeLinejoin="round" />
                </svg>
              }
            />
            <DraftTool
              label={COMPOSER.tone}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.8" aria-hidden="true">
                  <path d="M4 4h16v12H7l-3 3z" strokeLinejoin="round" />
                </svg>
              }
            />
            <DraftTool
              label={COMPOSER.send}
              icon={
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        </div>

        {/* phone preview */}
        <motion.div
          initial={reduced ? false : { opacity: 0, x: 16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ ...SPRING, delay: reduced ? 0 : 0.4 }}
          style={{
            borderRadius: '30px',
            padding: '11px',
            position: 'relative',
            background: 'linear-gradient(160deg,#141417,#0a0a0c)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
            alignSelf: 'stretch',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '11px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '62px',
              height: '16px',
              borderRadius: '9px',
              background: '#000',
              zIndex: 3,
            }}
          />
          <div
            style={{
              borderRadius: '22px',
              background:
                'radial-gradient(120% 80% at 50% 0%, rgba(5,168,69,0.10), transparent 55%), linear-gradient(180deg,#0c0c0f,#080809)',
              height: '100%',
              minHeight: '270px',
              padding: '30px 12px 14px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '11px',
                  margin: '0 auto 6px',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'radial-gradient(120% 120% at 30% 20%, rgba(93,255,160,0.4), rgba(5,168,69,0.12))',
                  border: '1px solid rgba(93,255,160,0.3)',
                }}
              >
                <LeafGlyph size={18} />
              </span>
              <div style={{ fontSize: '12px', fontWeight: 600, color: T.heading }}>{COMPOSER.phoneName}</div>
              <div style={{ fontFamily: T.mono, fontSize: '8.5px', color: T.faint, letterSpacing: '0.08em', marginTop: '1px' }}>
                {COMPOSER.phoneNum}
              </div>
            </div>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ ...SPRING, delay: reduced ? 0 : 0.6 }}
              style={{
                background: 'linear-gradient(180deg,#1e2a20,#15201a)',
                border: '1px solid rgba(45,209,106,0.22)',
                borderRadius: '16px 16px 16px 5px',
                padding: '11px 12px',
                fontSize: '11.5px',
                lineHeight: 1.5,
                color: '#e2e8e4',
                boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                fontFamily: T.sans,
              }}
            >
              Spring's here, <span style={{ color: T.neon, fontWeight: 600 }}>Sarah</span> 🌱 Your lawn's due for
              aeration — book by <span style={{ color: T.neon, fontWeight: 600 }}>Apr 15</span> for{' '}
              <span style={{ color: '#fdba74', fontWeight: 600 }}>15% off</span>. — YardWorx
            </motion.div>
            <div style={{ fontFamily: T.mono, fontSize: '8px', color: T.faint, margin: '5px 0 0 4px', letterSpacing: '0.08em' }}>
              {COMPOSER.phoneTime}
            </div>
          </div>
        </motion.div>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', flexWrap: 'wrap' }}>
        <SendButton reduced={reduced} />
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 20px',
            borderRadius: '14px',
            fontSize: '13.5px',
            fontWeight: 600,
            color: T.body,
            background: T.card2,
            border: `1px solid ${T.border}`,
            fontFamily: T.sans,
            cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.body} strokeWidth="1.8" aria-hidden="true">
            <path d="M3 12a9 9 0 0115-6.7L21 8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12a9 9 0 01-15 6.7L3 16" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Regenerate
        </span>
      </div>
    </motion.div>
  )
}

function SendButton({ reduced }: { reduced: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={reduced ? undefined : { scale: hovered ? 1.02 : 1 }}
      transition={SPRING}
      style={{
        flex: 1,
        minWidth: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '9px',
        padding: '14px',
        borderRadius: '14px',
        fontFamily: T.display,
        fontWeight: 800,
        fontSize: '14.5px',
        color: '#04140a',
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${T.neon}, ${T.green})`,
        border: '1px solid rgba(93,255,160,0.6)',
        filter: hovered ? 'brightness(1.06)' : 'none',
        boxShadow: '0 0 34px rgba(5,168,69,0.5), inset 0 1px 0 rgba(255,255,255,0.45)',
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#04140a" strokeWidth="2" aria-hidden="true">
        <path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z" strokeLinejoin="round" />
        <path d="M10 13.5L21 3" />
      </svg>
      Send to 142
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* RIGHT card — performance                                            */
/* ------------------------------------------------------------------ */

function RecoveredCountUp({ reduced }: { reduced: boolean }) {
  const [display, setDisplay] = useState(reduced ? '$8,400' : '$0')
  const ref = useRef<HTMLDivElement | null>(null)
  const target = 8400

  useEffect(() => {
    if (reduced) {
      setDisplay('$8,400')
      return
    }
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setDisplay('$8,400')
      return
    }
    let raf = 0
    let started = false
    const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry || !entry.isIntersecting || started) return
        started = true
        observer.disconnect()
        const duration = 800
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setDisplay(fmt(target * eased))
          if (p < 1) raf = requestAnimationFrame(tick)
          else setDisplay('$8,400')
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
  }, [reduced])

  return (
    <div
      ref={ref}
      style={{
        fontFamily: T.display,
        fontWeight: 800,
        fontSize: '34px',
        color: T.heading,
        letterSpacing: '-0.03em',
        marginTop: '3px',
      }}
    >
      <span style={{ color: T.neon, textShadow: '0 0 24px rgba(93,255,160,0.4)' }}>{display}</span>
    </div>
  )
}

function CampaignRow({ c, index, reduced }: { c: Campaign; index: number; reduced: boolean }) {
  const isSms = c.kind === 'sms'
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.35 + index * 0.08 }}
      style={{
        padding: '12px 13px',
        borderRadius: '14px',
        background: T.card2,
        border: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: T.heading, letterSpacing: '-0.01em' }}>
          {c.name}
        </span>
        <span
          style={{
            fontFamily: T.mono,
            fontSize: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '2px 6px',
            borderRadius: '6px',
            color: isSms ? T.sky : T.violet,
            background: isSms ? 'rgba(56,189,248,0.12)' : 'rgba(167,139,250,0.12)',
            border: isSms ? '1px solid rgba(56,189,248,0.25)' : '1px solid rgba(167,139,250,0.25)',
          }}
        >
          {isSms ? 'SMS' : 'Email'}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: T.display,
            fontWeight: 800,
            fontSize: '15px',
            color: T.amber,
            letterSpacing: '-0.02em',
          }}
        >
          {c.rev}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginTop: '9px' }}>
        <Stat value={c.open} label="Open" />
        <Stat value={c.booked} label="Booked" green />
        <Stat value={c.sent} label="Sent" />
      </div>

      <div
        style={{
          height: '3px',
          borderRadius: '2px',
          background: 'rgba(255,255,255,0.06)',
          marginTop: '8px',
          overflow: 'hidden',
        }}
      >
        <motion.span
          initial={reduced ? false : { width: '0%' }}
          whileInView={{ width: `${c.meter}%` }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0 : 0.8, ease: 'easeOut', delay: reduced ? 0 : 0.45 + index * 0.08 }}
          style={{
            display: 'block',
            height: '100%',
            width: `${c.meter}%`,
            borderRadius: '2px',
            background: `linear-gradient(90deg, ${T.green}, ${T.neon})`,
            boxShadow: '0 0 8px rgba(45,209,106,0.5)',
          }}
        />
      </div>
    </motion.div>
  )
}

function Stat({ value, label, green }: { value: string; label: string; green?: boolean }) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontFamily: T.display,
          fontWeight: 800,
          fontSize: '14px',
          letterSpacing: '-0.02em',
          color: green ? T.greenBright : T.heading,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: T.mono,
          fontSize: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: T.faint,
          marginTop: '1px',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function RightCard({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.2 }}
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 18px 16px',
        minWidth: 0,
      }}
    >
      <CardHead title="Performance" label="Last 90 days" />

      {/* recovered revenue hero */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ ...SPRING, delay: reduced ? 0 : 0.28 }}
        style={{
          marginTop: '8px',
          padding: '14px 15px',
          borderRadius: '16px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(120deg,rgba(5,168,69,0.16),rgba(5,168,69,0.03))',
          border: '1px solid rgba(45,209,106,0.32)',
        }}
      >
        <Micro color={T.greenBright} style={{ letterSpacing: '0.18em', fontSize: '9px' }}>
          WIN-BACK REVENUE
        </Micro>
        <RecoveredCountUp reduced={reduced} />
        <div style={{ fontSize: '11.5px', color: T.muted, marginTop: '2px', fontFamily: T.sans }}>
          <b style={{ color: T.greenBright }}>recovered</b> from 7 campaigns
        </div>

        {/* bars */}
        <div
          style={{
            position: 'absolute',
            right: '14px',
            top: '14px',
            bottom: '14px',
            width: '118px',
            maxWidth: '40%',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '6px',
          }}
        >
          {BAR_HEIGHTS.map((h, i) => (
            <motion.span
              key={i}
              initial={reduced ? false : { height: '0%' }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ ...SPRING, delay: reduced ? 0 : 0.4 + i * 0.06 }}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: '4px 4px 2px 2px',
                background: `linear-gradient(180deg, ${T.neon}, ${T.greenDeep})`,
                boxShadow: '0 0 10px rgba(45,209,106,0.35)',
                opacity: 0.92,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* recent campaigns */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', paddingTop: '12px', flex: 1 }}>
        <Micro style={{ letterSpacing: '0.18em', fontSize: '9px', padding: '0 2px 2px' }}>
          Recent campaigns
        </Micro>
        {CAMPAIGNS.map((c, i) => (
          <CampaignRow key={c.name} c={c} index={i} reduced={reduced} />
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export default function Campaigns() {
  const reduced = useReducedMotion()

  return (
    <section
      aria-labelledby="campaigns-heading"
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        padding: 'clamp(56px, 8vw, 96px) 24px',
        boxSizing: 'border-box',
      }}
    >
      <GlowField />

      <div style={{ position: 'relative', zIndex: 15, maxWidth: '1380px', margin: '0 auto' }}>
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
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
              <Micro color={T.greenBright}>MARKETING · WIN-BACK ENGINE</Micro>
            </span>
            <h2
              id="campaigns-heading"
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
              <span
                style={{
                  backgroundImage: `linear-gradient(120deg, ${T.neon}, ${T.greenBright})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 0 18px rgba(93,255,160,0.35))',
                }}
              >
                Campaigns
              </span>
              .
            </h2>
            <p
              style={{
                margin: '11px 0 0',
                fontFamily: T.sans,
                fontSize: 'clamp(14px, 2.5vw, 15px)',
                color: T.muted,
                fontWeight: 400,
                lineHeight: 1.5,
              }}
            >
              <b style={{ color: T.greenBright, fontWeight: 600 }}>Cutty</b> writes it. You hit send.
            </p>
          </div>

          {/* header stat pills */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {HEAD_STATS.map((s) => (
              <div
                key={s.l}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 14px',
                  borderRadius: '13px',
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: T.display,
                      fontWeight: 800,
                      fontSize: '16px',
                      letterSpacing: '-0.02em',
                      color: s.money ? T.amber : T.heading,
                    }}
                  >
                    {s.v}
                  </div>
                  <div
                    style={{
                      fontFamily: T.mono,
                      fontSize: '8.5px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.16em',
                      color: T.faint,
                    }}
                  >
                    {s.l}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* three-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 330px) minmax(0, 1.05fr) minmax(0, 372px)',
            gap: '20px',
            alignItems: 'stretch',
          }}
          className="campaigns-grid"
        >
          <LeftCard reduced={reduced} />
          <CenterCard reduced={reduced} />
          <RightCard reduced={reduced} />
        </div>
      </div>

      {/* responsive reflow — scoped to this section */}
      <style>{`
        @media (max-width: 980px) {
          .campaigns-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }
          .campaigns-grid > :nth-child(2) {
            grid-column: 1 / -1;
            order: -1;
          }
        }
        @media (max-width: 640px) {
          .campaigns-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .campaigns-grid > :nth-child(2) {
            order: 0;
          }
        }
      `}</style>

      <GrainVignette />
    </section>
  )
}
