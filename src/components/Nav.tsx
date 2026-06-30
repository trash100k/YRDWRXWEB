import { motion } from 'motion/react'

interface NavProps {
  beatIndex: number
}

export function Nav({ beatIndex }: NavProps) {
  const navOpacity = beatIndex < 5 ? 0.7 : 1.0

  return (
    <motion.nav
      className="glass-nav"
      animate={{ opacity: navOpacity }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '60px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box',
      }}
    >
      {/* Left: Logo + Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Reticle SVG logo */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          focusable="false"
        >
          {/* Center circle */}
          <circle cx="10" cy="10" r="4" stroke="#05A845" strokeWidth="1.5" />
          {/* Top-left bracket */}
          <path d="M2 6 L2 2 L6 2" stroke="#05A845" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Top-right bracket */}
          <path d="M14 2 L18 2 L18 6" stroke="#05A845" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Bottom-left bracket */}
          <path d="M2 14 L2 18 L6 18" stroke="#05A845" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Bottom-right bracket */}
          <path d="M14 18 L18 18 L18 14" stroke="#05A845" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <span
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#ffffff',
            fontSize: '15px',
          }}
        >
          YARDWORX
        </span>
      </div>

      {/* Center: Section links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        {[
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'FAQ', href: '#faq' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              color: '#a1a1aa',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Right: Sign in + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a
          href="#start"
          style={{
            color: '#a1a1aa',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            textDecoration: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Sign in
        </a>
        <a
          href="#start"
          style={{
            background: '#05A845',
            color: '#000000',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            borderRadius: '12px',
            padding: '8px 16px',
            textDecoration: 'none',
            display: 'inline-block',
            lineHeight: 1,
          }}
        >
          Start free →
        </a>
      </div>
    </motion.nav>
  )
}
