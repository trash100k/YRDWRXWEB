# THE CINEMATIC TRANSFORMATION BIBLE
## "The Yard That Grows" — Complete Technical Research
### Part I: Rendering Pipeline, WebGL Fundamentals & React Three Fiber Architecture

_Last updated: 2026-06-30_
_Target: Avatar-quality, cinematic 3D morphing for the web_
_Stack: React Three Fiber · Three.js r168 · GSAP 3 · Tailwind v4 · Vite 8_

---

> This document is the single source of technical truth for building "The Yard That Grows"
> to cinematic quality. Every shader is written. Every system is architected. Every
> performance number is justified. Read this before touching a line of code.

---

## TABLE OF CONTENTS

**PART I — The Rendering Pipeline**
1. How the Browser Renders a 3D Frame
2. WebGL Fundamentals You Cannot Skip
3. Three.js Scene Graph Architecture
4. React Three Fiber — The Right Mental Model
5. The Render Loop and Frame Budget
6. Draw Calls: The Real Bottleneck
7. GPU Memory Architecture
8. The Full Stack for This Project

**PART II — Cinematic Lighting**
9. Physically Based Rendering Theory
10. The Yard's Lighting Rig
11. HDRI Environment Maps
12. Area Lights and Emissive Materials
13. Shadow Systems (PCF, PCSS, VSM)
14. Light Baking for Performance
15. The Before/After Lighting Transition

**PART III — Post-Processing Pipeline**
16. EffectComposer Architecture
17. Bloom — Selective Forest-Green Glow
18. Depth of Field (Bokeh DOF)
19. SSAO — Screen-Space Ambient Occlusion
20. Tone Mapping (ACES, Reinhard, Cineon)
21. Color Grading with LUTs
22. Film Grain and Noise
23. Chromatic Aberration for the Scan
24. Motion Blur on Beat Transitions
25. Vignette and Edge Darkening
26. The Complete Post Chain

**PART IV — The Material System**
27. MeshStandardMaterial In Depth
28. MeshPhysicalMaterial for Advanced Effects
29. Custom ShaderMaterial
30. The Texture Workflow
31. Texture Compression (KTX2, Basis Universal)
32. Material Morphing — How to Lerp Between States
33. The Before/After Material Swap

**PART V — The Grass System**
34. Why Grass Is Hard
35. InstancedMesh Architecture
36. The Grass Blade Vertex Shader
37. Wind Simulation
38. The Scan Plane Greening Uniform
39. LOD Strategy for Grass
40. Mobile Fallback — Billboard Quads

**PART VI — Shader Craftsmanship**
41. GLSL Fundamentals for the Build
42. The Full Scan Plane Shader
43. Dissolve and Reveal Shaders
44. Fresnel for the Cutty Glow
45. Noise Functions (Perlin, Simplex, FBM)
46. Vertex Deformation Patterns
47. Custom Attribute Animation

**PART VII — Scroll Architecture**
48. GSAP ScrollTrigger Deep Dive
49. The Sticky Canvas Pattern
50. Beat State Management
51. iOS Scroll Inertia Handling
52. Frame-Perfect Sync Between DOM and 3D

**PART VIII — Camera Cinematography**
53. Focal Length, FOV, and the Cinematic Feel
54. The Isometric-to-Cinematic Angle
55. Depth of Field as Storytelling
56. Camera Micro-Movement
57. The Reveal Shots
58. Animated Camera Paths

**PART IX — Performance Engineering**
59. The Performance Budget
60. Bundle Splitting for 3D
61. GPU Memory Management
62. The Mobile GPU Tier System
63. Instancing Everything
64. Frustum Culling
65. Profiling Tools
66. Target Numbers

**PART X — The Transformation Pipeline**
67. How All Systems Connect
68. The Beat State Machine
69. The Complete Render Pass Order
70. State Sync Between 3D and DOM

**PART XI — Beyond Scope (The 500-Page Expansion)**
71. WebGPU and Compute Shaders
72. Procedural Terrain Generation
73. Ray Marching and SDFs
74. Real-Time Global Illumination
75. The "Through the Lens" Act 2 Path
76. WebXR and AR Integration
77. ML in the Browser for Yard Analysis

---

# PART I: THE RENDERING PIPELINE

---

## Chapter 1: How the Browser Renders a 3D Frame

Understanding this sequence is the foundation of every performance and quality decision
in this build. Skip it and you will waste days optimizing the wrong thing.

### The Full Frame Pipeline

When React Three Fiber renders one frame of "The Yard That Grows," the following
sequence happens in order. Each step has a cost, and understanding the cost is
understanding the optimization target.

```
JavaScript (main thread)
  ↓
1. useFrame callbacks run — your animation code
2. Three.js processes scene graph dirty flags
3. Three.js serializes draw calls into WebGL command buffer

GPU Driver (still CPU side on most platforms)
  ↓
4. Driver validates state changes (shader programs, textures, buffers)
5. Driver compiles command buffer into hardware instructions
6. Driver submits work to GPU command queue

GPU
  ↓
7. Vertex Shader runs for every vertex in every visible mesh
8. Primitive Assembly (triangles from vertices)
9. Rasterization (triangles → fragments/pixels)
10. Fragment Shader runs for every visible pixel
11. Depth test — discard pixels behind existing geometry
12. Blending — transparent objects composited in order
13. Render target write — pixels hit the framebuffer

Compositor (OS)
  ↓
14. Browser composites the WebGL canvas with DOM elements
15. Display — the frame appears on screen
```

**The budget:** At 60fps you have 16.67ms per frame. At 30fps you have 33.3ms.
For a cinematic marketing site, targeting 60fps on desktop and 30fps on mobile is
the right ambition. The grass system is the most likely place to blow this budget.

### Where Time Gets Spent

Most developers assume the GPU is the bottleneck. Most of the time, they're wrong.
The actual bottleneck hierarchy for a Three.js scene like this one:

1. **JavaScript overhead** — React re-renders, useFrame logic, matrix recalculation
2. **CPU → GPU data transfer** — uploading new texture data, buffer updates per frame
3. **Draw call count** — each draw call has a fixed CPU cost of ~10-50μs
4. **Vertex processing** — only relevant with millions of vertices (grass can hit this)
5. **Fragment processing** — only relevant with very complex shaders or overdraw

For the yard scene specifically:
- The grass InstancedMesh will generate ~50,000 blades × 1 draw call = **1 draw call total** (this is why instancing is mandatory)
- The hedge geometry, house, driveway are static → **3-5 draw calls total**
- The DOM overlay labels are compositor layer, not WebGL
- Post-processing adds **1 draw call per pass** (6-8 passes for full quality)

Total draw call target: **under 20 per frame** including post-processing.

### The Two Threads That Matter

```
Main Thread                    Worker Thread (optional)
─────────────────────────────  ─────────────────────────
JavaScript execution           OffscreenCanvas rendering
GSAP ScrollTrigger              (not used for React Three Fiber)
React state updates
Three.js scene mutations
useFrame callbacks
```

React Three Fiber runs on the main thread. This is the primary constraint:
your `useFrame` callbacks must complete in under 4ms to leave budget for rendering.
Any heavy computation (pathfinding, noise generation, large array operations)
must be moved off the main thread via Web Workers or precomputed.

**For the grass wind shader:** All wind computation happens in the vertex shader
on the GPU. The CPU only uploads a single `uTime` uniform per frame. That is the
right architecture.

---

## Chapter 2: WebGL Fundamentals You Cannot Skip

You do not need to write raw WebGL for this project — Three.js handles it.
But you do need to understand the primitives because every Three.js concept
maps directly to a WebGL concept, and knowing the mapping lets you debug
at the right level.

### Buffers and Attributes

Every mesh in Three.js is ultimately a set of GPU buffers:

```javascript
// What Three.js creates under the hood for a PlaneGeometry(10, 10, 100, 100):
// (simplified — actual Three.js uses BufferGeometry)

// Position buffer: 3 floats per vertex (x, y, z)
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  // 101 * 101 = 10201 vertices, each with 3 floats
  -5, 0, -5,   // vertex 0
  -4.9, 0, -5, // vertex 1
  // ...
]), gl.STATIC_DRAW); // STATIC_DRAW = uploaded once, read many

// UV buffer: 2 floats per vertex (u, v)
// Normal buffer: 3 floats per vertex (nx, ny, nz)
// Index buffer: 3 ints per triangle (v0, v1, v2)
```

**The critical flag is `gl.STATIC_DRAW` vs `gl.DYNAMIC_DRAW`.**
- `STATIC_DRAW`: upload once, live on GPU. Hedges, house, driveway.
- `DYNAMIC_DRAW`: re-upload every frame or frequently. Use for morph targets,
  custom animated geometry. Three.js uses this when you set `geometry.attributes.position.needsUpdate = true`.

**For the grass blade greening effect:** We will NOT update the grass color
buffer every frame. Instead we pass a single `uScanY` uniform to the shader
and let the GPU decide each blade's color based on whether its base Y position
is below the scan plane. This is the difference between a GPU-computed effect
and a CPU-computed effect — orders of magnitude in performance.

### Shaders: Vertex and Fragment

Every rendered pixel in WebGL is the output of two shader programs:

**Vertex Shader** — runs once per vertex, outputs clip-space position:
```glsl
// Minimal vertex shader (Three.js default for MeshBasicMaterial)
attribute vec3 position;      // input: object-space position
attribute vec2 uv;            // input: texture coordinate
uniform mat4 modelViewMatrix; // input: object → camera space
uniform mat4 projectionMatrix; // input: camera → clip space
varying vec2 vUv;             // output to fragment shader

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**Fragment Shader** — runs once per visible pixel, outputs final color:
```glsl
// Minimal fragment shader
uniform sampler2D uTexture; // the grass texture
varying vec2 vUv;           // received from vertex shader

void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
```

The power of custom shaders is that every single operation is parallelized across
thousands of GPU cores. A grass field of 50,000 blades runs the vertex shader
for all blades simultaneously — not sequentially. This is why vertex shaders
can do complex wind math (sine waves, noise lookups, height-based bending)
without any CPU cost beyond uploading the `uTime` uniform.

### Uniforms, Attributes, and Varyings

These three communication channels govern everything between CPU and GPU and
between vertex and fragment shaders:

| Channel | Direction | Per | Example |
|---------|-----------|-----|---------|
| `uniform` | CPU → GPU | frame (all instances share) | `uTime`, `uScanY`, `uColor` |
| `attribute` | CPU → GPU | vertex (different per vertex) | `position`, `uv`, `bladeId` |
| `varying` | vertex → fragment | interpolated across triangle | `vUv`, `vWorldPos`, `vNormal` |

**For the grass scan effect:**
```glsl
// These three lines are the entire communication architecture
uniform float uScanY;    // CPU tells GPU where the scan plane is (0.0 to 1.0)
attribute vec3 position; // Each blade's base position (from InstancedMesh)
varying vec3 vWorldPos;  // Passed to fragment shader so it can check uScanY
```

### The Depth Buffer

The depth buffer (Z-buffer) is what makes 3D possible — it stores the depth of the
closest fragment at each pixel, and subsequent fragments are discarded if they're
farther away. This is automatic and generally invisible, but it creates two failure
modes that will appear in this project:

**Z-fighting:** Two surfaces at nearly the same depth flicker as floating-point
precision causes them to alternate in depth tests. This will happen if the grass
blades' bases are coplanar with the ground plane. Fix: offset the ground plane
slightly (move it to `y = -0.001`) or use `polygonOffset` on the material.

**Transparency sort order:** WebGL renders opaque objects front-to-back (fast),
but transparent objects must be rendered back-to-front (because blending depends
on what's already in the framebuffer). The label panels use `backdrop-filter` via
Drei's `<Html>` — they're DOM elements, not WebGL, so Three.js doesn't need to
sort them. But if any glass-effect geometry appears in the scene itself (like a
floating translucent card), it must be sorted or rendered with `depthWrite: false`.

### Framebuffers and Render Targets

Post-processing effects require rendering the scene to a texture first, then
processing that texture. This is done via `WebGLRenderTarget` in Three.js:

```javascript
// What the EffectComposer does internally:
const renderTarget = new THREE.WebGLRenderTarget(width, height);

