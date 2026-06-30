import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface NavProps {
  beatIndex: number
}

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

// Lazy-init from the media query so the first paint is already correct (no flash/overflow).
function useIsMobile(maxWidth = 768) {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(max-width:${maxWidth}px)`).matches
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width:${maxWidth}px)`)
    const onChange = () => setMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [maxWidth])
  return mobile
}

function Logo() {
  return (
    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="4" stroke="#05A845" strokeWidth="1.5" />
        <path d="M2 6 L2 2 L6 2" stroke="#05A845" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2 L18 2 L18 6" stroke="#05A845" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 14 L2 18 L6 18" stroke="#05A845" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 18 L18 18 L18 14" stroke="#05A845" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, letterSpacing: '0.05em', color: '#ffffff', fontSize: '15px' }}>
        YARDWORX
      </span>
    </a>
  )
}

const ctaStyle: React.CSSProperties = {
  background: '#05A845', color: '#000000', fontFamily: 'Outfit, sans-serif', fontWeight: 700,
  fontSize: '14px', borderRadius: '12px', padding: '8px 16px', textDecoration: 'none',
  display: 'inline-block', lineHeight: 1, whiteSpace: 'nowrap',
}
const linkStyle: React.CSSProperties = {
  color: '#a1a1aa', fontFamily: 'Inter, sans-serif', fontSize: '14px', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
}

export function Nav({ beatIndex }: NavProps) {
  const navOpacity = beatIndex < 5 ? 0.7 : 1.0
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  // Close the menu if we resize back to desktop.
  useEffect(() => { if (!isMobile) setOpen(false) }, [isMobile])

  return (
    <motion.nav
      className="glass-nav"
      animate={{ opacity: open ? 1 : navOpacity }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '60px', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 5vw, 24px)', boxSizing: 'border-box',
      }}
    >
      <Logo />

      {!isMobile ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} style={linkStyle}>{link.label}</a>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="#start" style={linkStyle}>Sign in</a>
            <a href="#start" style={ctaStyle}>Start free →</a>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="#start" style={{ ...ctaStyle, padding: '7px 13px' }}>Start free</a>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px',
              width: '34px', height: '34px', padding: '8px', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.14)', borderRadius: '9px', cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', height: '1.5px', background: '#fff', borderRadius: '2px', transition: 'transform .2s', transform: open ? 'translateY(5.5px) rotate(45deg)' : 'none' }} />
            <span style={{ display: 'block', height: '1.5px', background: '#fff', borderRadius: '2px', opacity: open ? 0 : 1, transition: 'opacity .2s' }} />
            <span style={{ display: 'block', height: '1.5px', background: '#fff', borderRadius: '2px', transition: 'transform .2s', transform: open ? 'translateY(-5.5px) rotate(-45deg)' : 'none' }} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {isMobile && open && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{
              position: 'absolute', top: '60px', left: 0, width: '100%',
              background: 'rgba(9,9,11,0.96)', backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column', padding: '8px 0', boxSizing: 'border-box',
            }}
          >
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{ ...linkStyle, fontSize: '16px', padding: '14px clamp(16px, 5vw, 24px)' }}
              >
                {link.label}
              </a>
            ))}
            <a
              href="#start"
              onClick={() => setOpen(false)}
              style={{ ...linkStyle, fontSize: '16px', padding: '14px clamp(16px, 5vw, 24px)' }}
            >
              Sign in
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
