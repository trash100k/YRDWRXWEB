import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/hooks/useScrollBeat";

/* ------------------------------------------------------------------ */
/* Tokens (inlined for an isolated, parallel build)                    */
/* ------------------------------------------------------------------ */

const T = {
  green: "#05a845",
  greenBright: "#2ad16a",
  greenDeep: "#047a32",
  neon: "#5dffa0",
  orange: "#E85D04",
  violet: "#7c3aed",
  heading: "#fafafa",
  body: "#d4d4d8",
  muted: "#a1a1aa",
  mutedAlt: "#9a9aa2",
  faint: "#71717a",
  card: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  hair: "rgba(255,255,255,0.07)",
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "'Outfit', 'Inter', sans-serif",
} as const;

const SPRING = { type: "spring" as const, stiffness: 320, damping: 28 };

/* ------------------------------------------------------------------ */
/* Seed data — repo brand labels kept; mockup taglines/structure       */
/* ------------------------------------------------------------------ */

type TierId = "starter" | "pro" | "enterprise";

type Tier = {
  id: TierId;
  name: string;
  tagline: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string; variant: "ghost" | "solid" };
  popular?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo & side-hustle",
    blurb: "For the solo operator getting off paper.",
    features: [
      "1 crew member",
      "10 jobs per month",
      "Mobile app (iOS + Android)",
      "Cutty AI yard scan (3 / mo)",
      "Basic scheduler",
      "Customer database",
    ],
    cta: { label: "Get started free", href: "#start", variant: "ghost" },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Growing crews",
    blurb: "For growing crews that want AI running the busywork.",
    popular: true,
    features: [
      "Everything in Starter",
      "Unlimited crew members",
      "Unlimited jobs",
      "Unlimited Cutty AI yard scans",
      "Auto-invoicing + SMS pay links (Stripe)",
      "Route optimizer",
      "Client portal",
      "Field mode",
      "Priority support (4-hr response)",
    ],
    cta: { label: "Start free for 30 days →", href: "#start", variant: "solid" },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-location ops",
    blurb: "For multi-location operations and franchises.",
    features: [
      "Everything in Pro",
      "Unlimited crews",
      "White-label mobile app",
      "Custom domain + branding",
      "REST API access",
      "SSO / SAML login",
      "Dedicated success manager + onboarding",
      "99.9% uptime SLA",
    ],
    cta: { label: "Book a demo", href: "#contact", variant: "ghost" },
  },
];

const TRUST = ["2,300+ crews", "SOC2 in progress", "48 states"] as const;

/* ------------------------------------------------------------------ */
/* Background / overlay primitives                                     */
/* ------------------------------------------------------------------ */

function GlowField() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: [
          "radial-gradient(1200px 700px at 50% 30%, rgba(5,168,69,0.16), transparent 60%)",
          "radial-gradient(700px 500px at 84% 8%, rgba(232,93,4,0.10), transparent 60%)",
          "radial-gradient(800px 600px at 12% 92%, rgba(124,58,237,0.10), transparent 60%)",
        ].join(","),
      }}
    />
  );
}

function GrainVignette() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 40,
          pointerEvents: "none",
          background:
            "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          boxShadow: "inset 0 0 320px 60px rgba(0,0,0,0.55)",
        }}
      />
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 45,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          opacity: 0.035,
          mixBlendMode: "overlay",
        }}
      >
        <filter id="pricingGrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={3}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#pricingGrain)" />
      </svg>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Check chip                                                          */
/* ------------------------------------------------------------------ */

