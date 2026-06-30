import React, { useState } from "react";

export function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const annual = billing === "annual";

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
    paddingBottom: "40px",
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
    color: "#9a9aa2",
    margin: 0,
  };

  const toggleWrapStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px",
    paddingBottom: "48px",
  };

  const pillTrackStyle: React.CSSProperties = {
    display: "inline-flex",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "999px",
    padding: "4px",
    gap: "4px",
  };

  const pillBtnBaseStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    fontWeight: 400,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    border: "none",
    borderRadius: "999px",
    padding: "8px 18px",
    cursor: "pointer",
    transition: "background 0.2s ease, color 0.2s ease",
  };

  const pillActiveStyle: React.CSSProperties = {
    ...pillBtnBaseStyle,
    background: "#05A845",
    color: "#000000",
  };

  const pillInactiveStyle: React.CSSProperties = {
    ...pillBtnBaseStyle,
    background: "transparent",
    color: "#9a9aa2",
  };

  const saveChipStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    fontWeight: 400,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#2ad16a",
    background: "rgba(5,168,69,0.15)",
    borderRadius: "6px",
    padding: "4px 9px",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
  };

  const baseCardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "20px",
    padding: "32px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  };

  const proCardStyle: React.CSSProperties = {
    ...baseCardStyle,
    background: "rgba(5,168,69,0.04)",
    border: "1px solid rgba(5,168,69,0.35)",
    boxShadow: "0 0 0 1px rgba(5,168,69,0.15), 0 24px 48px rgba(0,0,0,0.4)",
  };

  const tierChipBaseStyle: React.CSSProperties = {
    display: "inline-block",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "9px",
    fontWeight: 400,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    borderRadius: "6px",
    padding: "4px 10px",
    marginBottom: "12px",
  };

  const starterChipStyle: React.CSSProperties = {
    ...tierChipBaseStyle,
    color: "#9a9aa2",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  const proChipStyle: React.CSSProperties = {
    ...tierChipBaseStyle,
    color: "#2ad16a",
    background: "rgba(5,168,69,0.15)",
    border: "none",
  };

  const enterpriseChipStyle: React.CSSProperties = {
    ...tierChipBaseStyle,
    color: "#9a9aa2",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  const tierBlurbStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "13.5px",
    color: "#9a9aa2",
    margin: "0 0 20px 0",
    lineHeight: 1.4,
  };

  const mostPopularChipStyle: React.CSSProperties = {
    display: "inline-block",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "9px",
    fontWeight: 400,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#2ad16a",
    background: "rgba(5,168,69,0.15)",
    borderRadius: "6px",
    padding: "4px 10px",
    marginBottom: "8px",
  };

  const priceRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
    marginBottom: "4px",
  };

  const priceStyle: React.CSSProperties = {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 800,
    fontSize: "48px",
    color: "#ffffff",
    lineHeight: 1,
  };

  const priceSuffixStyle: React.CSSProperties = {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 400,
    fontSize: "16px",
    color: "#9a9aa2",
  };

  const customPriceStyle: React.CSSProperties = {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 800,
    fontSize: "36px",
    color: "#ffffff",
    lineHeight: 1,
    marginBottom: "4px",
  };

  const subPriceStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    color: "#9a9aa2",
    marginBottom: "0",
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    margin: "20px 0",
  };

  const featuresListStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: "0 0 auto 0",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };

  const featureItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    color: "#d4d4d8",
  };

  const checkStyle: React.CSSProperties = {
    color: "#2ad16a",
    flexShrink: 0,
    fontSize: "14px",
  };

  const outlinedBtnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "#d4d4d8",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "14px",
    borderRadius: "10px",
    padding: "13px",
    cursor: "pointer",
    marginTop: "28px",
    boxSizing: "border-box",
    textAlign: "center",
    textDecoration: "none",
  };

  const filledBtnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    border: "none",
    background: "#05A845",
    color: "#000000",
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    fontSize: "16px",
    borderRadius: "10px",
    padding: "14px",
    cursor: "pointer",
    marginTop: "28px",
    boxSizing: "border-box",
    textAlign: "center",
    textDecoration: "none",
  };

  const guaranteeStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    textAlign: "center",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    color: "#9a9aa2",
    marginTop: "12px",
    marginBottom: 0,
  };

  const finePrintStyle: React.CSSProperties = {
    textAlign: "center",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    fontSize: "13px",
    color: "#9a9aa2",
    marginTop: "32px",
  };

  const starterFeatures = [
    "1 crew member",
    "10 jobs per month",
    "Mobile app (iOS + Android)",
    "Basic scheduler",
    "Customer database",
  ];

  const proFeatures = [
    "Everything in Starter",
    "Unlimited crew members",
    "Unlimited jobs",
    "Unlimited Cutty AI yard scans",
    "Auto-invoicing + SMS pay links (Stripe)",
    "Route optimizer",
    "Client portal",
    "Priority support (4-hr response)",
  ];

  const enterpriseFeatures = [
    "Everything in Pro",
    "White-label mobile app",
    "Custom domain + branding",
    "REST API access",
    "SSO / SAML login",
    "Dedicated success manager + onboarding",
  ];

  return (
    <section style={sectionStyle}>
      <div style={innerStyle}>
        <div style={headingBlockStyle}>
          <div style={labelChipStyle}>Pricing</div>
          <h2 style={headingStyle}>One plan for every crew size.</h2>
          <p style={subHeadingStyle}>
            Start free forever, or try Pro free for 30 days. Cancel anytime — no
            setup call.
          </p>
        </div>

        <div style={toggleWrapStyle}>
          <div style={pillTrackStyle}>
            <button
              type="button"
              style={annual ? pillInactiveStyle : pillActiveStyle}
              onClick={() => setBilling("monthly")}
              aria-pressed={!annual}
            >
              Monthly
            </button>
            <button
              type="button"
              style={annual ? pillActiveStyle : pillInactiveStyle}
              onClick={() => setBilling("annual")}
              aria-pressed={annual}
            >
              Annual
            </button>
          </div>
          <span style={saveChipStyle}>Save 18%</span>
        </div>

        <div style={gridStyle}>
          <div style={baseCardStyle}>
            <div style={starterChipStyle}>Starter</div>
            <p style={tierBlurbStyle}>For the solo operator getting off paper.</p>
            <div style={priceRowStyle}>
              <span style={priceStyle}>$0</span>
              <span style={priceSuffixStyle}>/month</span>
            </div>
            <p style={subPriceStyle}>Forever. No credit card.</p>
            <div style={dividerStyle} />
            <ul style={featuresListStyle}>
              {starterFeatures.map((f) => (
                <li key={f} style={featureItemStyle}>
                  <span style={checkStyle}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href="#start" style={outlinedBtnStyle}>
              Get started free
            </a>
          </div>

          <div style={proCardStyle}>
            <div style={mostPopularChipStyle}>Most Popular</div>
            <div style={proChipStyle}>Pro</div>
            <p style={tierBlurbStyle}>
              For growing crews that want AI running the busywork.
            </p>
            <div style={priceRowStyle}>
              <span style={priceStyle}>{annual ? "$65" : "$79"}</span>
              <span style={priceSuffixStyle}>/month</span>
            </div>
            <p style={subPriceStyle}>
              {annual ? "Billed $780/yr · save 2 months" : "Per crew. Billed monthly."}
            </p>
            <div style={dividerStyle} />
            <ul style={featuresListStyle}>
              {proFeatures.map((f) => (
                <li key={f} style={featureItemStyle}>
                  <span style={checkStyle}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href="#start" style={filledBtnStyle}>
              Start free for 30 days →
            </a>
            <p style={guaranteeStyle}>
              <span aria-hidden="true">🛡</span>
              30-day money-back guarantee · No contracts
            </p>
          </div>

          <div style={baseCardStyle}>
            <div style={enterpriseChipStyle}>Enterprise</div>
            <p style={tierBlurbStyle}>For multi-location operations and franchises.</p>
            <div style={customPriceStyle}>Custom</div>
            <p style={subPriceStyle}>
              Volume pricing for 5+ crews. Talk to a real human.
            </p>
            <div style={dividerStyle} />
            <ul style={featuresListStyle}>
              {enterpriseFeatures.map((f) => (
                <li key={f} style={featureItemStyle}>
                  <span style={checkStyle}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a href="#contact" style={outlinedBtnStyle}>
              Book a demo
            </a>
          </div>
        </div>

        <p style={finePrintStyle}>
          All plans include iOS + Android apps, offline mode, and 99.9% uptime SLA.
          <br />
          Cancel anytime — keep your data. Secured by Stripe.
        </p>
      </div>
    </section>
  );
}
