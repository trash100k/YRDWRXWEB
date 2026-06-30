import React from "react";

const stats = [
  { number: "2,300+", label: "Crews Active" },
  { number: "$14M+", label: "Invoiced" },
  { number: "4.9 ★", label: "App Rating" },
  { number: "48", label: "States" },
];

const testimonials = [
  {
    quote:
      "Before YardWorx I was doing quotes on paper. Now Cutty scans the yard and I've got a price before I'm back at the truck. Closed 3 new accounts my first week.",
    name: "Marcus T.",
    company: "Green Edge LLC",
    location: "Atlanta GA",
  },
  {
    quote:
      "The auto-invoicing alone changed everything. I used to chase payments for weeks. Last month I collected $28k without sending a single text.",
    name: "Jasmine R.",
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

export function SocialProof() {
  return (
    <div
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
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            padding: "56px 0",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {stats.map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && (
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
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  padding: "0 16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(36px, 5vw, 56px)",
                    color: "#ffffff",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.number}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 400,
                    fontSize: "9px",
                    color: "#52525b",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                  }}
                >
                  {stat.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div style={{ padding: "56px 0 40px" }}>
          <h2
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
              color: "#71717a",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            From landscapers who were skeptical before their first Tuesday.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
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
                gap: "20px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 800,
                  fontSize: "48px",
                  color: "#2ad16a",
                  opacity: 0.4,
                  lineHeight: 1,
                  display: "block",
                  marginBottom: "-8px",
                }}
              >
                &ldquo;
              </span>
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
              <div
                style={{
                  borderLeft: "2px solid rgba(5,168,69,0.3)",
                  paddingLeft: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
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
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontSize: "13px",
                    color: "#71717a",
                    lineHeight: 1.4,
                  }}
                >
                  {t.company} · {t.location}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