function CheckChip({ pro }: { pro: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0,
        width: "18px",
        height: "18px",
        borderRadius: "999px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(45,209,106,0.14)",
        border: "1px solid rgba(45,209,106,0.35)",
        boxShadow: pro ? "0 0 10px rgba(45,209,106,0.45)" : "none",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path
          d="M2.5 6.2L4.9 8.6L9.5 3.4"
          stroke={T.neon}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* CTA button                                                          */
/* ------------------------------------------------------------------ */

function CtaButton({
  cta,
  reduced,
}: {
  cta: Tier["cta"];
  reduced: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const solid = cta.variant === "solid";

  const base: CSSProperties = {
    display: "block",
    width: "100%",
    borderRadius: "10px",
    textAlign: "center",
    textDecoration: "none",
    cursor: "pointer",
    marginTop: "28px",
    boxSizing: "border-box",
  };

  const solidStyle: CSSProperties = {
    ...base,
    border: "1px solid rgba(93,255,160,0.6)",
    background: "linear-gradient(180deg, #5dffa0, #05a845)",
    color: "#04210f",
    fontFamily: T.display,
    fontWeight: 700,
    fontSize: "16px",
    padding: "14px",
    boxShadow:
      "0 0 30px rgba(45,209,106,0.55), inset 0 1px 0 rgba(255,255,255,0.45)",
  };

  const ghostStyle: CSSProperties = {
    ...base,
    border: `1px solid ${hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)"}`,
    background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
    color: T.body,
    fontFamily: T.sans,
    fontWeight: 500,
    fontSize: "14px",
    padding: "13px",
    transition: "background 0.2s ease, border-color 0.2s ease",
  };

  return (
    <motion.a
      href={cta.href}
      style={solid ? solidStyle : ghostStyle}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={
        reduced || !solid
          ? undefined
          : { scale: hovered ? 1.02 : 1, filter: hovered ? "brightness(1.08)" : "brightness(1)" }
      }
      transition={SPRING}
    >
      {cta.label}
    </motion.a>
  );
}

/* ------------------------------------------------------------------ */
/* Tier card                                                           */
/* ------------------------------------------------------------------ */

function priceFor(id: TierId, annual: boolean): {
  amount: ReactNode;
  suffix?: string;
  sub: string;
} {
  if (id === "starter") {
    return { amount: "$0", suffix: "/month", sub: "Forever. No credit card." };
  }
  if (id === "pro") {
    return {
      amount: annual ? "$65" : "$79",
      suffix: "/month",
      sub: annual
        ? "Billed $780/yr · save 2 months"
        : "Per crew. Billed monthly.",
    };
  }
  return {
    amount: "Custom",
    sub: "Volume pricing for 5+ crews. Talk to a real human.",
  };
}

function TierCard({
  tier,
  index,
  annual,
  reduced,
}: {
  tier: Tier;
  index: number;
  annual: boolean;
  reduced: boolean;
}) {
  const pro = !!tier.popular;
  const price = priceFor(tier.id, annual);
  const isCustom = tier.id === "enterprise";

  const cardStyle: CSSProperties = {
    position: "relative",
    zIndex: 1,
    borderRadius: "20px",
    padding: "32px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    background: pro
      ? "linear-gradient(180deg, rgba(5,168,69,0.10), rgba(255,255,255,0.04))"
      : "rgba(255,255,255,0.04)",
    border: pro
      ? "1px solid rgba(45,209,106,0.45)"
      : `1px solid ${T.border}`,
    boxShadow: pro
      ? "0 0 0 1px rgba(45,209,106,0.25), 0 0 60px rgba(5,168,69,0.30), 0 40px 80px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 30px 60px -30px rgba(0,0,0,0.8)",
  };

  const tierNameStyle: CSSProperties = {
    fontFamily: T.mono,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: pro ? T.greenBright : T.faint,
  };

  const taglineStyle: CSSProperties = {
    fontFamily: T.sans,
    fontWeight: 400,
    fontSize: "14px",
    color: T.muted,
    margin: "8px 0 16px 0",
    lineHeight: 1.4,
  };

  const blurbStyle: CSSProperties = {
    fontFamily: T.sans,
    fontWeight: 400,
    fontSize: "13.5px",
    color: T.mutedAlt,
    margin: "0 0 20px 0",
    lineHeight: 1.45,
  };

  const priceTextStyle: CSSProperties = {
    fontFamily: T.display,
    fontWeight: 800,
    fontSize: pro ? "54px" : isCustom ? "36px" : "48px",
    lineHeight: 1,
    color: pro ? undefined : T.heading,
    ...(pro
      ? {
          background: "linear-gradient(180deg, #ffffff, #bdf3d0)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 0 18px rgba(45,209,106,0.35))",
        }
      : {}),
  };

  const priceSuffixStyle: CSSProperties = {
    fontFamily: T.display,
    fontWeight: 400,
    fontSize: "16px",
    color: T.mutedAlt,
  };

  const subPriceStyle: CSSProperties = {
    fontFamily: T.sans,
    fontWeight: 400,
    fontSize: "13px",
    color: T.mutedAlt,
    margin: 0,
  };

  const dividerStyle: CSSProperties = {
    borderTop: `1px solid ${T.hair}`,
    margin: "20px 0",
  };

  const featuresListStyle: CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: "0 0 auto 0",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };

  const featureItemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontFamily: T.sans,
    fontWeight: 400,
    fontSize: "14px",
    color: T.body,
  };

  const guaranteeStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    textAlign: "center",
    fontFamily: T.sans,
    fontWeight: 400,
    fontSize: "12px",
    color: T.mutedAlt,
    margin: "12px 0 0 0",
  };

  return (
    <motion.div
      className={pro ? "pro-lift" : undefined}
      style={cardStyle}
      initial={reduced ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING, delay: reduced ? 0 : 0.05 + index * 0.07 }}
    >
      {/* Mid-glow bloom — ignites the Pro card from within */}
      {pro && (
        <motion.div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-40px",
            left: "50%",
            width: "520px",
            maxWidth: "120%",
            height: "560px",
            transform: "translateX(-50%)",
            zIndex: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(closest-side, rgba(5,168,69,0.28), transparent 70%)",
            filter: "blur(20px)",
          }}
          initial={reduced ? false : { opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ ...SPRING, delay: reduced ? 0 : 0.2 }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Tier-top row: mono name + (Pro) Most-popular pill inline-right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "0",
          }}
        >
          <span style={tierNameStyle}>{tier.name}</span>
          {pro && (
            <span
              style={{
                fontFamily: T.mono,
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#04210f",
                background: "linear-gradient(180deg,#5dffa0,#05a845)",
                borderRadius: "999px",
                padding: "4px 11px",
                boxShadow: "0 0 18px rgba(45,209,106,0.55)",
                whiteSpace: "nowrap",
              }}
            >
              Most popular
            </span>
          )}
        </div>

        <p style={taglineStyle}>{tier.tagline}</p>
        <p style={blurbStyle}>{tier.blurb}</p>

        {/* Price */}
        {isCustom ? (
          <div style={{ marginBottom: "4px" }}>
            <span style={priceTextStyle}>{price.amount}</span>
          </div>
        ) : (
          <motion.div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
              marginBottom: "4px",
            }}
            initial={reduced || !pro ? false : { opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ ...SPRING, delay: reduced ? 0 : 0.3 }}
          >
            <span style={priceTextStyle}>{price.amount}</span>
            {price.suffix && <span style={priceSuffixStyle}>{price.suffix}</span>}
          </motion.div>
        )}
        <p style={subPriceStyle}>{price.sub}</p>

        <div style={dividerStyle} />

        <ul style={featuresListStyle}>
          {tier.features.map((f) => (
            <li key={f} style={featureItemStyle}>
              <CheckChip pro={pro} />
              {f}
            </li>
          ))}
        </ul>

        <CtaButton cta={tier.cta} reduced={reduced} />

        {pro && (
          <p style={guaranteeStyle}>
            <span aria-hidden="true">🛡</span>
            30-day money-back guarantee · No contracts
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing section                                                     */
/* ------------------------------------------------------------------ */

export function Pricing() {
  const reduced = useReducedMotion();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const annual = billing === "annual";

  const sectionStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    background: "#09090b",
    width: "100%",
    padding: "80px 24px",
    boxSizing: "border-box",
  };

  const innerStyle: CSSProperties = {
    position: "relative",
    zIndex: 1,
    maxWidth: "1100px",
    margin: "0 auto",
  };

  const kickerStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: T.mono,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: T.greenBright,
    marginBottom: "16px",
  };

  const headingStyle: CSSProperties = {
    fontFamily: T.display,
    fontWeight: 800,
    fontSize: "clamp(28px, 5vw, 46px)",
    color: T.heading,
    margin: "0 0 12px 0",
    lineHeight: 1.12,
  };

  const subHeadingStyle: CSSProperties = {
    fontFamily: T.sans,
    fontWeight: 400,
    fontSize: "16px",
    color: T.mutedAlt,
    margin: 0,
    lineHeight: 1.5,
  };

  const pillBtnBaseStyle: CSSProperties = {
    fontFamily: T.mono,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    border: "none",
    borderRadius: "999px",
    padding: "8px 18px",
    cursor: "pointer",
    transition: "background 0.2s ease, color 0.2s ease",
  };

  const pillActiveStyle: CSSProperties = {
    ...pillBtnBaseStyle,
    background: "#05A845",
    color: "#04210f",
  };

  const pillInactiveStyle: CSSProperties = {
    ...pillBtnBaseStyle,
    background: "transparent",
    color: T.mutedAlt,
  };

  return (
    <section style={sectionStyle}>
      <GlowField />

      <div style={innerStyle}>
        {/* Header */}
        <motion.div
          style={{ textAlign: "center", paddingBottom: "40px" }}
          initial={reduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={SPRING}
        >
          <span style={kickerStyle}>
            <span
              aria-hidden="true"
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "999px",
                background: T.neon,
                boxShadow: "0 0 10px rgba(93,255,160,0.9)",
              }}
            />
            PRICING
          </span>
          <h2 style={headingStyle}>
            Priced like a{" "}
            <span
              style={{
                background: "linear-gradient(180deg, #5dffa0, #05a845)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              tool
            </span>
            , not a tax.
          </h2>
          <p style={subHeadingStyle}>
            Start free. Upgrade when{" "}
            <b style={{ color: T.greenBright, fontWeight: 700 }}>Cutty</b> is
            running your whole yard.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <motion.div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            paddingBottom: "48px",
          }}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...SPRING, delay: reduced ? 0 : 0.1 }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${T.border}`,
              borderRadius: "999px",
              padding: "4px",
              gap: "4px",
            }}
          >
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
          <span
            style={{
              fontFamily: T.mono,
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: T.greenBright,
              background: "rgba(5,168,69,0.15)",
              borderRadius: "6px",
              padding: "4px 9px",
            }}
          >
            Save 18%
          </span>
        </motion.div>

        {/* Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {TIERS.map((tier, i) => (
            <TierCard
              key={tier.id}
              tier={tier}
              index={i}
              annual={annual}
              reduced={reduced}
            />
          ))}
        </div>

        {/* Trust strip */}
        <motion.div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "14px",
            marginTop: "40px",
          }}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...SPRING, delay: reduced ? 0 : 0.35 }}
        >
          {TRUST.map((item, i) => (
            <span
              key={item}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: T.mono,
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: T.faint,
              }}
            >
              {i === 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "999px",
                    background: T.neon,
                    boxShadow: "0 0 9px rgba(93,255,160,0.9)",
                  }}
                />
              )}
              {item}
              {i < TRUST.length - 1 && (
                <span
                  aria-hidden="true"
                  style={{
                    width: "1px",
                    height: "12px",
                    background: "rgba(255,255,255,0.14)",
                    marginLeft: "4px",
                  }}
                />
              )}
            </span>
          ))}
        </motion.div>

        {/* Guarantee fine-print (preserved) */}
        <p
          style={{
            textAlign: "center",
            fontFamily: T.sans,
            fontWeight: 400,
            fontSize: "13px",
            color: T.mutedAlt,
            marginTop: "20px",
            lineHeight: 1.6,
          }}
        >
          All plans include iOS + Android apps, offline mode, and 99.9% uptime
          SLA.
          <br />
          Cancel anytime — keep your data. Secured by Stripe.
        </p>
      </div>

      <GrainVignette />
    </section>
  );
}
