# YardWorx — "The Yard That Grows" · Build TODO

_Last updated: 2026-06-30_

## Status: SHIP-READY. All P0/P1/P2 items complete.

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
- [x] Pricing section (Starter / Pro $79 / Enterprise)

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

## 🟡 Remaining (needs external action or lower priority)

- [ ] **SSAO on HIGH tier** — needs `NormalPass` setup with EffectComposer; adds ~2ms GPU
- [ ] **Lighthouse perf pass** — run `npm run build && npx serve dist` then Lighthouse; target LCP < 2.5s desktop
- [ ] **Custom domain** — yardworx.io → point DNS to Vercel, set in project settings (user action)

---

## Feature Add Slots

| What | Where |
|------|-------|
| Video testimonials embed | `src/sections/CrewVoice.tsx` |
| "Through the Lens" act 2 | `src/scenes/LensScene.tsx` (after Beat 5) |
| Live Ear demo (real AI call) | `src/hooks/useLiveEarDemo.ts` |
| Spanish localization | `src/i18n/` — i18next |
| Blog / resources | New route `/resources` |
