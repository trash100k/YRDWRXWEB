# "The Yard That Grows" — Research

_Last updated: 2026-06-30_

This document captures the buyer research, competitor analysis, and technical
references that drove the concept decision. It is a living reference — update it
when new market signals surface, not a one-time artifact.

---

## The Buyer

**Who lands on this site:** the owner of a landscaping business, not a crew member.
1–20 employees, $200K–$2M annual revenue, running their operation out of a pickup
truck and a phone. Mostly male, 30–55, non-coastal, trades-background.

**Their relationship with software:** adversarial by default. They've been burned:
QuickBooks that took 3 months to set up, a scheduling app the crew ignored, a CRM
that cost $300/month and got cancelled after 90 days. The mental model is "software
is something office people use, not something that makes me money on a Thursday."

**What they trust:**
- Other landscapers telling them it worked
- Seeing the thing actually work, not a feature list
- Speed — if a demo takes more than 30 seconds to make sense, they're gone
- Specificity — "hedge trim, aerate, $380" lands harder than "service optimization"
- The price going away (not a big upfront cost)

**What they're afraid of:**
- Their crew won't use it
- They'll spend time setting it up and it won't stick
- They're not "tech people"
- They'll lose control of their business to a dashboard

**Decision mode:** gut + proof, not feature matrix. They don't compare 10 products.
They find one that feels right and move fast.

---

## Why "The Yard That Grows" Works for This Buyer

**Before/after is their native language.** Every landscaper sells transformation.
Their Instagram is before/after shots. Their word-of-mouth is "you should see what
they did to the Johnson property." This world speaks that language back at them.

**Scroll is zero friction.** No click, no form, no mic permission — just scroll and
watch the yard change. A skeptical buyer who won't click "watch demo" will scroll.

**Each beat kills one objection.** The transformation sequence is designed around
the 5 things that stop a landscaper from buying software:
1. "I don't understand how the AI works" → watch Cutty scan and label the yard
2. "Does it actually generate real quotes" → watch the job card float up with real numbers
3. "What about routing — I already know my area" → watch the route optimize two jobs on the same block
4. "How do I get paid faster" → watch the invoice settle with a PAID stamp in under a beat
5. "My crew won't use it" → watch the crew pins drop and navigate, no training shown

**The CTA earns its place.** By Beat 5, the visitor has watched their workflow
executed in front of them. "Want to run this on your actual properties?" isn't a
cold ask — it's a logical next step after a proof.

---

## Competitor Analysis

| Product | Marketing site approach | What's missing |
|---------|------------------------|----------------|
| **Jobber** | Feature-list hero, static screenshots, generic testimonials | No "wow" moment, looks like every SaaS site |
| **Housecall Pro** | Testimonial-heavy, "built for the trades" messaging | No product demo, trust through social proof not proof of work |
| **ServiceTitan** | Enterprise, overwhelming, not landscaping-specific | Wrong audience positioning, complex |
| **LawnPro** | Dated, table of features, price-forward | No visual storytelling, low trust |
| **Yardbook** | Free tier hook, screenshot-heavy, basic | No AI positioning, feels amateur |
| **Aspire** | White-glove enterprise feel, long demo CTAs | Not self-serve, high friction |

**The gap:** No landscaping SaaS uses a 3D experience or shows the product actually
working as the marketing artifact. They all ask you to trust a screenshot or a
testimonial. YardWorx shows you the thing. That's the entire moat.

---

## The "Cutty" Brand Continuity Point

Cutty is already the in-app guide — a pulsing `forest-500/30` targeting ring that
focuses on UI elements and says "Ready to help." The marketing site's Cutty reticle
should be visually identical to this ring. When a new customer opens the app for
the first time and sees Cutty highlight the scheduler, they should recognize it
immediately from the site. That recognition IS the trust transfer.

The reticle lives in `CuttyGuideContext.tsx` in the main app:
```
border-2 border-forest-500/30 rounded-2xl
bg-forest-500/5 blur-xl rounded-2xl (glow layer)
```
The marketing site reticle should match this exactly.

---

## Technical References

### 3D Framework
**React Three Fiber** (`@react-three/fiber`) — the React renderer for Three.js.
Preferred over raw Three.js because:
- The main app is React — same mental model
- Drei (`@react-three/drei`) provides `<Float>`, `<Html>`, `<Text>`, `<Environment>` out of the box
- `useFrame` hook integrates cleanly with scroll state

