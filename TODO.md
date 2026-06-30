# YardWorx — "The Yard That Grows" · Build TODO

_Last updated: 2026-06-30_

## What this is

The marketing site for YardWorx (`yardworx.io`). A scroll-driven 3D experience
built around a single residential yard that transforms — before → Cutty scans it
→ after — while each transformation beat kills one landscaper objection. One world,
one mascot, one CTA. No forms, no feature lists, no demo calls.

Target buyer: landscaping business owner, 1–20 crew, deeply skeptical of software.
Trust is earned by showing the work, not describing it.

---

## Build Cadence

| Phase | What ships | Target |
|-------|-----------|--------|
| 1 | Foundation — project, brand, 3D scaffold | Day 1 |
| 2 | The yard scene — 3D geometry, lighting, Cutty reticle | Days 2–3 |
| 3 | Transformation sequence — scroll beats 1–5 | Days 4–5 |
| 4 | UI overlay — panels, labels, CTA | Day 6 |
| 5 | Polish — mobile, reduced motion, perf | Days 7–8 |
| 6 | Production — deploy, analytics, SEO | Day 9 |

---

## Phase 1 · Foundation

- [ ] Vite + React 19 + TypeScript project init
- [ ] Tailwind CSS v4 installed, brand tokens wired (copy from main app `src/index.css`)
- [ ] Fonts loaded: Outfit 700/800, Inter 400, JetBrains Mono (match main app)
- [ ] React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`) installed
- [ ] GSAP + ScrollTrigger installed (scroll-to-beat mapping)
- [ ] `motion` (framer-motion) installed for UI overlay animations
- [ ] Single-page route structure (`/` only for now)
- [ ] `src/data/` directory scaffolded for beats, labels, copy
- [ ] `.env.example` committed (no keys needed for Phase 1)
- [ ] Dev server confirmed running at `localhost:5173`

---

## Phase 2 · The Yard Scene (3D)

- [ ] `<YardScene />` component with React Three Fiber `<Canvas>`
- [ ] Ground plane — grass-green material, subtle normal map
- [ ] Hedge geometry — 3 rectangular boxes, slightly asymmetric (overgrown feel)
- [ ] House/structure — background box, muted warm-grey, simple silhouette
- [ ] Driveway strip — concrete-grey plane, ragged edge material
- [ ] 3 tree cylinders — dark trunk + sphere canopy
- [ ] Dramatic low-sun lighting — `PointLight` from lower-left, `AmbientLight` dim
- [ ] Before-state materials: desaturated, muted, grey-green (`zinc-*` palette)
- [ ] Camera position locked — slow orbit disabled, fixed 3/4 isometric angle
- [ ] Cutty reticle component — pulsing `forest-500/30` ring that lands on targets
- [ ] Scene loads in `<Suspense>` with a simple fade-in placeholder
- [ ] Mobile: detect `window.innerWidth < 768`, swap to simplified scene (fewer objects)

---

## Phase 3 · Transformation Sequence (scroll-driven beats)

Scroll position maps to 5 beats via GSAP ScrollTrigger. Each beat is ~200px of scroll.

- [ ] ScrollTrigger scaffold — pin the scene `position: sticky`, map scroll % to beat index
- [ ] `src/data/beats.ts` — beat definitions (id, scrollStart, scrollEnd, label, objectionKilled)
- [ ] **Beat 1 — Cutty scans:** reticle appears, horizontal scan plane sweeps up yard, grass greens quadrant by quadrant (left → right wave)
- [ ] **Beat 2 — Job card floats up:** 3D `<Html>` panel (Drei) rises from yard with scope + price. "Hedge trim · Aerate · Edge · Mulch — $380"
- [ ] **Beat 3 — Minimap + route:** small 2D map overlay appears bottom-left, glowing truck path draws between 3 jobs on the same street
- [ ] **Beat 4 — Invoice settles:** invoice panel materializes, animated PAID stamp drops, SMS confirmation text fades in
- [ ] **Beat 5 — Crew drives away:** truck model (simple box) rolls out, crew pin drops on map, Cutty reticle fades
- [ ] Transition back: scroll UP reverses beats (partial reverse is fine, no need for full rewind)
- [ ] Each beat triggers a floating annotation label in the UI overlay layer (see Phase 4)
- [ ] `src/hooks/useScrollBeat.ts` — returns current beat index, exposes to both scene and UI

---

## Phase 4 · UI Overlay Layer

Everything in this phase is DOM-layer (not 3D) — positioned over the canvas.

- [ ] **Hero headline** — "This is your Tuesday." above the fold, large Outfit 800
- [ ] **Subhead** — "YardWorx sees every yard. Schedules every job. Collects every dollar." — `text-zinc-300`
- [ ] **Beat annotation system** — `src/components/BeatAnnotation.tsx` — floats in from right on each beat, exits on next beat. Carries the objection label + resolution line.
- [ ] **Live Ear panel replica** — `src/components/LiveEarPanel.tsx` — appears on Beat 4, matches the exact panel from the main app (`bg-zinc-950/95`, `border-forest-500/25`, action log, `text-[9px] font-black uppercase tracking-[0.2em] text-forest-400` labels)
- [ ] **Beat 5 CTA card** — Cutty line + single button. Copy: "Want to run this on your actual properties? → [Start free for 30 days]"
- [ ] CTA button: `bg-forest-500 text-black` primary, `ember-500` border glow (`molten-edge` class)
- [ ] Nav bar — minimal: logo mark (Cutty reticle + "YardWorx"), ghost "Sign in" link, `ember-500` "Start free" pill
- [ ] Footer — minimal: copyright, Privacy, Terms links only

---

## Phase 5 · Polish

- [ ] **Mobile layout** — hero text scales down, scene is simplified (see Phase 2 mobile note), beats still fire on scroll
- [ ] **Reduced motion** — `prefers-reduced-motion: reduce` disables all 3D animation, shows static before/after side-by-side instead
- [ ] Outfit 700 weight preloaded in `<head>` to eliminate FOUT
- [ ] 3D canvas dynamically imported (`React.lazy`) to keep initial JS bundle < 150kB
- [ ] Lighthouse perf pass: target LCP < 2.5s on desktop, < 3.5s on 4G mobile
- [ ] OG image (1200×630): yard before/after split with Cutty reticle + YardWorx wordmark
- [ ] `<meta>` tags: title, description, OG, Twitter card

---

## Phase 6 · Production

- [ ] Vercel project created, linked to `trash100k/yrdwrxweb`
- [ ] `vercel.json` — SPA routing config (`rewrites: [{ source: '/(.*)', destination: '/index.html' }]`)
- [ ] Custom domain wired (`yardworx.io` or staging subdomain)
- [ ] Analytics: Vercel Analytics or Plausible (no cookie consent banner needed)
- [ ] `robots.txt` and `sitemap.xml`
- [ ] Error boundary on the 3D canvas (graceful fallback if WebGL fails)

---

## Feature Add Slots

When new features ship, plug them in here — not into the existing phase structure.

| What to add | Where it goes |
|-------------|--------------|
| New transformation beat | `src/data/beats.ts` — add entry, wire scene + annotation |
| New floating yard label | `src/data/yardLabels.ts` — label text, 3D position, beat trigger |
| Testimonials bar | `src/sections/SocialProof.tsx` — drop between Beat 5 and CTA |
| Pricing section | `src/sections/Pricing.tsx` — after CTA, before footer |
| Video embed (crew testimonial) | `src/sections/CrewVoice.tsx` — after SocialProof |
| Blog / resources | New route `/resources` — add lazy route in `main.tsx` |
| "Through the Lens" act 2 | `src/scenes/LensScene.tsx` — activates after Beat 5, transitions into the #4 experience as a second world |
| Live demo (real backend call) | `src/hooks/useLiveEarDemo.ts` — wraps `/api/live` WebSocket, gated behind a "Try it live" CTA |
| Localization (Spanish crew) | `src/i18n/` — i18next, start with `en` + `es` |

---

## Done

_Items move here when merged to main._
