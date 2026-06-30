export default function ReducedScene() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0C10',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: "'Inter', sans-serif",
    }}>
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
          { label: 'AI SCAN', title: 'AI that actually sees the yard.', body: 'Cutty identifies every issue. Estimates time. Adds to Thursday.' },
          { label: 'JOB CARD', title: 'Quote built in seconds.', body: 'Hedge trim · Aerate · Edge · Mulch — $365 + tax. Done.' },
          { label: 'ROUTE', title: 'Three jobs. One street.', body: "Johnson + 2 neighbors on Oak St. Route built automatically." },
          { label: 'INVOICE', title: 'Paid before you left.', body: 'Invoice #1042 — $365.00 — Payment received.' },
          { label: 'CREW', title: 'Your crew has the route.', body: 'Marcus and Dani are en route. No training needed.' },
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
    </div>
  )
}
