import React from "react";
import { BEATS } from "../data/beats";

// Map the four operating steps to the canonical beat copy in src/data/beats.ts.
// We reuse the existing annotation/subAnnotation strings rather than inventing new copy.
const beatById = (id: string) => BEATS.find((b) => b.id === id);

const steps = [
  { kicker: "01 · SCAN", beat: beatById("scan") },
  { kicker: "02 · QUOTE", beat: beatById("jobcard") },
  { kicker: "03 · ROUTE", beat: beatById("route") },
  { kicker: "04 · GET PAID", beat: beatById("invoice") },
].filter((s): s is { kicker: string; beat: NonNullable<ReturnType<typeof beatById>> } =>
  Boolean(s.beat)
);

export default function HowItWorks() {
  return (
    <section
      id="features"
      style={{
        background: "#09090b",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "88px 24px 72px",
        }}
      >
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.24em",
              color: "#2ad16a",
              marginBottom: "16px",
            }}
          >
            How it works
          </div>
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 44px)",
              color: "#ffffff",
              margin: "0 0 12px 0",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "640px",
            }}
          >
            Scan. Quote. Route. Get paid.
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "16px",
              color: "#71717a",
              margin: 0,
              lineHeight: 1.6,
              maxWidth: "560px",
            }}
          >
            One pass through the yard runs the whole operation — from the first
            scan to the dollar in your account.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {steps.map((step) => (
            <div
              key={step.kicker}
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "20px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: "#2ad16a",
                }}
              >
                {step.kicker}
              </div>
              <h3
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "#ffffff",
                  margin: 0,
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                }}
              >
                {step.beat.annotation}
              </h3>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "14px",
                  color: "#a1a1aa",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {step.beat.subAnnotation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
