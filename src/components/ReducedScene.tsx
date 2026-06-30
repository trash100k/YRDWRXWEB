import { SocialProof } from '@/components/SocialProof'
import HowItWorks from '@/components/HowItWorks'
import { Pricing } from '@/components/Pricing'
import FAQ from '@/components/FAQ'

export default function ReducedScene() {
  return (
    <main style={{ background: '#0B0C10', minHeight: '100vh' }}>
      {/* `--dvh` fallback: 100vh first, then 100dvh where supported (avoids iOS URL-bar jump) */}
      <style>{`
        .reduced-hero { min-height: 100vh; min-height: 100dvh; }
      `}</style>

      {/* Hero */}
      <section
        className="reduced-hero"
        style={{
          background: '#0B0C10',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          color: '#2ad16a',
          marginBottom: '16px',
        }}>
          AI YARD OS FOR LANDSCAPERS
        </div>

        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(32px, 6vw, 64px)',
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          marginBottom: '16px',
          lineHeight: 1.1,
        }}>
          This is your Tuesday.
        </h1>
        <p style={{ color: '#a1a1aa', fontSize: '18px', textAlign: 'center', maxWidth: '520px', marginBottom: '64px' }}>
          YardWorx sees every yard. Schedules every job. Collects every dollar.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          width: '100%',
          maxWidth: '860px',
          marginBottom: '64px',
        }}>
          {[
            { label: 'THE FORGE', title: 'Drop a photo. Get a quote.', body: 'Cutty forges a priced, designed estimate — #YW-2048, $395.11.' },
            { label: 'LIVE EAR', title: 'Talk. It logs the job.', body: '"Trimmed the hedges, upsold mulch." Voice note → timesheet + $120 add-on, hands-free.' },
            { label: 'SCHEDULER', title: 'One street. One route.', body: '7 stops sequenced automatically. Drive time down, jobs up.' },
            { label: 'CHANNELS', title: 'Cutty drafts the reply.', body: 'Suggested message: $365, Thu 9:00 AM. You just tap Send.' },
            { label: 'COCKPIT', title: 'Your whole operation, one screen.', body: 'Revenue, jobs, crews and a live map — every number in real time.' },
            { label: 'FIELD MODE', title: "Your crew's whole day. One thumb.", body: 'Job card, Live Ear voice notes, photos and clock-out — offline-ready.' },
            { label: 'PAID', title: 'Paid before you park the truck.', body: 'Invoice #1042 — $365.00 — marked PAID. Money in the bank.' },
            { label: 'REVIEWS', title: 'Five stars, on autopilot.', body: 'Job done → review request fires. 4.9★ across 312 reviews, +27 this month.' },
            { label: 'ANALYTICS', title: 'Know your margin by Friday.', body: 'Revenue $48,210 MTD · 62% gross margin · top route nets $1,140/day.' },
            { label: 'CLIENT PORTAL', title: 'Clients self-serve, you sleep.', body: 'Johnson Property views the quote, e-signs, and pays — 24/7, no phone tag.' },
            { label: 'ONBOARDING', title: 'Import your book in minutes.', body: 'Upload a CSV — 184 customers, 56 recurring jobs mapped and ready to schedule.' },
            { label: 'CAMPAIGNS', title: 'Fill the gaps in your week.', body: 'One tap texts 38 lapsed clients a spring cleanup offer — 9 booked by noon.' },
          ].map(step => (
            <div key={step.label} style={{
              background: 'rgba(9,9,11,0.85)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              padding: '20px',
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: '#2ad16a',
                marginBottom: '8px',
              }}>
                {step.label}
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {step.title}
              </div>
              <div style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.5 }}>
                {step.body}
              </div>
            </div>
          ))}
        </div>

        <a
          href="#start"
          style={{
            display: 'inline-block',
            background: '#05A845',
            color: '#000',
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: '18px',
            padding: '16px 40px',
            borderRadius: '12px',
            textDecoration: 'none',
            boxShadow: '0 0 32px rgba(5,168,69,0.4)',
          }}
        >
          Start free for 30 days →
        </a>
        <p style={{ color: 'rgba(161,161,170,0.6)', fontSize: '13px', marginTop: '12px' }}>
          No credit card. No setup call.
        </p>
      </section>

      {/* Below-fold sections — parity with the cinematic page (App.tsx) */}
      <div style={{ position: 'relative', zIndex: 20, background: '#09090b' }}>
        {/* Stats + testimonials */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0 24px' }}>
          <SocialProof />
        </div>

        {/* How it works */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <HowItWorks />
        </div>

        {/* Pricing — real #start target for the hero signup CTA */}
        <div id="start" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Pricing />
        </div>

        {/* FAQ */}
        <div id="faq" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <FAQ />
        </div>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '32px 24px',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
          fontSize: '13px',
          color: '#52525b',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: '#71717a', letterSpacing: '0.05em' }}>
              YARDWORX
            </span>
            <span style={{ margin: '0 16px', opacity: 0.3 }}>·</span>
            <a href="/privacy" style={{ color: '#52525b', textDecoration: 'none' }}>Privacy</a>
            <span style={{ margin: '0 12px', opacity: 0.3 }}>·</span>
            <a href="/terms" style={{ color: '#52525b', textDecoration: 'none' }}>Terms</a>
          </div>
          <div>© 2026 YardWorx. Built for landscapers.</div>
        </footer>
      </div>
    </main>
  )
}
