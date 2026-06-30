import React, { useEffect, useState } from "react";

const stats = [
  { number: "2,300+", label: "Crews Active" },
  { number: "$14M+", label: "Invoiced" },
  { number: "4.9 ★", label: "App Store Rating", sub: "iOS · Android" },
  { number: "48", label: "States" },
];

const testimonials = [
  {
    quote:
      "Before YardWorx I was doing quotes on paper. Now Cutty scans the yard and I've got a price before I'm back at the truck. Closed 3 new accounts my first week.",
    name: "Marcus Thompson",
    company: "Green Edge LLC",
    location: "Atlanta GA",
  },
  {
    quote:
      "The auto-invoicing alone changed everything. I used to chase payments for weeks. Last month I collected $28k without sending a single text.",
    name: "Jasmine Reyes",
    company: "Sunrise Grounds",
    location: "Dallas TX",
  },
  {
    quote:
      "I gave my crew the app on Tuesday. By Friday they were doing their own routing. I got 60 hours back — no more dispatching.",
    name: "Derek Wallace",
    company: "Wallace & Sons Landscaping",
    location: "Tampa FL",
  },
];

const integrations = ["Stripe", "QuickBooks", "Twilio", "Google"];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// SSR/render-safe responsive flag. Defaults to desktop layout so the component
// renders correctly even when reused outside a browser (e.g. ReducedScene).
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export function SocialProof() {
  const isMobile = useIsMobile();

  return (
    <section
      aria-labelledby="social-proof-heading"
      style={{
        background: "#09090b",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        {/* Stats */}
        <div
          style={{
            padding: "56px 0 24px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={
              isMobile
                ? {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "24px 16px",
                  }
                : {
                    display: "flex",
                    alignItems: "stretch",
                  }
            }
          >
            {stats.map((stat, i) => (
              <React.Fragment key={stat.label}>
                {!isMobile && i > 0 && (
                  <div
                    style={{
                      width: "1px",
                      background: "rgba(255,255,255,0.05)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    flex: isMobile ? undefined : 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                    padding: isMobile ? 0 : "0 16px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 800,
                      fontSize: isMobile
                        ? "clamp(28px, 9vw, 40px)"
                        : "clamp(36px, 5vw, 56px)",
                      color: "#ffffff",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stat.number}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 400,
                      fontSize: "9px",
                      color: "#71717a",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                      textAlign: "center",
                    }}
                  >
                    {stat.label}
                  </span>
                  {stat.sub && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 400,
                        fontSize: "8px",
                        color: "#52525b",
                        textTransform: "uppercase",
                        letterSpacing: "0.18em",
                        textAlign: "center",
                        marginTop: "-4px",
                      }}
                    >
                      {stat.sub}
                    </span>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 400,
              fontSize: "9px",
              color: "#52525b",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              textAlign: "center",
              margin: "24px 0 0 0",
            }}
          >
            Platform metrics, Q2 2026
          </p>
        </div>

        {/* Integrations trust strip */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "16px 28px",
            padding: "28px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 400,
              fontSize: "9px",
              color: "#71717a",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
            }}
          >
            Integrates with
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "12px 28px",
            }}
          >
            {integrations.map((name) => (
              <span
                key={name}
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  fontSize: "16px",
                  color: "#ffffff",
                  opacity: 0.4,
                  letterSpacing: "-0.01em",
                  transition: "opacity 0.2s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.4";
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Testimonials header */}
        <div style={{ padding: "56px 0 40px" }}>
          <h2
            id="social-proof-heading"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: "28px",
              color: "#ffffff",
              margin: "0 0 10px 0",
              lineHeight: 1.2,
            }}
          >
            What crews are saying
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "14px",
              color: "#9a9aa2",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Owner-operators who switched and never went back — and the numbers to
            prove it.
          </p>
        </div>

        {/* Testimonial cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            paddingBottom: "0",
          }}
        >
          {testimonials.map((t) => (
            <div
              key={t.name}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "20px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Star rating */}
              <div
                aria-label="Rated 5 out of 5 stars"
                style={{
                  display: "flex",
                  gap: "2px",
                  fontSize: "12px",
                  color: "#2ad16a",
                  lineHeight: 1,
                }}
              >
                <span aria-hidden="true">★★★★★</span>
              </div>

              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "16px",
                  color: "#d4d4d8",
                  lineHeight: 1.75,
                  margin: 0,
                  flex: 1,
                }}
              >
                {t.quote}
              </p>

              {/* Author */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: "44px",
                    height: "44px",
                    flexShrink: 0,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #05A845 0%, #2ad16a 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "#ffffff",
                    letterSpacing: "0.02em",
                  }}
                >
                  {initialsOf(t.name)}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "#ffffff",
                        lineHeight: 1.3,
                      }}
                    >
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 400,
                        fontSize: "9px",
                        color: "#2ad16a",
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        border: "1px solid rgba(42,209,106,0.4)",
                        borderRadius: "999px",
                        padding: "2px 7px",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Verified
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 400,
                      fontSize: "13px",
                      color: "#9a9aa2",
                      lineHeight: 1.4,
                    }}
                  >
                    {t.company} · {t.location}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