// Pass 1: Render scene → renderTarget (not the screen)
renderer.setRenderTarget(renderTarget);
renderer.render(scene, camera);

// Pass 2: Read renderTarget.texture → bloom pass → output
renderer.setRenderTarget(null); // back to screen
bloomPass.render(renderer, renderTarget, null);
```

Each post-processing pass is a full-screen quad draw call reading from the previous
pass's output. Our full post chain will use 7 render targets. At 1920×1080 with
16-bit float pixels (for HDR), each render target is `1920 × 1080 × 4 × 2 = 16.6MB`.
Seven of them = **116MB of GPU RAM just for post-processing.** This is why mobile
uses a reduced chain (no SSAO, no DOF, simpler bloom).

---

## Chapter 3: Three.js Scene Graph Architecture

The scene graph is the tree of objects that Three.js renders. Understanding how
it affects performance and what to avoid is essential before writing a single component.

### The Object3D Hierarchy

```
Scene
├── AmbientLight
├── DirectionalLight (key light)
├── DirectionalLight (fill light)
├── PointLight (rim)
├── Group "yard"
│   ├── Mesh "ground"           ← PlaneGeometry, grass material
│   ├── InstancedMesh "grass"   ← 50,000 blade instances
│   ├── Group "hedges"
│   │   ├── Mesh "hedge-front"
│   │   ├── Mesh "hedge-left"
│   │   └── Mesh "hedge-right"
│   ├── Mesh "house"
│   ├── Mesh "driveway"
│   ├── Group "trees"
│   │   ├── Mesh "tree-1-trunk"
│   │   ├── Mesh "tree-1-canopy"
│   │   └── ...
│   └── Mesh "scanPlane"        ← invisible, just drives the uScanY uniform
├── Group "ui3d"
│   ├── Html "job-card"         ← Drei Html component
│   ├── Html "invoice-panel"
│   └── Html "minimap"
└── PerspectiveCamera
```

### Matrix Updates: The Silent Performance Killer

Every `Object3D` has a world matrix (4×4 float matrix) that transforms it from
object space to world space. By default, Three.js recomputes this matrix every
frame for every object in the scene — even objects that haven't moved.

```javascript
// Three.js does this every frame by default:
object.updateMatrix();        // recompute local matrix from position/rotation/scale
object.updateMatrixWorld();   // propagate to children
```

**Fix for static objects:** Once the hedge is placed, call:
```javascript
hedgeMesh.matrixAutoUpdate = false; // stop recomputing
hedgeMesh.updateMatrix();           // compute once, manually
```

For the yard scene, the only objects that move are:
- The scan plane (Y position changes during Beat 1) — keep `matrixAutoUpdate = true`
- The truck (moves along route during Beat 5) — keep `matrixAutoUpdate = true`
- The camera (if animated) — keep `matrixAutoUpdate = true`
- Everything else — **set `matrixAutoUpdate = false`**

This saves ~50 matrix multiplications per frame. At 60fps, that's 3,000 wasted
multiplications per second eliminated.

### Geometry: BufferGeometry and Memory Efficiency

All Three.js geometry is `BufferGeometry` under the hood. The key principles:

**Share geometry between identical meshes:**
```javascript
// Wrong: 100 cube meshes, each with their own geometry allocation
for (let i = 0; i < 100; i++) {
  const geo = new BoxGeometry(1, 1, 1); // 100 separate GPU uploads
  const mesh = new Mesh(geo, material);
}

// Right: one geometry, N meshes share it
const geo = new BoxGeometry(1, 1, 1); // 1 GPU upload
for (let i = 0; i < 100; i++) {
  const mesh = new Mesh(geo, material); // just different transforms
}

// Better: InstancedMesh for identical objects (1 draw call)
const instancedMesh = new InstancedMesh(geo, material, 100);
```

**Dispose geometry when done:**
```javascript
// In React Three Fiber, handle this in useEffect cleanup
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
    texture.dispose();
  };
}, []);
```

Three.js does NOT garbage-collect GPU resources automatically. A component that
remounts without disposing will leak GPU memory every time. For a marketing site
that may be left open in a tab for hours, this will cause progressive GPU memory
exhaustion and eventual tab crash.

### Materials: The Cost of Switching

**State changes are expensive.** Each time the renderer switches from one material
to another between draw calls, the GPU driver must:
1. Bind the new shader program
2. Upload new uniform values
3. Bind new textures

This cost is 10-100μs per switch. For the yard scene, minimize material switches
by grouping all meshes with the same material together in the scene graph. Three.js
sorts draw calls by material automatically, but manual organization helps.

**Material count target for the yard scene:**

| Material | Used by |
|----------|---------|
| `grassMaterial` (custom shader) | Ground plane + InstancedMesh |
| `hedgeMaterial` (MeshStandardMaterial) | 3 hedge meshes |
| `houseMaterial` (MeshStandardMaterial) | House mesh |
| `drivewaymaterial` (MeshStandardMaterial) | Driveway mesh |
| `treeTrunkMaterial` (MeshStandardMaterial) | 3 trunk meshes |
| `treeCanopyMaterial` (custom shader for SSS) | 3 canopy meshes |

**6 materials total** — reasonable. Key optimization: hedges, house, driveway,
and tree trunks could share a single `MeshStandardMaterial` with a texture atlas
if they use the same base roughness/metalness values. This would reduce materials
to 4 and eliminate 2 state switches per frame.

---

## Chapter 4: React Three Fiber — The Right Mental Model

React Three Fiber (R3F) is not "Three.js made easier." It is a declarative
React renderer for Three.js. The mental model shift required:

**Three.js imperative model:**
```javascript
// Procedural: you call functions, manage lifetime
const scene = new Scene();
const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({ color: '#05A845' });
const mesh = new Mesh(geometry, material);
scene.add(mesh);
// You must manually dispose when done
geometry.dispose();
material.dispose();
scene.remove(mesh);
```

**R3F declarative model:**
```jsx
// Declarative: React manages the Three.js object tree
function Hedge() {
  return (
    <mesh position={[0, 0.5, -3]}>
      <boxGeometry args={[4, 1, 0.8]} />
      <meshStandardMaterial color="#1a3a1a" roughness={0.8} />
    </mesh>
  );
}
// R3F handles creation, disposal, and scene add/remove
// When the component unmounts, R3F calls .dispose() automatically
```

### The R3F Render Loop

R3F runs its own render loop via `requestAnimationFrame`, completely separate
from React's render cycle. This is critical: **React re-renders and Three.js
renders are different things.**

```
React render (when props/state change)
  → R3F reconciler runs
  → Updates Three.js object properties (position, color, etc.)
  → Does NOT trigger a Three.js render immediately

R3F render loop (every frame via rAF)
  → Calls all useFrame callbacks
  → Then renders the Three.js scene
```

**Implication:** You should NOT update Three.js objects in React state if
you need every-frame animation. Use refs and the `useFrame` hook instead.

```jsx
// Wrong: State update → React re-render → R3F reconciler → Three.js update
// This is 3 steps when you want 1, and causes React to do work every frame
const [rotation, setRotation] = useState(0);
useFrame((state) => {
  setRotation(prev => prev + 0.01); // BAD: triggers React re-render every frame
});
return <mesh rotation-y={rotation} />;

// Right: Direct ref mutation in useFrame, zero React overhead
const meshRef = useRef();
useFrame((state, delta) => {
  meshRef.current.rotation.y += 0.01 * delta; // GOOD: direct mutation, no React
});
return <mesh ref={meshRef} />;
```

For "The Yard That Grows," the grass wind animation, scan plane movement,
and camera micro-movement all use this pattern. **Zero React state for animation.**

### The useFrame Hook and Its Priorities

`useFrame(callback, priority)` is how you hook into the R3F render loop.
Priority is an integer — lower numbers run first.

```jsx
// Recommended priority assignments for this project:
// -1: Input/scroll reading (read scroll position, update beat index)
//  0: Scene animation (default — most useFrame calls)
//  1: Camera updates (after scene animation settles)
//  2: Post-processing state (last, reads final scene state)

// Example: Read GSAP scroll progress, update beat state
useFrame(() => {
  beatRef.current = ScrollTrigger.getById('main').progress * 5; // 0-5
}, -1);

// Example: Animate scan plane based on beat
useFrame((state, delta) => {
  if (beatRef.current >= 1) {
    scanPlaneRef.current.position.y = MathUtils.lerp(
      scanPlaneRef.current.position.y,
      targetScanY,
      0.05
    );
  }
}, 0);
```

### The @react-three/drei Toolkit

Drei is the essential companion library. Key components for this project:

**`<Environment>`** — loads an HDRI and sets up environment mapping:
```jsx
<Environment files="/textures/overcast-sky.hdr" />
// This sets scene.environment AND scene.background simultaneously
// Every PBR material automatically picks up environment reflections
```

**`<Float>`** — makes objects gently bob without you writing sine wave code:
```jsx
<Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
  <Html>{jobCard}</Html>
</Float>
// The job card on Beat 2 should use this
```

**`<Html>`** — renders DOM inside the 3D scene with correct occlusion:
```jsx
<Html
  position={[0, 2, 0]}
  center
  occlude        // hides when behind geometry
  zIndexRange={[10, 20]}
  transform      // uses CSS 3D transform (better performance than DOM repositioning)
>
  <div className="job-card">...</div>
</Html>
```

**`<Text>`** — renders 3D text with MSDF (multi-channel signed distance field),
which looks crisp at any zoom level unlike texture-based text:
```jsx
<Text
  font="/fonts/Outfit-Bold.woff"
  fontSize={0.3}
  color="#05A845"
  anchorX="center"
  anchorY="middle"
>
  SCANNING PROPERTY
</Text>
// Use this for 3D labels that live IN the scene (not HTML overlays)
```

**`<PerformanceMonitor>`** — adjusts quality based on actual frame rate:
```jsx
<PerformanceMonitor
  onDecline={() => setDpr(0.75)} // lower pixel ratio when struggling
  onIncline={() => setDpr(1)}    // restore when stable
  factor={0.5}
  threshold={0.9}
/>
```

**`<Preload>`** — preloads all assets before the first render:
```jsx
<Suspense fallback={<LoadingScreen />}>
  <Preload all />
  <YardScene />
</Suspense>
```

**`<Stats>`** — development-only FPS counter:
```jsx
{process.env.NODE_ENV === 'development' && <Stats />}
```

### The Canvas Configuration

The `<Canvas>` component is the entry point. Getting its configuration right
affects every downstream performance and quality decision:

```jsx
<Canvas
  camera={{
    position: [8, 6, 10],   // 3/4 isometric angle
    fov: 45,                 // 45° for cinematic feel (not 75° which distorts)
    near: 0.1,
    far: 100,
  }}
  gl={{
    antialias: true,         // MSAA — smooth edges
    toneMapping: THREE.ACESFilmicToneMapping, // cinematic tone curve
    toneMappingExposure: 1.2, // slight overexposure for the "alive" look
    powerPreference: 'high-performance', // request dedicated GPU on hybrid systems
    alpha: false,            // no transparency needed — solid background
    stencil: false,          // not used — skip the stencil buffer allocation
    depth: true,             // needed for 3D
    logarithmicDepthBuffer: false, // only needed for huge scale ranges (not here)
  }}
  dpr={[1, 2]}              // min and max device pixel ratio — R3F picks based on perf
  shadows                    // enable shadow maps
  frameloop="demand"         // only render when invalidated (use "always" during dev)
>
```

**Critical: `frameloop="demand"` vs `"always"`**

- `"demand"`: Three.js only renders a frame when you call `invalidate()` or when props change.
  Correct for a scroll-driven site where nothing moves when the user isn't scrolling.
  Saves significant battery and CPU on mobile.
- `"always"`: Renders every frame regardless. Use only during development when debugging
  animations. Never ship with `"always"` on a marketing site.

```jsx
// When using "demand", you must invalidate when scroll updates happen:
// In your GSAP ScrollTrigger callback:
onUpdate: () => {
  invalidate(); // tells R3F to render next frame
}
```

---

## Chapter 5: The Render Loop and Frame Budget

The 16.67ms frame budget at 60fps must be allocated carefully. Here is the
budget breakdown for the full cinematic yard scene on a mid-range desktop GPU
(e.g., NVIDIA RTX 3060, Apple M2):

```
Frame Budget: 16.67ms total

