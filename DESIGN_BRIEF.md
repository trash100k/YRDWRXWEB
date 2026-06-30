# "The Yard That Grows" — Design Brief

_Last updated: 2026-06-30_

This brief governs every visual and interaction decision on the marketing site.
When in doubt: look at the main app (`Yrdwrx/src/index.css`, `LiveEar.tsx`,
`CuttyGuideContext.tsx`) and match it exactly. The site and the app must feel
like the same world.

---

## Concept in One Sentence

A single residential yard — broken, overgrown, money left on the table — that
Cutty scans and transforms into a running business operation while you scroll.

---

## Brand System (Exact Tokens)

Pull these from `Yrdwrx/src/index.css`. Do not invent new values.

**Colors:**
```
--color-forest-500: #05A845   ← AI green, Cutty's color, "alive"
--color-forest-400: #2ad16a   ← label color, secondary green
--color-ember-500:  #E85D04   ← action, CTA, money, urgency
--color-forged:     #0B0C10   ← near-black background
--color-coldsteel:  #1F2833   ← elevated surfaces
zinc-950            #09090b   ← panel backgrounds
zinc-400            #a1a1aa   ← body text secondary
zinc-300            #d4d4d8   ← body text primary
white               #ffffff   ← headlines, emphasis
```

**Fonts:**
```
Outfit 700, 800    ← headlines, prices, CTA
Inter 400          ← body copy
JetBrains Mono     ← all labels (uppercase, tracking-[0.2em])
```

**Spacing/Shape:**
```
Panels:   rounded-[24px] or rounded-[32px] (match main app glass-card)
Buttons:  rounded-xl or rounded-2xl
Borders:  border border-white/10 (structural)
          border-forest-500/25 (AI/active state)
          border-ember-500 bottom only (molten-edge, CTAs)
```

---

## The Before State

The yard must feel like a real problem, not a joke version of neglect.

- Grass: dull grey-green (`#4a5a40`), uneven, visible bare patches near the driveway
- Hedges: dark, bulging past their box shape, asymmetric (one side longer than the other)
- Mulch beds: washed-out brown (`#6b4c2a`), faded, no definition at the edges
- Driveway edge: ragged, grass encroaching `~2 inches` onto the concrete
- Overall tone: desaturated, slightly overcast lighting, shadows from the wrong direction
- No glow, no forest-green, no ember — the palette is pure zinc before Beat 1

The before-state is what a landscaper sees when they pull up to a property that's
been neglected for 6 weeks. They should feel a slight professional irritation.
That's the right emotional entry point.

---

## The Cutty Reticle

Cutty is a **targeting ring**, not a face, not a cartoon, not a chat bubble.

**Exact spec (matches `CuttyGuideContext.tsx`):**
```
border-2 border-forest-500/30 rounded-2xl   ← outer ring
bg-forest-500/5 blur-xl rounded-2xl         ← inner glow
```

