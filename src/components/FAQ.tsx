import React, { useState } from "react";

interface QA {
  q: string;
  a: string;
}

const faqs: QA[] = [
  {
    q: "Do I need a contract?",
    a: "No. There's no contract, no setup call, and no lock-in. You're billed month to month and you can cancel anytime — your data stays yours when you go.",
  },
  {
    q: "What if my crew won't use it?",
    a: "There's nothing to learn. You drop the app on their phones and they open it to today's route — Marcus and Dani are en route with zero training. No dispatching, no manuals, no \"how do I log in\" texts. Crews are routing themselves by their first Tuesday.",
  },
  {
    q: "How does the AI yard scan work?",
    a: "Cutty, our AI, reads a property the way an estimator would. You point your phone at the yard and it measures the lawn, flags the obstacles, and hands you a priced quote before you're back at the truck — so you're closing accounts on the spot instead of doing math on paper.",
  },
  {
    q: "Does it work offline in the field?",
    a: "Yes. Offline mode is included on every plan (it's in the Pricing fine print for a reason). The app keeps working with no signal at the back of a property, then syncs jobs, photos, and invoices the moment you're back on the network.",
  },
  {
    q: "How fast do I get paid?",
    a: "Often before you've left the driveway. The moment a job is marked done, YardWorx auto-invoices the customer and texts them an SMS pay link — one tap to pay. Crews are collecting tens of thousands a month without chasing a single payment.",
  },
  {
    q: "Is there really a free plan?",
    a: "Yes — the $0 Starter plan is free forever, no credit card required. It covers one crew member, ten jobs a month, the mobile app, the scheduler, and your customer database. Upgrade to Pro the day you outgrow it, not before.",
  },
  {
    q: "Who owns my customer data?",
    a: "You do. Always. Your customers, jobs, and history belong to you — we never sell it or share it. Export it whenever you like, and if you ever leave, you take all of it with you.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  const sectionStyle: React.CSSProperties = {
    background: "#09090b",
    width: "100%",
    padding: "80px 24px",
    boxSizing: "border-box",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: "1100px",
    margin: "0 auto",
  };

  const headingBlockStyle: React.CSSProperties = {
    textAlign: "center",
    paddingBottom: "56px",
  };

  const labelChipStyle: React.CSSProperties = {
    display: "inline-block",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: 400,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#2ad16a",
    marginBottom: "16px",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 800,
    fontSize: "clamp(28px, 4vw, 40px)",
    color: "#ffffff",
    margin: "0 0 12px 0",
    lineHeight: 1.15,
  };

  const subHeadingStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    color: "#71717a",
    margin: 0,
  };

  const listStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const finePrintStyle: React.CSSProperties = {
    textAlign: "center",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    color: "#52525b",
    marginTop: "40px",
  };

  return (
    <section style={sectionStyle}>
      <div style={innerStyle}>
        <div style={headingBlockStyle}>
          <div style={labelChipStyle}>FAQ</div>
          <h2 style={headingStyle}>Questions, answered straight.</h2>
          <p style={subHeadingStyle}>
            No fine-print games. Here's exactly how it works.
          </p>
        </div>

        <div style={listStyle}>
          {faqs.map((item, i) => {
            const isOpen = open === i;

            const cardStyle: React.CSSProperties = {
              background: isOpen
                ? "rgba(5,168,69,0.04)"
                : "rgba(255,255,255,0.02)",
              border: isOpen
                ? "1px solid rgba(5,168,69,0.35)"
                : "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              boxSizing: "border-box",
              overflow: "hidden",
              transition: "border-color 0.2s ease, background 0.2s ease",
            };

            const buttonStyle: React.CSSProperties = {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "20px",
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              padding: "24px 28px",
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(16px, 2vw, 18px)",
              color: "#ffffff",
              lineHeight: 1.3,
            };

            const iconStyle: React.CSSProperties = {
              flexShrink: 0,
              width: "22px",
              height: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isOpen ? "#2ad16a" : "#71717a",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 400,
              fontSize: "22px",
              lineHeight: 1,
              transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 0.25s ease, color 0.2s ease",
            };

            const answerWrapStyle: React.CSSProperties = {
              display: "grid",
              gridTemplateRows: isOpen ? "1fr" : "0fr",
              transition: "grid-template-rows 0.28s ease",
            };

            const answerInnerStyle: React.CSSProperties = {
              overflow: "hidden",
            };

            const answerStyle: React.CSSProperties = {
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "15px",
              color: "#a1a1aa",
              lineHeight: 1.75,
              margin: 0,
              padding: "0 28px 26px 28px",
            };

            return (
              <div key={item.q} style={cardStyle}>
                <button
                  type="button"
                  style={buttonStyle}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = "2px solid #05A845";
                    e.currentTarget.style.outlineOffset = "-2px";
                    e.currentTarget.style.borderRadius = "16px";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = "none";
                  }}
                >
                  <span>{item.q}</span>
                  <span style={iconStyle} aria-hidden="true">
                    +
                  </span>
                </button>
                <div style={answerWrapStyle}>
                  <div style={answerInnerStyle}>
                    <p id={`faq-answer-${i}`} role="region" style={answerStyle}>
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p style={finePrintStyle}>
          Still wondering something? Talk to a real human — no bots, no queue.
        </p>
      </div>
    </section>
  );
}

export default FAQ;