CPU Side:
  useFrame callbacks (animation):      1.5ms
  Three.js scene graph update:         0.3ms
  Draw call submission (18 calls):     0.5ms
  React/DOM work:                      0.2ms
  GSAP scroll processing:              0.1ms
  Total CPU:                           2.6ms

GPU Side:
  Shadow map render passes (2):        1.0ms
  Main scene render:                   4.0ms
    Grass (50k instances):             1.5ms
    Scene geometry:                    0.5ms
    Transparent objects:               0.5ms
    Sky/environment:                   0.5ms
    Cutty reticle/labels:              0.5ms (DOM, not GPU)
    Lights:                            0.5ms
  Post-processing chain (7 passes):    6.0ms
    SSAO:                              1.5ms
    Bloom (3 passes):                  2.0ms
    DOF:                               1.5ms
    Color grading + grain:             0.5ms
    Composite:                         0.5ms
  Total GPU:                          11.0ms

Browser compositor:                    1.5ms
Vsync overhead:                        1.5ms

Total:                                16.6ms ← exactly on budget
```

**The scary number:** Post-processing takes 6ms — 36% of the entire frame budget.
This is why mobile uses a reduced post chain. If SSAO is the first thing cut
(1.5ms saved), that immediately buys the budget headroom needed for a mid-range
mobile GPU.

### Frame Budget for Mobile (Target: 30fps = 33.3ms)

```
Frame Budget: 33.3ms (2× looser, but mobile GPUs are 4-8× slower)

CPU Side:
  useFrame callbacks:                  1.5ms
  Three.js scene graph:                0.3ms
  Draw calls (14, reduced scene):      0.4ms
  Total CPU:                           2.2ms

GPU Side:
  Shadow map (1 pass, reduced res):    2.0ms
  Main scene (simplified geometry):    8.0ms
    Grass (billboard quads, 5k):       2.0ms
    Scene geometry (lower poly):       3.0ms
    Sky:                               1.0ms
    Lights:                            2.0ms
  Post-processing (3 passes only):     8.0ms
    Bloom (1 pass):                    3.0ms
    Tone mapping + LUT:                2.0ms
    Vignette:                          1.0ms
    Composite:                         2.0ms
  Total GPU:                          18.0ms

Browser compositor:                    4.0ms
Vsync overhead:                        1.5ms

Total:                                25.7ms ← 7.6ms headroom at 30fps
```

The 7.6ms headroom is important — it absorbs variability in the grass shader
and DOM compositing overhead when labels animate in.

---

## Chapter 6: Draw Calls: The Real Bottleneck

A draw call is a single `gl.drawElements()` or `gl.drawArraysInstanced()` GPU
command. Each call has overhead on the CPU side (~10-50μs) for driver state
validation. At 60fps, 100 draw calls = 1-5ms of CPU overhead — significant.

### Why InstancedMesh Is Non-Negotiable for Grass

Without instancing, 50,000 grass blades = 50,000 draw calls = 500ms-2500ms of
CPU overhead = impossible.

With `InstancedMesh`, 50,000 grass blades = **1 draw call** because the GPU runs
the vertex shader 50,000 times in parallel using instance data (position, rotation,
scale, color index per blade). The CPU only makes 1 call.

```javascript
// The difference, quantified:
// 50,000 individual Mesh objects:
// - 50,000 draw calls × 10μs = 500ms CPU overhead → 0.5 FPS
// - 50,000 × 500 bytes geometry = 25MB GPU RAM (extremely wasteful)

// 1 InstancedMesh with count=50000:
// - 1 draw call × 10μs = 0.01ms CPU overhead → negligible
// - 1 × 500 bytes geometry + 50000 × 64 bytes instance data = 3.2MB GPU RAM
// - Net speedup: 50,000×
```

```jsx
// The grass InstancedMesh setup in R3F:
function GrassField({ count = 50000 }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    // Set instance transforms (position, rotation, scale per blade)
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 20, // spread 20m × 20m
        0,
        (Math.random() - 0.5) * 20
      );
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.setScalar(0.5 + Math.random() * 0.5); // vary blade height
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <grassBladeGeometry /> {/* custom geometry — see Chapter 35 */}
      <grassBladeMaterial /> {/* custom shader — see Chapter 36 */}
    </instancedMesh>
  );
}
```

### Draw Call Budget for the Full Scene

```
Scene Draw Calls:
  1  Grass InstancedMesh
  1  Ground plane
  3  Hedge meshes (could be 1 with instancing)
  1  House
  1  Driveway
  3  Tree trunks (could be 1 with instancing)
  3  Tree canopies (could be 1 with instancing)
  1  Scan plane (invisible — only drives uniforms)
  1  Sky / environment
─────
 15  Scene total

Post-Processing Draw Calls:
  1  SSAO
  1  SSAO blur
  1  Bloom threshold
  1  Bloom horizontal blur
  1  Bloom vertical blur
  1  DOF (depth of field)
  1  Color grade + grain + vignette composite
─────
  7  Post total

Shadow Map Draw Calls:
  1  Shadow map for key light
─────
  1  Shadow total

TOTAL: 23 draw calls per frame
```

Target was under 20. We're at 23. Optimization options:
- Merge hedge meshes into InstancedMesh (saves 2 calls → 21)
- Merge tree geometry (trunks + canopies share a material) (saves 3 calls → 18 ✓)
- Or: skip shadow map on mobile entirely (saves 1 call)

**Final target: 18 draw calls on desktop, 12 on mobile.**

---

## Chapter 7: GPU Memory Architecture

GPU memory is a finite, shared resource (4-8GB on most GPUs, 1-2GB on integrated/mobile).
The full cinematic yard scene must fit within a 512MB GPU RAM budget to be safe across
all target hardware.

### Texture Memory Budget

Textures are the biggest consumers. Each texture's GPU RAM = `width × height × bytes_per_pixel`.

| Texture | Size | Format | GPU RAM |
|---------|------|--------|---------|
| Grass albedo (color) | 1024×1024 | BC3/DXT5 | 512KB |
| Grass normal map | 1024×1024 | BC5 | 512KB |
| Hedge albedo | 512×512 | BC3 | 128KB |
| Hedge normal | 512×512 | BC5 | 128KB |
| House albedo | 1024×1024 | BC3 | 512KB |
| Driveway albedo | 512×512 | BC3 | 128KB |
| HDRI environment | 2048×1024 | RGBE, 16-bit float | 16MB |
| LUT (color grade) | 32×32×32 | RGB, 16-bit | 196KB |
| Bloom render targets (3) | 960×540 | RGBA, 16-bit float | 3.9MB each |
| SSAO render target | 960×540 | R, 8-bit | 0.5MB |
| DOF render target | 1920×1080 | RGBA, 16-bit | 15.8MB |
| Shadow map | 2048×2048 | Depth, 32-bit | 16MB |
| Main render target (HDR) | 1920×1080 | RGBA, 16-bit float | 15.8MB |

**Total texture memory: ~85MB** — well within budget.

For mobile, reduce:
- HDRI to 1024×512 (4MB → saved 12MB)
- Shadow map to 1024×1024 (4MB → saved 12MB)
- Bloom render targets to 480×270 (1MB each → saved 8.7MB)
- Total mobile texture memory: ~50MB

### Geometry Memory Budget

| Geometry | Vertices | GPU RAM |
|----------|----------|---------|
| Grass blade (per instance) | 7 vertices × 32 bytes | 224 bytes |
| Grass instances data | 50,000 × 64 bytes | 3.2MB |
| Ground plane | 400 vertices | 12.8KB |
| Hedge (3 meshes) | 24 vertices each | 2.3KB |
| House | 50 vertices | 1.6KB |
| Tree trunk (3) | 32 vertices each | 3KB |
| Tree canopy (3) | 256 vertices each | 24KB |

**Total geometry memory: ~3.5MB** — negligible.

---

## Chapter 8: The Full Stack for This Project

```
Layer                  Package                    Purpose
─────────────────────────────────────────────────────────────────────
Framework              React 19                   Component model
Build                  Vite 8                     Dev server, bundler
3D Renderer            @react-three/fiber 8       R3F — React + Three.js
3D Helpers             @react-three/drei 9        Cameras, helpers, Html
3D Core                three 0.168                The Three.js engine
Post-Processing        @react-three/postprocessing Effects pipeline
                       postprocessing             Base effect library
Scroll Animation       gsap 3 + ScrollTrigger     Scroll-to-beat mapping
UI Animation           motion/react (framer)      DOM overlay animations
Shaders (utils)        glsl-noise                 Noise functions in GLSL
State                  zustand 5                  Beat state (shared 3D ↔ DOM)
Styling                tailwindcss 4              Brand tokens
Fonts                  @fontsource/outfit         Self-hosted font (no FOUT)
Perf Monitoring        @react-three/drei Stats    Dev FPS counter
3D Types               @types/three               TypeScript support
```

**Installation:**
```bash
npm create vite@latest yrdwrxweb -- --template react-ts
cd yrdwrxweb
npm install @react-three/fiber @react-three/drei three
npm install @react-three/postprocessing postprocessing
npm install gsap
npm install motion
npm install zustand
npm install tailwindcss @tailwindcss/vite
npm install @fontsource/outfit @fontsource/inter @fontsource/jetbrains-mono
npm install -D @types/three
```

**Vite config with R3F optimizations:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Pre-bundle Three.js — it has many submodules that slow cold starts
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
    ],
    // Exclude GSAP from pre-bundling (it handles its own chunking)
    exclude: ['gsap'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate chunk for the 3D world — loaded lazily
          'three-world': ['three', '@react-three/fiber', '@react-three/drei'],
          'postprocessing': ['@react-three/postprocessing', 'postprocessing'],
          'gsap': ['gsap'],
        },
      },
    },
  },
});
```

This chunking ensures the initial page load only delivers `react`, `motion`, and
the hero text. The `three-world` chunk (the 3D scene) loads while the user reads
the headline — by the time they scroll, it's ready.

---

# PART II: CINEMATIC LIGHTING

---

## Chapter 9: Physically Based Rendering Theory

PBR is the reason modern 3D looks believable. It is a set of equations that model
how light actually interacts with surfaces. Understanding the math makes you better
at configuring materials — you stop guessing and start knowing.

### The PBR Surface Model

Every PBR material describes how a surface reflects light using four key parameters:

**1. Albedo (Base Color):** The color of the surface in pure white light, with no
lighting calculation applied. For the grass before state: `#4a5a40` (dull grey-green).
For after: `#05A845` (YardWorx forest green). The albedo texture is an sRGB image —
Three.js automatically converts it to linear space for correct calculations.

**2. Roughness:** How microscopically uneven the surface is.
- `roughness = 0.0`: Mirror-like, perfect specular reflection (wet glass)
- `roughness = 0.5`: Satin, soft specular highlight (leaves after rain)
- `roughness = 1.0`: Fully diffuse, no specular at all (dry soil)

For the yard:
```
Grass (before):   roughness = 0.9  (dry, matte)
Grass (after):    roughness = 0.7  (slightly healthier, small specular on blades)
Hedge leaves:     roughness = 0.6  (waxy surface, more specular)
House wall:       roughness = 0.95 (matte paint, barely any specular)
Driveway:         roughness = 0.85 (rough concrete)
```

**3. Metalness:** Whether the surface is a metal or dielectric (non-metal).
- `metalness = 0.0`: Dielectric — plastic, wood, grass, skin, fabric
- `metalness = 1.0`: Metal — steel, aluminum, gold

For the yard, everything is `metalness = 0.0` — it's all organic and concrete.
The only exception might be the truck (Beat 5), which would have `metalness = 0.8`
for its painted steel body.

