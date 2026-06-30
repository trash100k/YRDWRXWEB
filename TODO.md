# YardWorx — "The Yard That Grows" · Build TODO

_Last updated: 2026-06-30_

## Status: SHIP-READY + product tour built. Cinematic 3D upgrade in flight.

> ### 🤖 Autonomous sprint — operating mode (read this first)
> This repo is being driven as a **milestone-gated** sprint. Each tick: run a parallel
> Workflow burst (audit/plan → build → verify) → **build-gate green** → **local commit
> only** (checkpoint, no push). **Pushing is the deploy** (Vercel production deploys from
> branch `claude/3d-world-brand-concepts-p2ldxb` — there is no `main`), so **batch pushes
> and ask before each one** (daily Vercel deploy budget is tight). **Definition of Done:**
> audit comes back cinema-grade clean AND all P0/P1 cleared. Build with the R3F + Drei +
> GLSL stack (no Spline — all geometry generated in code). Conventions: TS strict, no
> `@ts-nocheck` in new files, inline styles, Motion + `useReducedMotion` gating, sections
> are default-export files under `src/sections/` and lazy-loaded via `LazySection`.

---

## ✅ Done

### Foundation
- [x] Vite + React 18.3.1 + TypeScript project
- [x] R3F v8 + Drei + postprocessing
- [x] GSAP + motion installed
- [x] Zustand beat store (`src/stores/beatStore.ts`)
- [x] Font loading: Outfit 700/800, Inter, JetBrains Mono
- [x] Vercel SPA routing (`vercel.json`)

### 3D Scene
- [x] YardScene with Canvas, sticky scroll driver
- [x] Ground plane, hedges, house, driveway, mulch, bare patches
- [x] Multi-layer trees (6 trees, 3 canopy spheres each, animated sway)
- [x] Sky dome (stars → pre-dawn gradient, custom shader)
- [x] Grass (40k HIGH / 15k MEDIUM / 5k MOBILE — instanced blades with shader)
- [x] Grass bioluminescence: noise-wind, SSS, bio-pulse, sparkle
- [x] Cutty AI reticle (torus + corner brackets, tracks targets per beat)
- [x] Scan plane (bright core + 3.2-unit wide glow halo)
- [x] Vertical scan curtain (energy wall, moves with scan)
- [x] Ground energy rings (expanding pulse circles, additive blend)
- [x] Firefly particle system (280/140/60 by tier, float+fade lifecycle)
- [x] Hemisphere light transitioning night→day
- [x] Warm sun directional light ramps in post-scan
- [x] ChromaticAberration post-processing
- [x] Bloom + Vignette
- [x] Lens flare — starburst billboard at sun [12,10,8], 6+12-spike diffraction, additive
- [x] Depth of Field — EffectComposer, HIGH tier only (focusDistance 0.008)
- [x] Ground normal map — procedural 128×128 DataTexture, repeat 8×6, normalScale 0.35

### Beat Sequence (scroll-driven)
- [x] Beat 0: Dark moody yard, stars, hero text
- [x] Beat 1: Cutty scans — scan plane + curtain sweep, grass greens L→R, yard labels
- [x] Beat 2: Job card floats up (scope + price)
- [x] Beat 3: Minimap + route
- [x] Beat 4: Invoice panel + PAID stamp + SMS confirm
- [x] Beat 5: CTA card + crew pins

### UI Overlay
- [x] Nav bar (logo + Sign in + Start free)
- [x] Hero headline ("This is your Tuesday.")
- [x] Scroll hint
- [x] Beat annotations (float in/out per beat)
- [x] CTACard with spring button

### Content Sections (below fold)
- [x] Stats bar (2,300+ crews · $14M+ invoiced · 4.9★ · 48 states)
- [x] Testimonials (3 landscaper quotes)
- [x] Pricing section (Starter / Pro $79 / Enterprise) — glow-up (neon Pro lift)
- [x] FAQ section + How It Works (added in cinema-grade QA pass)

