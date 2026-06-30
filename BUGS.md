# Bug Tracker — "The Yard That Grows"

_Last updated: 2026-06-30_

This file tracks bugs, known risks, and pre-flight issues for the YardWorx
marketing site. Open bugs block shipping. Known risks are tracked here before
they become bugs so nothing surprises us in production.

---

## Bug Template

Copy this when logging a new bug:

```
### BUG-XXX · [Category] · [Priority: P0/P1/P2]
**Summary:** One-sentence description.
**Steps to reproduce:**
1. 
2. 
**Expected:** 
**Actual:** 
**Environment:** Browser / OS / device
**Notes:** 
**Status:** Open | In Progress | Fixed | Won't Fix
**Fixed in:** commit hash or PR
```

Priority:
- **P0** — site is broken, nothing works, ship blocker
- **P1** — core experience is degraded, ship blocker
- **P2** — polish issue, nice to fix before launch, not a blocker

---

## Known Risks (Pre-Bugs)

These are not bugs yet — they are high-probability failure modes to watch for
during build. Each one should be verified before shipping Phase 5.

### RISK-001 · [3D] · WebGL not available
**Risk:** Some older Android devices (budget tier, 2019 or earlier) may not
support WebGL 2, or may support it but crash under GPU memory pressure.
**Mitigation:** Wrap the `<Canvas>` in an error boundary. On WebGL failure,
render the `<ReducedScene>` component — a CSS 3D perspective transform showing
the before/after images with a simple scroll-driven reveal. Test on a Moto G
or Samsung Galaxy A13.

### RISK-002 · [PERF] · Three.js bundle size too large
**Risk:** `@react-three/fiber` + `@react-three/drei` + GSAP adds ~400kB to the
bundle if not tree-shaken, causing LCP to blow past the 3.5s mobile target.
**Mitigation:** Dynamically import the entire 3D scene (`React.lazy`). The hero
headline and subhead render from static HTML before the canvas loads. Verify
with `npm run build` + `rollup-plugin-visualizer` that the initial chunk is
under 150kB gzipped.

### RISK-003 · [ANIM] · iOS scroll inertia skips beats
**Risk:** iOS Safari's momentum scrolling can fire scroll events past a beat
boundary before the animation completes, leaving the scene in an intermediate state.
**Mitigation:** Use `fastScrollEnd: true` in GSAP ScrollTrigger config. Clamp
the beat index on the scene side — `Math.min(Math.max(beat, 0), 4)` — so an
overshoot never puts the yard in an impossible state. Test on iPhone 13 Safari.

### RISK-004 · [PERF] · Grass greening animation GPU spike on mobile
**Risk:** If the grass greening uses per-blade instanced mesh (the most impressive
option from RESEARCH.md), it may spike GPU usage on mobile causing dropped frames
or a browser hang.
**Mitigation:** Default to material color lerp (cheapest option) for Phase 2.
Only upgrade to vertex shader if color lerp looks unconvincing on desktop. Never
enable per-blade grass on mobile regardless of visual quality.

### RISK-005 · [UI] · Outfit font FOUT on first load
**Risk:** Outfit 700/800 takes ~300ms to load from Google Fonts, causing a flash
of Inter (fallback) before the headline renders in the correct font. On a slow
connection this is visually jarring.
**Mitigation:** Add `<link rel="preload" as="font">` for Outfit 700 and 800 in
`index.html`. Set `font-display: swap` in the `@import`. Optionally self-host
the font to avoid the Google Fonts cold request.

### RISK-006 · [ANIM] · Beat annotation and 3D scene out of sync
**Risk:** If the beat index from ScrollTrigger updates asynchronously (React state
flush timing), the 3D scene and the UI overlay annotations may briefly show
different beats — e.g., the yard is on Beat 3 but the annotation is still Beat 2.
**Mitigation:** Share beat state via a Zustand atom or a ref (not React state) so
both the scene and the overlay read the same value synchronously. Do not use two
separate scroll listeners.

### RISK-007 · [3D] · Drei `<Html>` labels fail depth sort on Safari
**Risk:** Drei's `<Html>` component uses `transform` CSS to position DOM elements
in 3D space. On Safari, `transform-style: preserve-3d` interactions with
`backdrop-filter` (which the labels use for `backdrop-blur`) can cause the labels
to render behind the canvas.
**Mitigation:** Set `zIndexRange={[10, 20]}` on the `<Html>` wrapper. If
`backdrop-blur` conflicts, switch the label background from `backdrop-blur-3xl`
to a solid `bg-zinc-950` on Safari (detect via `navigator.userAgent`).

### RISK-008 · [MOBILE] · Scene is too complex for mid-range Android
**Risk:** A mid-range Android device (Snapdragon 6xx, 3GB RAM) running the full
desktop scene may drop below 30fps, making the scroll-driven animation look janky.
**Mitigation:** Implement the mobile scene switch in Phase 2 (simplified geometry,
no normal maps, no `Environment` component). Gate it on `window.innerWidth < 768`
OR the `navigator.hardwareConcurrency < 4` heuristic. Test on a real mid-range
device, not just Chrome DevTools mobile emulation.

---

## Open Bugs

_None yet — project not started._

---

## Closed Bugs

_None yet._

---

## Categories

Use these tags when logging bugs:

| Tag | Scope |
|-----|-------|
| `[3D]` | Three.js scene, geometry, materials, shaders, canvas |
| `[ANIM]` | Scroll timing, GSAP, spring physics, beat sync |
| `[UI]` | Overlay panels, labels, nav, CTA, footer |
| `[PERF]` | LCP, TTI, bundle size, GPU usage, frame rate |
| `[MOBILE]` | Touch, iOS/Android fallbacks, safe-area, orientation |
| `[BRAND]` | Color, typography, spacing drift from design brief |
| `[A11Y]` | Reduced motion, keyboard nav, screen reader, contrast |
| `[BUILD]` | Vite config, Tailwind, TypeScript, deploy pipeline |