**4. Normal Map:** A texture that encodes microscopic surface bumps. The XYZ components
of each pixel represent a surface normal direction, offset from the geometric normal.
This fakes detailed surface geometry without adding vertices.

```
Normal map colors:
  (128, 128, 255) = straight up (no bump) — the neutral value
  (255, 128, 128) = tilted right
  (0, 128, 128)   = tilted left
  (128, 255, 128) = tilted forward
```

The grass normal map will encode individual blade-level micro-surface variation —
each blade has specular highlights that shift as the camera angle changes, which is
what gives grass that wet shimmer in sunlight.

### The Rendering Equation (Simplified)

What PBR computes for each pixel:

```
L_out = L_emissive + ∫(BRDF × L_in × cos(θ)) dω
```

In English: the light leaving a surface point = (any light the surface emits) +
(integral over all incoming light directions of: how much the surface reflects that
direction × how much light comes from that direction × Lambert's cosine law).

Three.js computes this integral with a sum over all light sources (approximation),
plus an environment map sample for ambient/reflective contribution. The `envMapIntensity`
parameter controls how strongly the environment map contributes — critical for the
HDRI lighting setup.

### BRDF: How Materials Reflect Light

The BRDF (Bidirectional Reflectance Distribution Function) has two components in Three.js:

**Diffuse (Lambertian):** Light scatters equally in all directions. All non-metals
have diffuse. Color of the diffuse term = albedo.

**Specular (Cook-Torrance):** Light reflects in a concentrated direction based on
roughness. The specular color for metals = albedo. For non-metals = always white
(controlled by roughness, but color is white).

```glsl
// Simplified Cook-Torrance specular in GLSL (what Three.js does internally):
vec3 specular = (D * G * F) / (4.0 * NdotL * NdotV);
// D = Normal Distribution Function (how aligned are the microfacets?)
// G = Geometry function (self-shadowing of microfacets)
// F = Fresnel equation (more reflection at grazing angles)
```

**The Fresnel Effect** is particularly important for this project. At grazing angles
(nearly horizontal viewing), surfaces become more reflective. This is why:
- The grass after the scan looks slightly shiny at its tips when viewed from below
- The driveway has subtle wet-look reflections at the edges of the camera's field
- The Cutty reticle uses Fresnel to make its glow stronger at the rim

The Fresnel term in the Cutty reticle shader will be:
```glsl
float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewDir)), 3.0);
// At 90° (grazing): 1.0^3 = 1.0 — full glow
// At 0° (facing camera): 0.0^3 = 0.0 — no glow
// This makes the ring brighter at its edges and dimmer in the center
```

---

## Chapter 10: The Yard's Lighting Rig

Cinema lighting for a 3D scene uses the same 3-point system as film photography.
The yard needs this system augmented with a sky component for outdoor believability.

### The 4-Light Rig

**Key Light (Primary):**
```jsx
<directionalLight
  position={[15, 20, 10]}   // upper-right, slightly in front
  intensity={2.5}
  color="#fffbf0"            // slightly warm — morning sun
  castShadow
  shadow-mapSize={[2048, 2048]}
  shadow-camera-near={0.1}
  shadow-camera-far={50}
  shadow-camera-left={-15}
  shadow-camera-right={15}
  shadow-camera-top={15}
  shadow-camera-bottom={-15}
  shadow-bias={-0.001}       // prevents shadow acne on flat surfaces
/>
```

The key light is the sun. Position at `[15, 20, 10]` creates shadows that fall
toward the camera (toward bottom-left from the viewer's perspective), which is
cinematically motivated — it tells a story that it's morning (sun at lower angle,
not noon overhead).

**Fill Light (Secondary):**
```jsx
<directionalLight
  position={[-10, 8, -5]}   // opposite side, lower, behind
  intensity={0.8}
  color="#c8e8ff"            // cool blue — sky fill
  castShadow={false}         // no shadow from fill light (doubles cost, minimal benefit)
/>
```

The fill light simulates light bouncing from the sky on the shadowed side of
the hedge and house. The cool temperature (`#c8e8ff`) contrasts with the warm
key light and creates the warm/cool shadow split that makes outdoor scenes
feel real.

**Rim Light (Backlight):**
```jsx
<pointLight
  position={[-5, 3, -15]}   // behind and below the scene
  intensity={1.5}
  color="#05A845"            // forest green — the "alive" light
  distance={30}
  decay={2}
/>
```

The rim light is the most important for brand identity. By making it forest-green,
it creates a green halo around the backs of the hedge, trees, and grass blades —
even in the before state. This is Cutty's presence, implied before it's made explicit.
It's subtle (`intensity={1.5}` against the key's `2.5`) but it makes the scene
unmistakably "YardWorx" even before the scan begins.

**Ambient Light:**
```jsx
<ambientLight intensity={0.3} color="#111111" />
// Very low — just enough to prevent pure black in shadow areas
// The environment map handles most of the ambient contribution
```

### Lighting Transition (Before → After)

During Beat 1, as the scan plane passes, the lighting should also shift:
- Key light warms from `#fffbf0` → `#fff5dc` (golden morning → bright afternoon)
- Rim light intensifies from `1.5` → `2.5` (the green glow gets stronger)
- Fill light cools slightly (the sky gets bluer as the scene "comes alive")

```jsx
// In useFrame during Beat 1:
const t = scanProgress; // 0 to 1 as scan completes
rimLightRef.current.intensity = THREE.MathUtils.lerp(1.5, 2.5, t);
rimLightRef.current.color.lerpColors(
  new THREE.Color('#05A845'),
  new THREE.Color('#2ad16a'),  // brighter green at full transform
  t
);
```

---

## Chapter 11: HDRI Environment Maps

An HDRI (High Dynamic Range Image) is a 360° photograph of a real environment
captured with true light intensities (not just 0-255 per channel, but full dynamic
range). Loading it into Three.js accomplishes two things simultaneously:

1. **Image-Based Lighting (IBL):** Every PBR material in the scene samples the
   HDRI for ambient/reflective light. A cloudy sky HDRI makes everything look
   like it was shot outdoors on an overcast day. A sunrise HDRI warms all the shadows.

2. **Background (optional):** The HDRI can also be the scene's sky background.
   For the yard, we'll use it for lighting but use a custom sky shader for the
   background (so we can control it precisely).

### Choosing the Right HDRI

For the before state: an overcast, slightly grey sky. This desaturates the scene
and makes everything look flat — which is exactly the emotional tone we want.
Source: `royal_esplanade_1k.hdr` from PolyHaven (CC0, free).

For the after state: a golden-hour sky with warm light direction matching the key
light. This makes the green grass pop against a warm-sky backdrop.
Source: `kloppenheim_06_1k.hdr` from PolyHaven (CC0, free).

```jsx
// Transition between two HDRIs during Beat 1:
// (Drei doesn't support this natively — we use a custom approach)

function EnvironmentTransition({ progress }) {
  const beforeEnv = useEnvironment({ files: '/hdri/overcast.hdr' });
  const afterEnv = useEnvironment({ files: '/hdri/golden-hour.hdr' });
  const { scene } = useThree();

  useFrame(() => {
    // Blend environment maps by swapping between them based on beat progress
    // A true blend requires a custom shader — for simplicity, we crossfade
    // the intensity of the existing environment while warming the rim light
    scene.environmentIntensity = THREE.MathUtils.lerp(0.8, 1.2, progress);
  });

  return <Environment map={progress > 0.5 ? afterEnv : beforeEnv} />;
}
```

For a proper HDRI blend (blending two cube maps pixel by pixel), a custom
`pmremGenerator` approach is needed — see Chapter 47 for the full shader.

### Resolution and Memory

| HDRI Resolution | Memory (RGBE float) | Quality |
|-----------------|---------------------|---------|
| 512×256 | 1MB | Usable for indoor scenes, clearly pixelated outdoors |
| 1024×512 | 4MB | Good for most cases — our mobile target |
| 2048×1024 | 16MB | Excellent — our desktop target |
| 4096×2048 | 64MB | Overkill for reflections, needed only for background |

The HDRI loads via Drei's `useEnvironment` hook which handles `PMREMGenerator`
pre-filtering automatically. Pre-filtering creates the blurred mip-maps needed
for roughness-based IBL.

---

## Chapter 12: Area Lights and Emissive Materials

Three.js does not natively support area lights in its real-time renderer because
they require integrating light over a surface, which is expensive. Two approaches:

### Approach 1: RectAreaLight (Three.js Built-in)
```jsx
<rectAreaLight
  position={[0, 4, 0]}
  width={6}
  height={4}
  intensity={5}
  color="#ffffff"
  lookAt={[0, 0, 0]}
/>
```

`RectAreaLight` works with `MeshStandardMaterial` and `MeshPhysicalMaterial`.
Cost: medium. Use for the illuminated job card in Beat 2 — it makes the card
look like it's self-illuminated from inside, casting soft light onto the grass below.

### Approach 2: Emissive Materials
For objects that glow (the scan plane indicator, the invoice PAID stamp glow):
```jsx
<meshStandardMaterial
  color="#05A845"
  emissive="#05A845"
  emissiveIntensity={2.0}   // > 1.0 is fine with HDR rendering
  roughness={0.3}
/>
```

Combined with bloom post-processing, any surface with `emissive` will glow
in screen space. The scan plane uses this:
- During scan: `emissiveIntensity` animates from 0 → 3 → 0 as the plane rises
- The bloom effect catches the spike at `intensity = 3` and creates a bright horizontal
  light beam sweeping across the yard

---

## Chapter 13: Shadow Systems

Shadows are computationally expensive and critically important for making the yard
scene feel like it's on real ground. Wrong shadows = the hedges look like they're
floating. Correct, soft shadows = the yard has weight and presence.

### Shadow Map Types in Three.js

**PCFSoftShadowMap (Recommended for this project):**
```javascript
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// PCF = Percentage Closer Filtering
// Samples the shadow map 4-16 times per pixel and averages
// Result: soft-edged shadows without ray tracing
// Cost: moderate (2-4× the cost of BasicShadowMap)
```

**VSMShadowMap (Variance Shadow Map):**
```javascript
renderer.shadowMap.type = THREE.VSMShadowMap;
// Uses variance instead of depth comparison
// Result: very soft shadows, but with light bleed in some cases
// Cost: similar to PCF but artifacts can appear at contacts
```

**BasicShadowMap:**
```javascript
renderer.shadowMap.type = THREE.BasicShadowMap;
// Hard-edged, pixelated shadows — the "Minecraft" look
// Cost: lowest
// Use only on mobile as a fallback
```

For the yard scene: **PCFSoftShadowMap** with `shadow-mapSize={[2048, 2048]}`.
This gives soft, believable shadows from the hedge onto the grass, from the
tree canopies onto the trunk, and from the house onto the adjacent ground.

### Shadow Bias Tuning

Shadow bias prevents "shadow acne" (dark stripes across surfaces that self-shadow
incorrectly due to floating-point precision):

```jsx
<directionalLight
  shadow-bias={-0.001}      // negative bias for surface contact shadows
  shadow-normalBias={0.02}  // additional bias along the normal (prevents wall artifacts)
/>
```

Tuning these values requires testing with your specific scene. Start at `-0.001`
and `-0.02` and adjust:
- Too little bias: shadow acne (dark stripes on lit surfaces)
- Too much bias: "Peter Panning" (shadows detached from their casters, objects float)

### Shadow Camera Frustum

The `DirectionalLight`'s shadow camera defines what region of the scene is shadowed.
It must be set to exactly contain the yard, not larger:

```jsx
<directionalLight
  shadow-camera-near={1}
  shadow-camera-far={40}
  shadow-camera-left={-12}
  shadow-camera-right={12}
  shadow-camera-top={12}
  shadow-camera-bottom={-12}
/>
```

**Why this matters:** The shadow map resolution (2048×2048) is distributed across
the shadow camera frustum. A frustum of `[-12, 12, 12, -12]` = 24m × 24m. At
2048 texels: `24m / 2048 = 0.0117m per texel = 1.17cm per shadow pixel`.
That gives us sub-centimeter shadow precision — the hedge shadow on the grass will
have crisp, soft edges. If we accidentally set the frustum to `[-100, 100]`, we'd
get `200m / 2048 = 9.7cm per texel` — blurry, boxy shadows.