**GSAP + ScrollTrigger** — industry standard for scroll-to-animation mapping.
- `ScrollTrigger.create({ trigger, start, end, onUpdate: (self) => setProgress(self.progress) })`
- Pin the canvas container with `position: sticky, top: 0` — this is more reliable than `pin: true` in ScrollTrigger for 3D canvases
- Alternative: `motion`'s `useScroll` + `useTransform` hooks (already in the main app stack, less powerful but zero new dependency)

**Drei `<Html>`** — renders DOM nodes positioned in 3D space. Used for the floating
job card and invoice panel. Crucially, it handles occlusion and depth sorting so
labels feel like they're attached to the yard geometry.

### Performance
- The Three.js canvas should be **dynamically imported** (`React.lazy`) to keep the
  initial bundle below 150kB. The 3D scene loads after the hero text is already
  painted.
- **Texture compression:** use `.ktx2` (Basis Universal) for any textures via
  `@react-three/drei`'s `<KTX2Loader>` wrapper. Grass normal map should be < 256kB.
- **LOD:** mobile scene swaps to lower-poly geometry (half the hedge vertices, no
  normal maps) detected via `window.innerWidth < 768` or the `navigator.hardwareConcurrency < 4` heuristic.
- **WebGL detection:** wrap the canvas in a try/catch on context creation. If WebGL
  is unavailable (old Android, privacy browser), render the static `ReducedScene`
  (a CSS 3D perspective transform of the before/after images).

### Scroll Architecture
```
[Page scroll] → [GSAP ScrollTrigger] → [beat index (0–4)] 
  → [YardScene: material changes, geometry morphs]
  → [UI overlay: BeatAnnotation components swap in/out]
```
The beat index is shared via a lightweight Zustand store or a React context with
a `useScrollBeat` hook so the scene and the UI overlay stay in sync without prop drilling.

### Grass Greening Animation
Options in order of performance cost:
1. **Material color lerp** (cheapest) — lerp `MeshStandardMaterial.color` from
   grey-green to `#05A845` per-quad as the scan plane passes. Simple, works everywhere.
2. **Vertex color wave** — pass a uniform for the scan plane Y position, shade
   each vertex green if `vertex.y < scanPlane.y`. Requires a custom shader but is GPU-side.
3. **Grass shader with per-blade instances** (most impressive, most expensive) —
   `InstancedMesh` of grass blades, each with a phase offset. Reserve for desktop only.

Start with option 1, upgrade to 2 if the visual isn't convincing.

---

## Mobile Field Data

Landscaping crews are 80%+ on smartphones. Android is dominant (iPhone skews
toward office-based trades). Key implications:

- **WebGL support:** Modern Android (Chrome 112+) supports WebGL 2. Older/budget
  devices may be WebGL 1 only or soft-fail. Always test on a Moto G or Galaxy A series.
- **Touch scroll inertia:** iOS Safari's momentum scrolling can cause ScrollTrigger
  to fire past a beat. Use `fastScrollEnd: true` in ScrollTrigger config and clamp
  the beat index on the scene side.
- **GPU memory:** A full 3D scene on a budget Android can hit the 256MB GPU
  memory limit. Keep total texture memory < 64MB on mobile.
- **Performance budget:** Target LCP < 3.5s on a 4G connection (Slow 4G in Chrome
  DevTools is the right test condition for a landscaper on a job site).

---

## Landscaper-Specific Copy Notes

The copy on the site must pass the "does a landscaper actually say this" test.
Words that work: hedge trim, aerate, overseed, edge, mulch, HOA, gate code, crew,
route, job, bid, invoice, collect. Words to avoid: "field service," "workflow
optimization," "operational efficiency," "platform," "ecosystem."

Prices on the site should feel real: $380, $465, $85 add-on — not round numbers
like $400 or $500. Real quotes have irregular totals. That specificity signals the
tool generates real numbers, not estimates.

The job in Beat 2 ("Hedge trim · Aerate · Edge · Mulch — $380") should be a real
job a landscaper would recognize, not a made-up service bundle. Ask a real
landscaper to gut-check it before launch.