### Product Tour — 12 cinematic feature sections (`src/sections/`)
- [x] Forge — AI estimate studio (detection overlay, forged quote, 3D preview)
- [x] LiveEar — on-site voice-to-quote (mic orb, live transcript → scope chips)
- [x] Scheduler — route optimizer (crew lanes, SVG route map)
- [x] Channels — AI-drafted unified inbox
- [x] Cockpit — operational dashboard (KPIs, crew map, Cutty Intel)
- [x] Field — mobile field mode (Live Ear, clock-out)
- [x] Invoice — PAID invoice + automation flow
- [x] Reviews — reputation engine (auto-request, AI reply drafts)
- [x] Analytics — revenue/BI dashboard (SVG charts + forecast)
- [x] Portal — client-facing approve/pay/before-after
- [x] Onboarding — first-run 3-step setup
- [x] Campaigns — AI marketing / win-back
- [x] All tsc-clean, Motion + useReducedMotion gated, static teasers in ReducedScene

### Performance
- [x] Code-split all 12 tour sections (React.lazy + `LazySection` IntersectionObserver
      wrapper) — main bundle 266 KB → **117 KB** (35.7 KB gzip)

### Production Readiness
- [x] GPU tier detection (HIGH / MEDIUM / MOBILE_HIGH / MOBILE_LOW / MINIMAL)
- [x] ReducedScene fallback (reduced-motion + WebGL-absent users)
- [x] CanvasErrorBoundary (catches WebGL crashes, renders ReducedScene)
- [x] React.lazy for YardScene (code-split 3D bundle)
- [x] vercel.json (SPA rewrites + immutable asset cache headers)
- [x] robots.txt
- [x] sitemap.xml
- [x] SEO meta tags (title, description, OG)
- [x] og:image — 1200×630 PNG at `public/og-image.png`, Playwright-generated
- [x] og:url — `<meta property="og:url" content="https://yardworx.io/" />`
- [x] twitter:image meta tag
- [x] touch-action: pan-y on body (iOS Safari momentum scroll)
- [x] Vercel Analytics — `@vercel/analytics` installed, `<Analytics />` in main.tsx

---

## 🎬 In flight — Cinematic 3D upgrade (R3F + Drei + GLSL, no Spline)

Lift the dawn-yard hero to film grade. Generate ALL geometry in code (no Spline handoff).
- [ ] **Drei adoption** — `Environment`/`Lightformer` IBL dawn, `Sparkles`, `Cloud` (volumetric fog),
      `ContactShadows`/`AccumulativeShadows`, `MeshTransmissionMaterial` (water/dew), `AdaptiveDpr`/`PerformanceMonitor`
- [ ] **GLSL upgrades** — volumetric raymarched god-rays, organic simplex/curl-noise displacement,
      caustics, improved SSS + thin-film fresnel, atmospheric scattering / heat-haze
- [ ] **Lighting + post** — IBL-driven golden hour, N8AO/SSAO, bloom/DoF/LUT grade tuning
- [ ] **Camera** — per-beat cinematic shot list over the 6-beat scroll system
- [ ] **New geometry** — richer house/fence, flower beds, water feature, distant treeline, birds
- [ ] **Perf budget** — per-tier feature gating so cinematic holds 60fps on mid/low GPUs

## 🟡 Remaining (lower priority / external)

- [ ] **SSAO on HIGH tier** — needs `NormalPass` setup with EffectComposer; adds ~2ms GPU (folds into cinematic pass)
- [ ] **Lighthouse perf pass** — run `npm run build && npx serve dist` then Lighthouse; target LCP < 2.5s desktop
- [ ] **Custom domain** — yardworx.io → point DNS at Vercel project settings (user action)

---

## Feature Add Slots

| What | Where |
|------|-------|
| Video testimonials embed | `src/sections/CrewVoice.tsx` |
| "Through the Lens" act 2 | `src/scenes/LensScene.tsx` (after Beat 5) |
| Live Ear demo (real AI call) | `src/hooks/useLiveEarDemo.ts` |
| Spanish localization | `src/i18n/` — i18next |
| Blog / resources | New route `/resources` |