**Behavior:**
- Fades in on Beat 1 before the scan starts
- Locks onto each target element (hedge, bare patch, driveway edge, mulch bed)
- Pulses once on lock, then holds steady while the label blooms
- Tracks smoothly (200ms spring, not linear) — use `motion` spring with stiffness 320, damping 28
- Fades out at the end of Beat 5 (job is done, Cutty's work is complete)

Do not add text to the reticle. Do not make it a mascot character. The abstraction
is the point — Cutty is the intelligence behind the glass, not a personality in
front of it.

---

## Floating Label System (Beat 1 scan labels)

Labels bloom on the yard as the scan plane passes each target. These are DOM
overlays positioned in 3D space via Drei's `<Html>`.

**Style (exact match to Live Ear panel in main app):**
```
Container:  bg-zinc-950/95 border border-forest-500/25 rounded-[16px]
            backdrop-blur-3xl shadow-2xl px-3 py-2
Category:   text-[9px] font-black uppercase tracking-[0.2em] text-forest-400
            font-family: JetBrains Mono
Value:      text-[13px] font-bold text-white leading-tight
Detail:     text-[11px] text-zinc-400 leading-tight mt-0.5
```

**Examples (exact copy — must be landscaper-native):**
```
OVERGROWN HEDGE · 11 DAYS PAST SCHEDULE
  Estimated trim: 45 min — add to Thursday route

BARE PATCH · BACK LEFT CORNER
  Aerate + overseed recommended · $85 add-on

HOA EDGE VIOLATION · DRIVEWAY BORDER
  Must correct by Friday · 0.5" drift from curb

MULCH BEDS · FADED
  2 yards needed · $120 · can bundle with hedge job
```

Labels enter: `opacity: 0 → 1`, `y: +8px → 0`, spring 300ms
Labels exit on next beat: `opacity: 1 → 0`, `y: 0 → -4px`, 150ms

---

## Beat-by-Beat Visual Design

### Beat 0 (Load) — Before
- Scene renders with before-state materials
- Hero headline appears: `"This is your Tuesday."` — Outfit 800, ~72px, white
- Subhead fades in 400ms after: `"YardWorx sees every yard. Schedules every job. Collects every dollar."` — Inter 400, 18px, zinc-300
- Subtle scroll hint: small downward chevron, `text-forest-400`, gentle bounce animation
- No Cutty yet, no labels

### Beat 1 — Scan
- Cutty reticle fades in at center of yard
- Horizontal forest-green scan plane rises from ground (Y = 0 → max height, 800ms)
- As the plane crosses each grass section: material color lerps `#4a5a40 → #05A845`
  with a slight overshoot (goes to `#2ad16a` then settles to `#05A845`)
- Four labels bloom in sequence (100ms stagger): Overgrown Hedge, Bare Patch, HOA Edge, Mulch Beds
- Beat annotation enters from right: `"AI that actually sees the yard."` — context: Cutty's scan
- The lighting warms slightly (add a `PointLight` warm fill from upper-right as the grass greens)

### Beat 2 — Job Card
- A `<Html>` panel rises from the yard (Drei Float, gentle bobbing)
- Card content (matches the `glass-card` style from main app):
  ```
  SCOPE · JOHNSON PROPERTY · 847 Oak St
  ─────────────────────────────────
  Hedge trim (front + side)    $120
  Aerate — back lawn           $ 85
  Edge — driveway border       $ 40
  Mulch beds (2 yards)         $120
  ─────────────────────────────────
  TOTAL                        $365 + tax
  CREW                         2 members · 3.5 hrs
  SUGGESTED DATE               Thursday 9:00 AM
  ```
- Cutty reticle moves to hover over the card
- Beat annotation: `"Quote built in seconds. Not minutes."` — Outfit 700, white

### Beat 3 — Route
- A small 2D minimap appears bottom-left: `bg-zinc-950/90 border-forest-500/25 rounded-2xl`
- Three job pins appear (Johnson + 2 neighbors on Oak St)
- A glowing `forest-500` truck path draws between them with a 600ms line-drawing animation
- Small truck icon follows the path (simple box, not detailed)
- Beat annotation: `"Three jobs. One street. Route built automatically."` — Outfit 700

### Beat 4 — Invoice
- An invoice panel materializes (overlapping the job card slightly, same glass style)
- Shows: Invoice #1042, Johnson, $365, due on receipt
- An animated PAID stamp drops from above: `text-forest-500 border-4 border-forest-500 rounded-xl font-black uppercase tracking-widest`, rotate from 15° to 0°, spring physics
- A simulated SMS confirmation fades in below: `"Payment received: $365.00 — YardWorx"`
- Beat annotation: `"Paid before you left the driveway."` — Outfit 700

### Beat 5 — Crew Away
- The truck icon on the minimap begins moving (the route animates the truck along it)
- Two crew member pins drop with names: `"Marcus · En route"` and `"Dani · En route"`
- Cutty reticle pulses once, then gently fades out
- The yard stays in full-green after state — the job is done, it looks right
- Beat annotation fades, replaced by the **CTA card**

---

## CTA Card

This is the only sales moment on the page. It should feel earned, not pushy.

```
READY TO HELP
─────────────────────────────────
That took 8 seconds.
Your crew has the route.
Johnson has the invoice.
You're already on to the next job.

[Start free for 30 days →]     ← bg-forest-500 text-black font-bold, ember glow border
No credit card. No setup call.  ← text-zinc-400 text-sm below button
```

The card is `glass-card` style (`bg-zinc-950/40 backdrop-blur-xl border border-white/10 rounded-[32px]`)
with the `molten-edge` bottom border (`border-ember-500`).

---

## Navigation

Minimal. The nav must not compete with the 3D experience.

```
[Cutty reticle mark · YARDWORX]          [Sign in]  [Start free →]
```

- Nav is `glass-nav` style (`bg-black/80 backdrop-blur-2xl border-b border-white/5`)
- Logo: the Cutty reticle SVG (20px × 20px) + "YARDWORX" in Outfit 700, letter-spacing 0.05em
- "Sign in" — ghost, `text-zinc-400`, links to main app login
- "Start free →" — `bg-forest-500 text-black rounded-xl px-4 py-2 font-bold text-sm`
- Nav is always visible (fixed top) but low opacity (0.7) while the 3D scene is playing;
  rises to full opacity on Beat 5 / CTA section

---

## Motion Principles

Match the main app's physics exactly.

```
Spring config (from LiveEar.tsx): stiffness: 320, damping: 28
Beat transitions: 600ms spring
Label enter/exit: 300ms / 150ms spring
Cutty reticle lock: 200ms spring
Scan plane rise: 800ms linear (physical feel, not spring)
Truck route draw: 600ms ease-in-out
PAID stamp drop: 400ms spring with 15° rotate
```

**Never use linear easing for UI elements.** Linear reads as robotic. Spring reads as physical.

**Reduced motion (`prefers-reduced-motion: reduce`):** The 3D scene is replaced by
a static two-column layout: "before" image on the left, "after" image on the right,
with the 5 beat annotations listed as text below. The CTA is always visible. No
scroll-jacking, no animation.

---

## Do / Don't

| Do | Don't |
|----|-------|
| Use exact brand tokens from main app | Invent new colors or font sizes |
| Say "hedge trim," "aerate," "$380" | Say "service optimization," "$X00" round numbers |
| Earn the CTA with the beats | Show the CTA above the fold |
| Use Outfit 800 for headlines | Use a display font that isn't in the main app stack |
| Cutty is a reticle ring | Make Cutty a face, mascot, or chatbot bubble |
| The yard looks like a real job | The yard looks like a toy or a cartoon |
| One CTA, one destination | Multiple CTAs pointing different directions |
| Forest green = AI, Ember = action | Swap the color roles |
| Labels are JetBrains Mono, uppercase | Mix label styles across beats |
| Mobile scene is simplified, not removed | Show a broken 3D scene on mobile |