---

## Chapter 14: Light Baking for Performance

For static scene elements (the house, driveway, the parts of the hedge that
don't change), we can pre-compute lighting as a lightmap texture. This eliminates
the real-time shadow calculation for those elements, which is a significant saving.

However, for "The Yard That Grows," light baking conflicts with the requirement
that lighting changes during the transformation (the rim light intensifies, the
HDRI transitions). **We will not bake lighting for this scene.** The dynamic
nature of the transformation requires fully dynamic lights.

The exception: the **house background**. The house is never part of a beat and
its lighting doesn't change dramatically. For mobile, bake the house's ambient
occlusion to a texture and disable real-time shadows for it.

---

## Chapter 15: The Before/After Lighting Transition

The full lighting transition from grey overgrown to green and alive:

```javascript
// Timeline keyed to Beat 1 progress (0 → 1)
function useLightingTransition(beatProgress) {
  useFrame(() => {
    const t = THREE.MathUtils.smoothstep(beatProgress, 0, 1);
    // smoothstep: ease in + ease out, more cinematic than linear

    // Key light: warms slightly
    keyLight.current.color.setRGB(
      THREE.MathUtils.lerp(1.0, 1.0, t),    // R: stays 1
      THREE.MathUtils.lerp(0.98, 0.96, t),  // G: slightly less green
      THREE.MathUtils.lerp(0.94, 0.86, t),  // B: more yellow/warm
    );
    keyLight.current.intensity = THREE.MathUtils.lerp(2.5, 3.0, t);

    // Rim light: intensifies, brighter green
    rimLight.current.intensity = THREE.MathUtils.lerp(1.5, 3.0, t);
    rimLight.current.color.setRGB(
      THREE.MathUtils.lerp(0.02, 0.08, t),  // R
      THREE.MathUtils.lerp(0.66, 0.85, t),  // G (forest to bright green)
      THREE.MathUtils.lerp(0.27, 0.40, t),  // B
    );

    // Ambient: slight increase (more sky light bouncing off green grass)
    ambientLight.current.intensity = THREE.MathUtils.lerp(0.3, 0.45, t);

    // Shadow softness: more detail visible after transform
    // (can't change PCFSoftShadowMap radius at runtime — this is a Three.js limitation)
    // Alternative: adjust shadow map bias slightly to sharpen contact shadows
    keyLight.current.shadow.bias = THREE.MathUtils.lerp(-0.001, -0.0005, t);
  });
}
```

---

# PART III: POST-PROCESSING PIPELINE

---

## Chapter 16: EffectComposer Architecture

Post-processing in Three.js routes the rendered image through a chain of full-screen
shader passes before it reaches the display. Each pass reads from a render target and
writes to another. The `@react-three/postprocessing` package wraps the `postprocessing`
library and integrates it cleanly with R3F.

### The Effect Chain Order (Non-Negotiable)

Order matters because each effect reads what the previous wrote:

```
1. Render scene → HDR render target
2. SSAO pass (reads depth buffer + normals)
3. Scene composite (combines SSAO with HDR)
4. Bloom threshold extraction
5. Bloom horizontal gaussian blur
6. Bloom vertical gaussian blur
7. Bloom additive composite (back onto scene)
8. Depth of Field (reads depth buffer)
9. Tone mapping (HDR → LDR)
10. Color grading via LUT
11. Chromatic aberration (subtle, on scan beat only)
12. Film grain + noise
13. Vignette
14. Output to display
```

Why this order:
- SSAO before bloom: otherwise dark AO areas bloom incorrectly
- Bloom before DOF: so DOF blurs already-bloomed glow correctly
- Tone mapping before LUT: the LUT is designed for LDR (0-1) values
- Grain after everything: grain should be on the final image, not affected by DOF/bloom
- Vignette last: vignette is applied to the final composed image

```jsx
// R3F implementation:
import { EffectComposer, SSAO, Bloom, DepthOfField, 
         ChromaticAberration, Vignette, Noise, LUT } from '@react-three/postprocessing';
import { BlendFunction, LUTCubeLoader } from 'postprocessing';

function PostProcessing({ beatIndex, scanProgress }) {
  const lut = useLoader(LUTCubeLoader, '/luts/cinematic-grade.cube');

  return (
    <EffectComposer multisampling={4}> {/* 4x MSAA on the composer */}
      <SSAO
        radius={0.3}
        intensity={20}
        luminanceInfluence={0.6}
        bias={0.03}
        resolutionScale={0.5} // render SSAO at half res for performance
      />
      <Bloom
        luminanceThreshold={0.7}  // only bloom pixels brighter than 0.7
        luminanceSmoothing={0.1}
        intensity={1.5}
        radius={0.8}
        mipmapBlur
      />
      <DepthOfField
        focusDistance={0.6}    // normalized, 0 = near, 1 = far
        focalLength={0.08}     // lens focal length, affects blur size
        bokehScale={4}
        height={480}
      />
      <ChromaticAberration
        offset={new THREE.Vector2(0.001 * scanProgress, 0)}
        radialModulation
        modulationOffset={0.2}
      />
      <LUT lut={lut} />
      <Noise opacity={0.03} premultiply />
      <Vignette offset={0.5} darkness={0.6} />
    </EffectComposer>
  );
}
```

### HDR Rendering Pipeline

For bloom and lighting to look physically correct, the scene must be rendered
in HDR (values above 1.0 are allowed in the render target). Three.js handles
this with:

```javascript
renderer.outputColorSpace = THREE.SRGBColorSpace; // correct sRGB output
renderer.toneMapping = THREE.ACESFilmicToneMapping; // compresses HDR to LDR
renderer.toneMappingExposure = 1.2;                // slight over-exposure
```

The bloom effect specifically requires HDR render targets because it uses the
luminance threshold (`luminanceThreshold={0.7}`) — values above 0.7 in HDR space
can be much brighter than 1.0, giving bloom precise control over what glows.
In LDR, everything is clamped to 1.0 and bloom doesn't know what's supposed to
glow vs what's just a bright surface.

---

## Chapter 17: Bloom — Selective Forest-Green Glow

Bloom is the most impactful single effect in the pipeline. Used correctly, it
makes the "alive" green feel like it's emitting light — like the grass is
photosynthetically active, not just painted green.

### How Bloom Works

```
1. Extract bright pixels: if pixel luminance > threshold → keep it, else black
2. Blur the extracted bright pixels with a large Gaussian blur (multiple passes)
3. Add the blurred result back to the original image
Result: bright areas appear to emit a soft glow
```

### Selective Bloom (Only Green Glows)

Standard bloom glows all bright things, including the white job card text and the
bright sky. We want ONLY the green elements to glow (grass, Cutty reticle, scan plane,
PAID stamp).

**Approach: Use emissive maps selectively.**

```jsx
// Grass material: emissive green (will bloom)
<meshStandardMaterial
  color="#05A845"
  emissive="#05A845"
  emissiveIntensity={0.5} // after scan; 0.0 before scan
/>

// Hedge material: NOT emissive (won't bloom)
<meshStandardMaterial
  color="#2d4a1e"
  emissive="#000000"      // no emissive
  emissiveIntensity={0}
/>

// Bloom threshold set above white reflections but catches emissive:
<Bloom luminanceThreshold={0.6} intensity={2.0} />
// Emissive grass at 0.5 intensity still exceeds 0.6 threshold
// because it's added to reflected light that may push it over
```

**Better approach: Bloom layer masking**

The `postprocessing` library supports layer-based selective bloom:

```javascript
// In Three.js, assign the grass mesh to layer 1
grassMesh.layers.enable(1);
cuttReticle.layers.enable(1);
scanPlane.layers.enable(1);

// EffectComposer renders layer 0 normally, applies bloom only to layer 1
// then composites them. This is the "selective bloom" pattern.
```

This is more complex to set up with R3F but gives perfect control. See the
`@react-three/postprocessing` selective bloom example in the GitHub repository.

### Bloom Parameters for the Yard

```javascript
// Before Beat 1 (before state):
luminanceThreshold = 0.9  // almost nothing blooms — very controlled
intensity = 0.5           // subtle glow from the rim light only

// During Beat 1 (scan active):
luminanceThreshold = 0.5  // scan plane and Cutty reticle bloom aggressively
intensity = 3.0           // dramatic, cinematic bloom on the scan line
// This creates the "green light sweeping across the yard" visual

// After Beat 1 (after state):
luminanceThreshold = 0.7  // moderate bloom on healthy grass
intensity = 1.5           // alive glow, not overwhelming
```

Animate these parameters with GSAP during the beats:
```javascript
gsap.to(bloomParams, {
  intensity: 3.0,
  duration: 0.8,
  ease: 'power2.out',
  onUpdate: () => invalidate()
});
```

---

## Chapter 18: Depth of Field (Bokeh DOF)

Depth of Field makes the scene look like it was shot with a real camera. Objects
outside the focal plane blur in a lens-characteristic way (circles of confusion, bokeh).
This directs the viewer's attention: blur the background, keep the job card sharp.

### DOF Parameters for Each Beat

```javascript
// Beat 0 (before state): slight DOF to establish cinematics
focusDistance = 0.5      // focused on the middle of the yard
bokehScale = 2           // moderate blur

// Beat 2 (job card floats up): pull focus to the job card
// Animate focusDistance from 0.5 → 0.3 (closer) to focus on card above yard
gsap.to(dofParams, { focusDistance: 0.3, bokehScale: 4, duration: 1.2 });

// Beat 4 (invoice): refocus on invoice panel (same depth as job card)
// Deepen bokeh slightly for invoice's "this is the important moment" feel
gsap.to(dofParams, { bokehScale: 6, duration: 0.8 });

// Beat 5 (crew drives away): wide DOF, everything sharp
// The yard is the focus — no single element, the whole scene is the subject
gsap.to(dofParams, { bokehScale: 1, duration: 1.5, ease: 'power1.inOut' });
```

### DOF and Performance

Full-quality DOF is expensive (it requires multiple blur samples per pixel with
depth-dependent weighting). The `postprocessing` library uses the `DepthOfFieldEffect`
which runs two separable blur passes with CoC (circle of confusion) computation.

On mobile, disable DOF entirely:
```jsx
{!isMobile && (
  <DepthOfField
    focusDistance={dofParams.focusDistance}
    bokehScale={dofParams.bokehScale}
  />
)}
```

---

## Chapter 19: SSAO — Screen-Space Ambient Occlusion

AO darkens crevices and contact areas where ambient light cannot easily reach.
Without it, the hedges where they touch the ground look like they're floating.
With it, there's a subtle darkening at the hedge/ground junction that gives
real physical grounding.

### How SSAO Works

For each pixel, SSAO samples the depth buffer at nearby locations. If nearby
pixels have geometry in front of the current pixel, it's likely in a crevice
and receives less ambient light → it gets darker.

```
Strong AO:                    Weak/No AO:
Hedge base touching ground    Hedge seems to hover above ground
  ↓ darker here               ↓ equally bright everywhere
[####]                        [####]
——————  ← dark band here      —————— ← no dark band, looks fake
```

### SSAO Parameters

```jsx
<SSAO
  radius={0.4}              // world-space radius of AO sampling hemisphere
  intensity={25}            // how dark the occlusion gets (crevice darkness)
  luminanceInfluence={0.5}  // bright surfaces are AO'd less
  bias={0.025}              // prevents self-occlusion on flat surfaces
  resolutionScale={0.5}     // render at half resolution, upsample (2× faster)
/>
```

For the yard, the most important AO contacts:
- Hedge base → ground (darkens the joint)
- Tree trunk → ground
- House wall → ground
- Individual grass blades → their neighbors (subtle, but adds to realism)

Note: SSAO does NOT work for the InstancedMesh grass blades against each other —
because SSAO works in screen space and grass blades are too small and numerous
for the depth buffer to capture their individual AO contribution. This is fine
for the yard: grass-to-grass AO would just make the grass look darker overall,
which is handled better by the before-state material color.

---

## Chapter 20: Tone Mapping

The scene is rendered in HDR (values can exceed 1.0). Tone mapping compresses
this into the LDR range (0–1) that displays can show. Different operators give
different aesthetics.

### Tone Mapping Operators

**Linear:** `LDR = HDR / (max + 1)` — flat, washed out. Never use.

**Reinhard:** `LDR = HDR / (HDR + 1)` — natural rolloff, slightly desaturated at
bright values. Classic look. Three.js: `THREE.ReinhardToneMapping`.

**ACES Filmic (Recommended):**
The Academy Color Encoding System curve used in motion picture production.
Slightly crushes shadows, significantly adds contrast to midtones, and
rolls off highlights gently. Makes the yard look "film-graded" by default.
Three.js: `THREE.ACESFilmicToneMapping`.

```javascript
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
// 1.2 exposure: the scene is slightly "overexposed" — this makes the green
// grass after the scan look like it's in direct sunlight, not just bright
```

**Cineon:** Approximates Kodak Cineon film stock. More saturated, richer blacks.
`THREE.CineonToneMapping` — interesting alternative if ACES looks too desaturated.

The ACES + `exposure = 1.2` combination is the correct choice for this project.
It makes the forest green look rich and alive without appearing cartoon-bright.

---

## Chapter 21: Color Grading with LUTs

A LUT (Look-Up Table) is a 3D texture that remaps input colors to output colors.
Loading a `.cube` file LUT lets you apply the exact same color grade as cinematic
film production pipelines.

### Creating the YardWorx LUT

The YardWorx LUT should:
- Push the green channel slightly (makes grass richer)
- Add a slight teal-to-shadows (cinematic "orange and teal" complementary split)
- Crush the blacks slightly (adds cinematic depth)
- Maintain the ember orange accurately (critical for CTA elements)

**Workflow:**
1. Take a screenshot of the yard scene at a representative beat
2. Open in DaVinci Resolve (free) or Adobe Photoshop Camera Raw
3. Adjust color grading to taste
4. Export as `.cube` LUT (DaVinci: File → Export LUT)
5. Load in Three.js:

```jsx
import { LUTCubeLoader } from 'postprocessing';
const lut = useLoader(LUTCubeLoader, '/luts/yardworx-grade.cube');
<LUT lut={lut} tetrahedralInterpolation /> // tetrahedralInterpolation = higher quality
```

The LUT is a 32×32×32 3D texture = 98,304 RGB values = ~300KB. Negligible.

---

## Chapter 22: Film Grain and Noise

Film grain is the visual noise present in analog film stock. Adding a subtle
digital noise to the final image makes it feel less "digital" and more cinematic.
It also breaks up the mathematical smoothness of rendered 3D, which otherwise
has an uncanny perfection that reads as "computer generated."

```jsx
<Noise
  premultiply={true}  // multiply noise into shadows only, not highlights
  blendFunction={BlendFunction.SOFT_LIGHT} // soft light blend = subtle
  opacity={0.04}      // 4% grain — perceptible but not distracting
/>
```

For the scan effect specifically, increase grain to `opacity = 0.12` during
Beat 1 — it makes the scan feel like a video-feed artifact, reinforcing the
"camera/lens" metaphor even in this version of the site.

---

## Chapter 23: Chromatic Aberration for the Scan

Chromatic aberration is a lens defect where different wavelengths of light
focus at slightly different distances, causing color fringing. It reads as
"shot through a real lens" when applied subtly.

For the scan beat (Beat 1), we increase CA dramatically:

```jsx
<ChromaticAberration
  offset={new THREE.Vector2(
    0.003 * Math.sin(time * 20) * scanProgress,  // horizontal — oscillates
    0.001 * scanProgress                          // vertical — constant offset
  )}
  radialModulation={true}  // stronger at edges, weaker at center (realistic)
  modulationOffset={0.2}
/>
```

The oscillating horizontal offset (`Math.sin(time * 20)`) creates a brief
"glitching" effect at the peak of the scan — the image very slightly separates
its RGB channels for 400ms, then snaps back to normal as the scan completes.
This is the visual "snap" moment where the before state becomes the after state.

---

## Chapter 24: Motion Blur on Beat Transitions

Between beats, when the scene changes state quickly, motion blur makes the
transition read as a camera motion event rather than an abrupt cut.

Three.js doesn't have built-in motion blur — it requires the `MotionBlurEffect`
from the `postprocessing` library, which tracks velocity buffers.

```jsx
import { MotionBlurEffect } from 'postprocessing';

// Only enable during beat transitions:
const motionBlur = useMemo(() => new MotionBlurEffect({
  intensity: 1,
  samples: 10,
}), []);

// Set intensity to 0 normally, ramp up during transitions
useFrame(() => {
  const transitionSpeed = Math.abs(beatProgress - lastBeatProgress.current) * 60;
  motionBlur.intensity = THREE.MathUtils.clamp(transitionSpeed * 0.5, 0, 0.8);
  lastBeatProgress.current = beatProgress;
});
```

Motion blur at `intensity = 0.8` during the truck movement in Beat 5 is
particularly impactful — the truck streaks as it rolls out, which reads as speed.

---

## Chapter 25: Vignette and Edge Darkening

A vignette darkens the edges of the frame, directing attention to the center.
Film lenses produce this naturally — simulating it makes the scene feel framed
by a camera.

```jsx
<Vignette
  offset={0.3}    // inner radius — starts darkening at 30% from center
  darkness={0.7}  // how dark the edges get
  eskil={false}   // false = radial falloff, true = more artistic oval
/>
```

For the CTA card section (after all beats), reduce the vignette:
```jsx
// When CTA is visible, open up the vignette (frame the whole scene, not just center)
offset={0.5}   // starts later — wider opening
darkness={0.4} // lighter edges — the scene is "opening up"
```

This tiny change signals "the experience is complete and the world is yours."

---

## Chapter 26: The Complete Post Chain — Implementation

```jsx
// PostProcessing.tsx — the full pipeline
export function PostProcessing({ beatIndex, scanProgress, beatTransition }) {
  const { isMobile, isLowEnd } = useDeviceTier();
  const lut = useLoader(LUTCubeLoader, '/luts/yardworx-grade.cube');
  const caOffset = useRef(new THREE.Vector2());

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    caOffset.current.set(
      0.003 * Math.sin(t * 20) * scanProgress * (beatIndex === 1 ? 1 : 0),
      0.001 * scanProgress * (beatIndex === 1 ? 1 : 0)
    );
  });

  if (isLowEnd) {
    // Minimum viable post for very old devices
    return (
      <EffectComposer>
        <Vignette offset={0.4} darkness={0.6} />
      </EffectComposer>
    );
  }

  if (isMobile) {
    // Mobile: bloom + tone + grain + vignette only
    return (
      <EffectComposer>
        <Bloom luminanceThreshold={0.7} intensity={1.2} mipmapBlur />
        <Noise premultiply opacity={0.03} blendFunction={BlendFunction.SOFT_LIGHT} />
        <Vignette offset={0.4} darkness={0.6} />
      </EffectComposer>
    );
  }

  // Desktop: full chain
  return (
    <EffectComposer multisampling={4}>
      <SSAO radius={0.3} intensity={20} luminanceInfluence={0.6} bias={0.025} resolutionScale={0.5} />
      <Bloom luminanceThreshold={0.65} luminanceSmoothing={0.1} intensity={1.5} radius={0.8} mipmapBlur />
      <DepthOfField focusDistance={0.5} focalLength={0.06} bokehScale={3} height={480} />
      <ChromaticAberration offset={caOffset.current} radialModulation modulationOffset={0.15} />
      <LUT lut={lut} tetrahedralInterpolation />
      <Noise premultiply opacity={beatIndex === 1 ? 0.08 : 0.03} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette offset={beatIndex >= 4 ? 0.5 : 0.35} darkness={beatIndex >= 4 ? 0.4 : 0.65} />
    </EffectComposer>
  );
}
```

---

# PART IV: THE MATERIAL SYSTEM

---

## Chapter 27: MeshStandardMaterial In Depth

`MeshStandardMaterial` is Three.js's default PBR material. It implements the
metallic-roughness workflow and responds to all light types and environment maps.

### Complete Property Reference

```javascript
const material = new THREE.MeshStandardMaterial({
  // Core PBR properties
  color: '#2d4a1e',           // albedo — the surface color
  roughness: 0.8,             // 0 (mirror) → 1 (matte)
  metalness: 0.0,             // 0 (dielectric) → 1 (metal)
  
  // Normal mapping
  normalMap: normalMapTexture,
  normalScale: new THREE.Vector2(1, 1), // strength in X and Y
  
  // Texture maps
  map: albedoTexture,         // albedo texture (replaces 'color' where textured)
  roughnessMap: roughnessTexture, // roughness per-texel
  metalnessMap: metalnessTexture, // metalness per-texel
  aoMap: aoTexture,           // ambient occlusion (pre-baked)
  aoMapIntensity: 1.0,        // 0 = no AO, 1 = full AO
  
  // Emissive (for glow)
  emissive: '#05A845',        // emissive color
  emissiveIntensity: 0.0,     // 0 = no glow, 2+ = very bright
  emissiveMap: emissiveTexture,
  
  // Transparency
  transparent: false,
  opacity: 1.0,
  alphaMap: null,
  alphaTest: 0.5,             // discard pixels below this alpha (for grass blades)
  
  // Environment
  envMapIntensity: 1.0,       // how much the HDRI contributes to reflections
  
  // Side rendering
  side: THREE.FrontSide,      // THREE.DoubleSide for transparent leaves
  
  // Shadow
  castShadow: true,
  receiveShadow: true,
  
  // Optimization
  dithering: true,            // reduces color banding in gradients
});
```

### Material Parameters for Each Yard Element

**Ground Plane (grass — before state):**
```javascript
{ color: '#4a5a40', roughness: 0.92, metalness: 0, emissive: '#000', emissiveIntensity: 0 }
```

**Ground Plane (grass — after state):**
```javascript
{ color: '#05A845', roughness: 0.78, metalness: 0, emissive: '#05A845', emissiveIntensity: 0.3 }
```

**Hedges:**
```javascript
{ color: '#1a3a1a', roughness: 0.75, metalness: 0, normalMap: hedgeNormal, normalScale: [0.8, 0.8] }
```

**House Wall:**
```javascript
{ color: '#c8bfa8', roughness: 0.95, metalness: 0 }
// Warm off-white — looks like painted stucco
```

**Driveway:**
```javascript
{ color: '#7a7a7a', roughness: 0.88, metalness: 0, normalMap: concreteNormal, normalScale: [0.5, 0.5] }
```

**Tree Trunk:**
```javascript
{ color: '#3d2b1a', roughness: 0.95, metalness: 0, normalMap: barkNormal, normalScale: [2.0, 2.0] }
// High normal scale — bark has deep ridges
```

**Tree Canopy:**
```javascript
{ color: '#1f3d0f', roughness: 0.7, metalness: 0, transparent: true, alphaTest: 0.5 }
// Semi-transparent for leaf edges — use alphaTest not opacity for performance
```

---

## Chapter 28: MeshPhysicalMaterial for Advanced Effects

`MeshPhysicalMaterial` extends `MeshStandardMaterial` with additional physically
accurate effects needed for the cinematic quality target.

### Key Advanced Properties

**Clearcoat** — a thin glossy layer over the surface (like a car varnish):
```javascript
clearcoat: 0.3,          // intensity of the clearcoat
clearcoatRoughness: 0.1, // how rough the clearcoat itself is
// Use on: hedge leaves (waxy surface), driveway (wet concrete reflection)
```

**Subsurface Scattering (SSS) / Transmission:**
```javascript
// Not available in MeshStandardMaterial — requires MeshPhysicalMaterial
transmission: 0.3,       // how much light passes through (0=opaque, 1=glass)
thickness: 0.5,          // thickness for SSS calculation
attenuationColor: '#1a5e08', // color of light as it passes through the material
attenuationDistance: 0.5,   // distance over which attenuation occurs
// Use on: grass blade tips (light bleeds through thin blades, creating SSS glow)
```

The SSS effect on grass blades is what makes real grass look alive — when
backlit, the tips of grass blades glow with transmitted light. Simulating this
in the after-state grass gives the yard its "alive" quality.

```jsx
// Grass blade material — after state:
<meshPhysicalMaterial
  color="#05A845"
  roughness={0.75}
  transmission={0.15}        // slight SSS on backlit blade tips
  thickness={0.02}           // very thin blades
  attenuationColor="#2ad16a"
  attenuationDistance={0.05}
  side={THREE.DoubleSide}    // blades seen from both sides
  alphaTest={0.5}
/>
```

**Iridescence** — wavelength-dependent color shift (oil-slick effect):
```javascript
iridescence: 0.2,
iridescenceIOR: 1.3,
iridescenceThicknessRange: [100, 400], // nm range
// Could be used subtly on dew-covered grass after transform
```

---

## Chapter 29: Custom ShaderMaterial

For the scan plane effect, grass greening, and Cutty reticle, we need shaders
that `MeshStandardMaterial` and `MeshPhysicalMaterial` cannot provide.
`ShaderMaterial` gives full control over the vertex and fragment shaders.

```javascript
const grassScanMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime:      { value: 0.0 },
    uScanY:     { value: -1.0 },   // Y position of scan plane, starts below ground
    uScanWidth: { value: 0.3 },    // thickness of the scan transition band
    uBeforeColor: { value: new THREE.Color('#4a5a40') },
    uAfterColor:  { value: new THREE.Color('#05A845') },
    uEmissiveStrength: { value: 0.0 },
  },
  vertexShader: GRASS_VERTEX_SHADER,   // Chapter 36
  fragmentShader: GRASS_FRAGMENT_SHADER, // Chapter 36
  side: THREE.DoubleSide,
});
```

The key challenge with `ShaderMaterial` is that it bypasses Three.js's built-in
PBR lighting. For the grass material, we want:
1. Custom scan coloring (requires custom shader)
2. PBR lighting response (requires PBR shader code)

Solution: use `MeshStandardMaterial.onBeforeCompile` to inject custom code
into Three.js's PBR shader, rather than writing from scratch.

---

## Chapter 30: The Texture Workflow

### Texture Sources for This Project

All textures should be PBR-consistent and royalty-free. Sources:
- **ambientCG.com** — all textures CC0, PBR packs with albedo/normal/roughness/AO
- **PolyHaven.com** — textures and HDRIs CC0, high quality
- **3dtextures.me** — CC0, stylized options for the low-poly aesthetic

### Texture Resolution Guidelines

| Surface | Albedo | Normal | Roughness |
|---------|--------|--------|-----------|
| Ground (grass) | 2048×2048 | 2048×2048 | — (in roughness channel) |
| Hedge leaves | 1024×1024 | 1024×1024 | — |
| Bark | 512×512 | 512×512 | — |
| Concrete | 1024×1024 | 1024×1024 | — |
| House wall | 512×512 | 512×512 | — |

**Pack roughness/metalness/AO into a single texture** (RGB channels):
- R: Ambient Occlusion
- G: Roughness
- B: Metalness (usually all 0 for this scene)

This reduces texture fetches from 3 per-fragment to 1, with no quality loss:
```javascript
material.roughnessMap = packedTexture;
material.metalnessMap = packedTexture;
material.aoMap = packedTexture;
// Three.js knows to read R/G/B channels respectively
```

### Texture Loading

```jsx
import { useTexture } from '@react-three/drei';

function GrassMaterial() {
  const [albedo, normal, packed] = useTexture([
    '/textures/grass-albedo.jpg',
    '/textures/grass-normal.jpg',
    '/textures/grass-packed.jpg', // R=AO, G=roughness, B=metalness
  ]);

  // Set correct color spaces
  albedo.colorSpace = THREE.SRGBColorSpace;   // albedo is sRGB
  normal.colorSpace = THREE.LinearSRGBColorSpace; // normal maps are LINEAR
  packed.colorSpace = THREE.LinearSRGBColorSpace; // roughness/AO are LINEAR

  // Tiling for ground plane
  [albedo, normal, packed].forEach(t => {
    t.repeat.set(8, 8); // tile 8× across the ground
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  });

  return (
    <meshStandardMaterial
      map={albedo}
      normalMap={normal}
      roughnessMap={packed}
      aoMap={packed}
      roughness={0.85}
    />
  );
}
```

---

## Chapter 31: Texture Compression (KTX2 / Basis Universal)

JPEG textures load fast over the network but must be decompressed and uploaded
to GPU RAM as uncompressed RGBA. A 2048×2048 JPEG that's 500KB becomes
16MB of GPU RAM after upload.

KTX2 with Basis Universal transcodes to a GPU-native compressed format:
- Desktop NVIDIA/AMD: BC1–BC7 (DXT)
- Apple Silicon/iOS: ASTC
- Android: ETC2 or ASTC

A 2048×2048 Basis-compressed texture = **4MB GPU RAM** (4× smaller than uncompressed).
For 8 textures, that's 64MB saved — significant for mobile.

```bash
# Convert textures to KTX2 with ktx-software:
basisu grass-albedo.png -output_file grass-albedo.ktx2 -uastc -uastc_level 2

# Or use gltf-transform (pipeline friendly):
gltf-transform etc1s input.glb output.glb  # smallest size
gltf-transform uastc input.glb output.glb  # highest quality
```

```jsx
// In R3F, use KTX2Loader from drei:
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

// The loader must be initialized with the renderer and the transcoder WASM:
const ktx2Loader = new KTX2Loader()
  .setTranscoderPath('/ktx2-transcoder/')  // WASM files location
  .detectSupport(renderer);               // auto-selects best format per device

// Then load:
ktx2Loader.load('/textures/grass-albedo.ktx2', (texture) => {
  grassMaterial.map = texture;
});
```

---

## Chapter 32: Material Morphing — How to Lerp Between States

The core visual transformation — grass going from grey to green — is a material
morph. There are three approaches, each with different tradeoffs:

### Approach 1: Color Uniform (Fast, Suitable)
```glsl
// In the fragment shader:
uniform float uScanProgress; // 0 → 1
uniform vec3 uColorBefore;   // #4a5a40
uniform vec3 uColorAfter;    // #05A845

void main() {
  float t = smoothstep(0.0, 1.0, uScanProgress);
  vec3 finalColor = mix(uColorBefore, uColorAfter, t);
  gl_FragColor = vec4(finalColor, 1.0);
}
```

This lerps the entire ground color simultaneously. Simple and fast, but doesn't
create the "wave" effect where the scan progresses spatially.

### Approach 2: Scan Plane Masking (Correct, Used for This Project)
```glsl
// The fragment shader reads world position and compares to scan plane Y:
varying vec3 vWorldPos;      // vertex shader outputs world position
uniform float uScanY;         // Y position of scan plane (moves up over time)
uniform float uScanBand;      // width of the transition band

void main() {
  // How far past the scan plane is this fragment?
  float scanDist = (vWorldPos.y - uScanY) / uScanBand;
  // -1 = fully behind scan (before color)
  //  0 = at the scan plane
  // +1 = fully ahead of scan (after color still before — not yet reached)
  
  // Transition: 0.0 (before) → 1.0 (after) as the scan passes
  float t = 1.0 - smoothstep(-1.0, 0.0, scanDist);
  
  vec3 finalColor = mix(uColorBefore, uColorAfter, t);
  
  // Add scan-edge glow: bright band right at the transition
  float scanGlow = exp(-abs(scanDist) * 8.0) * 2.0; // peak at scanDist=0
  finalColor += vec3(0.0, scanGlow, scanGlow * 0.5); // green-cyan glow
  
  gl_FragColor = vec4(finalColor, 1.0);
}
```

This creates a spatially-correct wave that tracks the scan plane position exactly.
The grass turns green from bottom to top as the scan plane rises.

### Approach 3: Texture Blend
For maximum visual quality, blend between two textures (dry grass and lush grass)
using the scan mask as the blend factor. Costs one extra texture fetch per fragment:

```glsl
uniform sampler2D uBeforeTexture; // dry grass albedo
uniform sampler2D uAfterTexture;  // lush grass albedo
uniform float uScanY;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  float t = 1.0 - smoothstep(-0.3, 0.1, (vWorldPos.y - uScanY));
  
  vec4 beforeColor = texture2D(uBeforeTexture, vUv);
  vec4 afterColor = texture2D(uAfterTexture, vUv);
  vec4 finalColor = mix(beforeColor, afterColor, t);
  
  // ... apply PBR lighting on finalColor
}
```

**Recommended:** Approach 2 for the ground plane, Approach 3 for the grass
InstancedMesh (which benefits from distinct before/after textures).

---

# PART V: THE GRASS SYSTEM

---

## Chapter 34: Why Grass Is Hard

Grass is the most technically complex element in the yard scene because:

1. **Count:** Realistic coverage requires 10,000–100,000 blades
2. **Motion:** Wind requires per-blade vertex animation
3. **LOD:** Distant blades must be simplified without popping artifacts
4. **Lighting:** Thin blades need double-sided rendering and SSS
5. **Transparency:** Alpha-tested edges for blade silhouettes
6. **The scan effect:** Each blade must know its position relative to the scan plane
7. **Performance:** All of the above must run at 60fps

The solution to (1) is `InstancedMesh`. The solution to (2), (5), and (6) is
a custom shader. The solution to (3) is LOD groups. The solution to (4) is
`MeshPhysicalMaterial` with transmission. The solution to (7) is all of the above.

---

## Chapter 35: InstancedMesh Architecture

A grass blade geometry is a set of 5-9 quads arranged in a cross or arc shape.
The cross shape (two quads perpendicular to each other) is the minimum for
3D-looking grass — it has volume from all camera angles.

```javascript
// GrassBladeGeometry — create once, used by all 50,000 instances
function createGrassBladeGeometry() {
  const geo = new THREE.BufferGeometry();
  
  // A cross-shaped blade: 2 quads at 90° to each other
  // Each quad: 4 vertices, 2 triangles
  // Total: 8 vertices, 12 indices per blade
  
  const positions = new Float32Array([
    // Quad 1 (front-back)
    -0.05, 0, 0,    // bottom-left
     0.05, 0, 0,    // bottom-right
    -0.02, 1, 0,    // top-left (slightly narrower at tip)
     0.02, 1, 0,    // top-right
    
    // Quad 2 (left-right, perpendicular)
     0, 0, -0.05,
     0, 0,  0.05,
     0, 1, -0.02,
     0, 1,  0.02,
  ]);
  
  const uvs = new Float32Array([
    // Quad 1 UVs (U = left/right, V = bottom/top of blade)
    0, 0,   1, 0,   0, 1,   1, 1,
    // Quad 2 UVs
    0, 0,   1, 0,   0, 1,   1, 1,
  ]);
  
  const normals = new Float32Array([
    // Quad 1 normals (face front)
    0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
    // Quad 2 normals (face left)
    1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
  ]);
  
  const indices = new Uint16Array([
    // Quad 1: two triangles
    0, 1, 2,   1, 3, 2,
    // Quad 2: two triangles  
    4, 5, 6,   5, 7, 6,
  ]);
  
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  
  // Add a custom attribute: blade phase (for random wind timing)
  const phases = new Float32Array(8); // 8 vertices
  const phase = Math.random() * Math.PI * 2;
  phases.fill(phase); // same phase for all vertices of this blade
  // Wait — for instanced mesh, this must be an instance attribute, not a vertex attribute
  
  return geo;
}
```

**Important correction for instanced grass:** The blade `phase` (random wind offset)
must be an **instance attribute** (one value per blade, not per vertex) rather than
a vertex attribute:

```javascript
// After creating the InstancedMesh:
const phases = new Float32Array(GRASS_COUNT);
for (let i = 0; i < GRASS_COUNT; i++) {
  phases[i] = Math.random() * Math.PI * 2;
}

grassMesh.geometry.setAttribute(
  'aPhase',
  new THREE.InstancedBufferAttribute(phases, 1) // 1 float per instance
);
```

---

## Chapter 36: The Grass Blade Vertex Shader

This is the heart of the grass system. Every blade's shape, wind response, and
color transition is computed here, in parallel, on the GPU.

```glsl
// GRASS_VERTEX_SHADER — full implementation

attribute float aPhase;       // per-instance random phase (wind timing offset)
attribute vec3 aBaseColor;    // per-instance color for variation (optional)

uniform float uTime;           // elapsed time (seconds)
uniform float uWindStrength;   // 0 = no wind, 1 = strong wind
uniform vec2 uWindDirection;   // normalized wind direction (XZ plane)
uniform float uScanY;          // Y of scan plane in world space
uniform float uScanBand;       // transition band width
uniform float uGrassHeight;    // maximum grass height (world units)

varying vec2 vUv;
varying vec3 vWorldPos;
varying float vBladeTip;       // 0 at base, 1 at tip (for tip-based effects)
varying float vScanT;          // 0 = before scan, 1 = after scan

void main() {
  vUv = uv;
  
  // vBladeTip: how far up the blade is this vertex? (from uv.y)
  vBladeTip = uv.y;
  
  // --- Wind Animation ---
  // Wind is stronger at the tip, zero at the base (physically correct)
  // Use multiple sine waves for organic non-repetitive motion
  float windFactor = vBladeTip * vBladeTip; // quadratic — tip bends 4× base
  
  float wave1 = sin(uTime * 1.5 + aPhase) * 0.12;          // primary sway
  float wave2 = sin(uTime * 2.3 + aPhase * 1.7) * 0.06;    // secondary ripple
  float wave3 = sin(uTime * 0.7 + aPhase * 3.1) * 0.04;    // slow drift
  
  float windBend = (wave1 + wave2 + wave3) * uWindStrength * windFactor;
  
  // Apply wind in the wind direction (XZ plane)
  vec3 windOffset = vec3(
    uWindDirection.x * windBend,
    0.0,                           // no vertical wind component
    uWindDirection.y * windBend
  );
  
  // --- World Position ---
  // modelMatrix transforms from object (blade) space to world space
  // This gives us the blade's world position for scan plane comparison
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  worldPosition.xyz += windOffset;
  
  vWorldPos = worldPosition.xyz;
  
  // --- Scan Plane Transition ---
  // How far is this vertex's base (Y=0 position) past the scan plane?
  // We use the instance's base Y (worldPosition.y - vBladeTip * uGrassHeight)
  float baseWorldY = worldPosition.y - vBladeTip * uGrassHeight;
  float scanDist = (baseWorldY - uScanY) / uScanBand;
  vScanT = 1.0 - smoothstep(-1.0, 0.2, scanDist);
  // vScanT = 1.0: this blade has been scanned (after state)
  // vScanT = 0.0: not yet reached by scan (before state)
  
  // --- After-Scan Height Growth ---
  // Blades grow slightly taller after the scan (healthier grass)
  // Only affects Y component, scales with tip position
  float growthBonus = vScanT * vBladeTip * 0.15; // 15% taller max
  
  // Final position
  vec3 finalPosition = worldPosition.xyz;
  finalPosition.y += growthBonus;
  
  vWorldPos = finalPosition;
  gl_Position = projectionMatrix * viewMatrix * vec4(finalPosition, 1.0);
}
```

```glsl
// GRASS_FRAGMENT_SHADER — full implementation

varying vec2 vUv;
varying vec3 vWorldPos;
varying float vBladeTip;
varying float vScanT;

uniform sampler2D uBeforeTexture;
uniform sampler2D uAfterTexture;
uniform float uTime;
uniform float uScanY;

// Lighting uniforms (simplified PBR — full version uses Three.js's built-in chunks)
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;

void main() {
  // --- Alpha Test ---
  // Blade silhouette: alpha is 1.0 in the center of the blade, 0.0 at edges
  // Simple solution: alpha = based on U distance from center
  float edgeDist = abs(vUv.x - 0.5) * 2.0; // 0 at center, 1 at edges
  float alpha = 1.0 - smoothstep(0.6, 0.9, edgeDist); // soft edges
  // Tip taper: blade narrows at the top
  alpha *= 1.0 - smoothstep(0.7, 1.0, vBladeTip);
  if (alpha < 0.5) discard; // alpha test
  
  // --- Color Blend ---
  vec4 beforeColor = texture2D(uBeforeTexture, vUv);
  vec4 afterColor = texture2D(uAfterTexture, vUv);
  vec3 baseColor = mix(beforeColor.rgb, afterColor.rgb, vScanT).rgb;
  
  // --- Scan Edge Glow ---
  // Bright green line at the exact scan plane position
  float scanEdge = vWorldPos.y - uScanY;
  float glowStrength = exp(-scanEdge * scanEdge * 20.0) * vScanT * (1.0 - smoothstep(0.0, 1.0, vScanT));
  baseColor += vec3(0.0, glowStrength * 2.0, glowStrength * 0.5);
  
  // --- Tip Brightening ---
  // Grass tips are lighter (more light exposure + SSS approximation)
  float tipBrightness = smoothstep(0.6, 1.0, vBladeTip) * 0.3;
  baseColor += baseColor * tipBrightness;
  
  // --- Simple Lambert Lighting ---
  // For the real project, use onBeforeCompile to inject into Three.js PBR
  // This is a simplified approximation for illustration
  float NdotL = max(dot(vBladeTip > 0.5 ? vec3(0, 1, 0) : vec3(0, -1, 0), normalize(uLightDir)), 0.0);
  vec3 litColor = baseColor * (uAmbient + uLightColor * NdotL);
  
  gl_FragColor = vec4(litColor, alpha);
}
```

---

## Chapter 37: Wind Simulation

The wind system must create organic, non-repetitive motion. A single sine wave
looks mechanical — like a flagpole animation, not a real field. Three techniques
compound to create realism:

### Technique 1: Multi-Frequency Waves (Already in Chapter 36)
Three sine waves at different frequencies and phases:
- 1.5 Hz: primary sway (visible, large)
- 2.3 Hz: secondary flutter (medium, adds life)
- 0.7 Hz: slow drift (subtle, organic base)

### Technique 2: Gust System (CPU → Shader)
Gusts are brief intensity spikes. In the vertex shader, `uWindStrength` is a
uniform that normally sits at 0.4. A CPU-side gust system spikes it to 1.0
every 3-8 seconds with a quick rise and slower fall:

```javascript
// CPU-side gust controller
class GustController {
  constructor() {
    this.strength = 0.4; // base wind
    this.nextGust = 3 + Math.random() * 5; // seconds until next gust
    this.elapsed = 0;
  }
  
  update(delta) {
    this.elapsed += delta;
    
    if (this.elapsed >= this.nextGust) {
      // Trigger gust: spike to 1.0 over 0.2s, decay over 1.5s
      gsap.to(this, {
        strength: 1.0,
        duration: 0.2,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(this, { strength: 0.4, duration: 1.5, ease: 'power1.in' });
        }
      });
      this.elapsed = 0;
      this.nextGust = 3 + Math.random() * 5;
    }
  }
}

// In useFrame:
useFrame((state, delta) => {
  gustController.update(delta);
  grassMaterial.uniforms.uWindStrength.value = gustController.strength;
});
```

### Technique 3: Directional Wind with Noise (Phase 2 Enhancement)

For Phase 2 of the build, replace the uniform wind direction with a noise-based
direction that slowly rotates. This requires a noise texture lookup in the vertex shader:

```glsl
// In vertex shader, use a noise texture for wind direction variation:
uniform sampler2D uWindNoise;
uniform float uTime;

// Sample noise at the grass base position + time
vec2 noiseCoord = vWorldPos.xz * 0.1 + uTime * 0.02; // slowly drifting noise
vec2 windDir = texture2D(uWindNoise, noiseCoord).rg * 2.0 - 1.0; // -1 to 1

float windBend = (wave1 + wave2 + wave3) * uWindStrength * windFactor;
vec3 windOffset = vec3(windDir.x * windBend, 0.0, windDir.y * windBend);
```

The noise texture is a 512×512 `GL_RG` format texture with slowly varying
direction vectors. This creates the natural "wind pressure wave" effect where
different parts of the field bend in slightly different directions simultaneously.

---

## Chapter 38: The Scan Plane Greening Uniform

The `uScanY` uniform is the most important single value in the entire grass shader.
It controls the spatial progress of the transformation and must be animated precisely.

```javascript
// In the scroll beat system:
// Beat 1 spans scroll progress 0.2 → 0.4 (of total page scroll)
// During this range, uScanY animates from -1.0 (below ground) to 3.0 (above max height)

function updateScanPlane(scrollProgress) {
  // Map overall scroll progress to beat 1 progress (0 → 1)
  const beat1Progress = THREE.MathUtils.inverseLerp(0.2, 0.4, scrollProgress);
  const clamped = THREE.MathUtils.clamp(beat1Progress, 0, 1);
  
  // Ease the scan — slow start, fast middle, slow end (cinematic)
  const eased = THREE.MathUtils.smoothstep(clamped, 0, 1);
  
  // Map 0→1 to world Y range: scan starts below ground, ends above grass tops
  const scanY = THREE.MathUtils.lerp(-0.5, 2.0, eased);
  
  grassMaterial.uniforms.uScanY.value = scanY;
  groundMaterial.uniforms.uScanY.value = scanY; // ground also transitions
}
```

The scan plane itself (the visible horizontal plane that moves through the yard)
is a separate invisible `Mesh` that acts as the ground truth Y position:

```jsx
<mesh ref={scanPlaneRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
  <planeGeometry args={[30, 30]} />
  <meshBasicMaterial />
</mesh>
```

Its `position.y` is updated in `useFrame`, and all materials that need `uScanY`
read `scanPlaneRef.current.position.y` each frame.

---

## Chapter 39: LOD Strategy for Grass

LOD (Level of Detail) reduces the polygon count for distant grass. The `THREE.LOD`
class handles this:

```javascript
// Grass LOD: 3 levels
const grassLOD = new THREE.LOD();

// Level 0: Full blade (within 15m) — 8 vertices, 4 quads per blade
// Level 1: Simple cross (15-30m) — 4 vertices, 2 quads per blade
// Level 2: Billboard quad (30m+) — 4 vertices, 1 quad per blade

grassLOD.addLevel(fullBladesMesh, 0);    // within 15m: full detail
grassLOD.addLevel(crossBladeMesh, 15);   // 15-30m: simpler
grassLOD.addLevel(billboardMesh, 30);    // 30m+: flat billboard
```

For the yard scene, the camera is fixed at a 3/4 angle approximately 12m from
the center of the yard. All grass is within the Level 0 range (15m). LOD is
primarily useful for:
- The minimap in Beat 3 (distant view — uses billboard grass)
- Mobile (uses billboard grass by default)

---

## Chapter 40: Mobile Fallback — Billboard Quads

On mobile, replace the full grass InstancedMesh with 5,000 billboard quads
(single planes that always face the camera). This is 10× fewer instances and
a much simpler shader.

```jsx
function MobilGrass({ count = 5000 }) {
  const billboardMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    map: grassBillboardTexture, // a pre-rendered texture of a grass patch
    transparent: true,
    alphaTest: 0.5,
    depthWrite: false,          // billboards don't write depth (avoids z-fighting)
    side: THREE.DoubleSide,
  }), []);

  // Update: rotate each billboard to face the camera
  useFrame(({ camera }) => {
    // BillboardInstancedMesh needs camera reference for rotation
    billboardMesh.current.lookAt(camera.position);
    // Or use Drei's <Billboard> component for individual billboards
  });

  return <instancedMesh ref={billboardMesh} args={[billboardGeo, billboardMaterial, count]} />;
}
```

The billboard grass texture is a 512×512 RGBA image of a small grass patch,
rendered from above with transparency. It looks adequate when used at density
(5,000 quads covering the ground) and costs a fraction of the full grass system.

---

_[Continued in CINEMATIC_RESEARCH_P2.md — Parts VI through XI]_

---

**Document status:** Part I (Chapters 1–40) complete.
**Next:** Part II begins with Chapter 41 — Shader Craftsmanship (full GLSL implementations)
through Chapter 77 — ML in the Browser.
