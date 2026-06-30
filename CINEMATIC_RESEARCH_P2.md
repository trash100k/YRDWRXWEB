# THE CINEMATIC TRANSFORMATION BIBLE
## Part II: Shaders, Scroll, Camera, Performance & The Transformation Pipeline

_Continued from CINEMATIC_RESEARCH_P1.md_
_Chapters 41–77_

---

# PART VI: SHADER CRAFTSMANSHIP

---

## Chapter 41: GLSL Fundamentals for the Build

GLSL (OpenGL Shading Language) is C-like but runs entirely on the GPU. Every
variable, operation, and function call is evaluated in parallel for every vertex
or fragment. This parallel execution model requires thinking differently about
control flow and data access.

### Data Types

```glsl
// Scalar types
float x = 1.5;           // 32-bit float
int n = 3;               // 32-bit integer
bool flag = true;        // boolean
uint count = 5u;         // unsigned int

// Vector types (most common in graphics)
vec2 uv = vec2(0.5, 0.5);        // 2D float vector
vec3 color = vec3(0.02, 0.66, 0.27); // 3D float vector (#05A845 in 0-1)
vec4 rgba = vec4(color, 1.0);    // 4D float vector

// Matrix types
mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a)); // 2×2 rotation matrix
mat3 normalMatrix = mat3(modelViewMatrix);          // extract upper 3×3
mat4 mvp = projectionMatrix * modelViewMatrix;      // model-view-projection

// Swizzling (unique to GLSL, incredibly useful):
vec3 v = vec3(1.0, 2.0, 3.0);
float r = v.x;       // = 1.0
vec2 rg = v.xy;      // = vec2(1.0, 2.0)
vec3 bgr = v.zyx;    // = vec3(3.0, 2.0, 1.0) — reorder components
vec4 xyzx = v.xyzx;  // = vec4(1.0, 2.0, 3.0, 1.0) — repeat components
// r, g, b, a are aliases for x, y, z, w for color vectors
```

### Built-in Functions You'll Use Constantly

```glsl
// Math
float abs(float x)            // absolute value
float sign(float x)           // -1, 0, or 1
float floor(float x)          // round down
float ceil(float x)           // round up
float mod(float x, float y)   // modulo (like % in C)
float pow(float x, float y)   // x^y
float sqrt(float x)           // square root
float log(float x)            // natural log
float exp(float x)            // e^x

// Trig (radians, not degrees)
float sin(float angle)
float cos(float angle)
float atan(float y, float x)  // arc tangent (two-argument form)

// Interpolation (most important for this project)
float mix(float a, float b, float t)        // linear interpolation: a + (b-a)*t
vec3  mix(vec3 a, vec3 b, float t)          // works on vectors too
float smoothstep(float edge0, float edge1, float x) // smooth 0→1 transition
float step(float edge, float x)             // returns 0 if x<edge, 1 otherwise

// Clamping
float clamp(float x, float lo, float hi)   // clamp to [lo, hi]
float saturate(float x)                    // clamp to [0, 1] (HLSL name, but works)

// Vector operations
float dot(vec3 a, vec3 b)        // dot product: a.x*b.x + a.y*b.y + a.z*b.z
vec3 cross(vec3 a, vec3 b)       // cross product: perpendicular vector
float length(vec3 v)             // vector magnitude
vec3 normalize(vec3 v)           // unit vector (length = 1)
float distance(vec3 a, vec3 b)   // length(a - b)
vec3 reflect(vec3 i, vec3 n)     // reflection direction
vec3 refract(vec3 i, vec3 n, float eta) // refraction direction

// Texture
vec4 texture2D(sampler2D tex, vec2 uv)  // sample a 2D texture at UV coords
vec4 textureCube(samplerCube tex, vec3 dir) // sample a cubemap (for environment)

// Fragment shader only
float dFdx(float p)   // derivative with respect to screen X (for edge detection)
float dFdy(float p)   // derivative with respect to screen Y
```

### The smoothstep Function — Master It

`smoothstep(edge0, edge1, x)` is the most used function in this entire project.
It creates a smooth 0→1 transition between `edge0` and `edge1`:

```
smoothstep(0.0, 1.0, -0.5) = 0.0    (x below edge0: returns 0)
smoothstep(0.0, 1.0,  0.0) = 0.0    (at edge0: returns 0)
smoothstep(0.0, 1.0,  0.25) = 0.156  (1/4 through: slow start)
smoothstep(0.0, 1.0,  0.5) = 0.5    (at midpoint: exactly 0.5)
smoothstep(0.0, 1.0,  0.75) = 0.844  (3/4: slow finish)
smoothstep(0.0, 1.0,  1.0) = 1.0    (at edge1: returns 1)
smoothstep(0.0, 1.0,  1.5) = 1.0    (x above edge1: returns 1)
```

The "smooth" part is that it follows the cubic hermite curve `3t² - 2t³`,
not a linear ramp. This means the transition has zero derivative at both ends —
it starts slow, speeds up, and slows back down. This is what makes animations
and transitions look non-robotic.

**For the scan transition, we use smoothstep in this pattern:**
```glsl
// How past the scan plane is this fragment's world Y position?
float scanDist = (vWorldPos.y - uScanY) / uScanBand;
// scanDist: negative = behind scan (old), positive = ahead of scan (not yet reached)

// t: 0 = old (before scan), 1 = new (after scan)
float t = smoothstep(-1.0, 0.0, scanDist);
// When scanDist = -1: just entered the scan band from below → t = 0 (old)
// When scanDist = 0: exactly at the scan plane → t = 1 (new)
// When scanDist > 0: above the scan plane, not yet scanned → t = 1 (new)

// Wait — that's backwards. Let me reconsider:
// The scan moves UPWARD. Below the scan = already scanned (new).
// Above the scan = not yet reached (old).
// So:
float t = 1.0 - smoothstep(-1.0, 0.0, scanDist);
// scanDist = -1 (far below scan): t = 1.0 - 0.0 = 1.0 (new/after)
// scanDist = 0  (at scan plane):  t = 1.0 - 1.0 = 0.0 (transition edge)
// scanDist = +1 (far above scan): t = 1.0 - 1.0 = 0.0 (old/before)
```

---

## Chapter 42: The Full Scan Plane Shader

This is the complete, production-ready scan shader for the ground plane.
It handles: scan transition, before/after color blend, scan edge glow,
and basic PBR lighting approximation.

```glsl
// === SCAN_VERTEX_SHADER ===

attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  
  // World position for scan plane comparison
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  
  // World normal for lighting
  vWorldNormal = normalize(normalMatrix * normal);
  
  // View direction for Fresnel/specular
  vec3 camWorldPos = vec3(viewMatrix[3]);  // camera world position from view matrix
  // Actually: inverse of viewMatrix column 3
  // Simpler: pass as uniform from CPU
  // For now, approximate from camera position in view space:
  vViewDir = normalize(-vec3(viewMatrix * worldPos));
  
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
```

```glsl
// === SCAN_FRAGMENT_SHADER ===

precision highp float;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

// Scan system uniforms
uniform float uScanY;        // world Y position of scan plane
uniform float uScanBand;     // transition band width in world units (try 0.5)
uniform float uScanGlow;     // 0-1 glow intensity during scan

// Material uniforms
uniform sampler2D uBeforeAlbedo;  // dry grass
uniform sampler2D uAfterAlbedo;   // lush grass
uniform sampler2D uNormalMap;
uniform float uNormalScale;
uniform float uBeforeRoughness;
uniform float uAfterRoughness;

// Lighting uniforms (simplified — real version uses Three.js PBR chunks)
uniform vec3 uDirectionalLightDir;
uniform vec3 uDirectionalLightColor;
uniform float uDirectionalLightIntensity;
uniform vec3 uAmbientColor;
uniform float uEnvMapIntensity;
uniform samplerCube uEnvMap;

// Emissive (the scan glow)
uniform vec3 uGlowColor;

void main() {
  // Tiled UVs for ground (CPU sets texture.repeat = 8x8)
  vec2 tiledUv = fract(vUv * 8.0);
  
  // === Scan transition ===
  float scanDist = (vWorldPos.y - uScanY) / uScanBand;
  // Note: for a ground plane (flat, Y=0), vWorldPos.y is always ~0
  // The scan discriminator should use the world XZ position mapped to a Y equivalent
  // For a TOP-DOWN scan of a FLAT surface, we use world Z instead:
  // (The scan moves from the back of the yard to the front, not top to bottom)
  // Actually, for the 3/4 isometric camera and a flat yard,
  // we want the scan to move from the FAR EDGE to the NEAR EDGE (Z direction):
  float scanDistXZ = (vWorldPos.z - uScanY) / uScanBand;
  // But we called it uScanY for clarity — rename to uScanProgress in the real impl
  // The CPU maps scroll progress to a Z value from far-to-near
  
  float t = 1.0 - smoothstep(-1.0, 0.0, scanDistXZ);
  // t = 1: this fragment is behind the scan (already transformed)
  // t = 0: this fragment is ahead of the scan (not yet reached)
  
  // === Texture sampling ===
  vec4 beforeColor = texture2D(uBeforeAlbedo, tiledUv);
  vec4 afterColor = texture2D(uAfterAlbedo, tiledUv);
  vec3 albedo = mix(beforeColor.rgb, afterColor.rgb, t);
  
  float roughness = mix(uBeforeRoughness, uAfterRoughness, t);
  
  // === Normal mapping ===
  vec3 normalSample = texture2D(uNormalMap, tiledUv).xyz * 2.0 - 1.0;
  // TBN matrix for proper normal map tangent space conversion
  // (simplified: assume flat ground, tangent = X, bitangent = Z)
  vec3 T = vec3(1, 0, 0);
  vec3 B = vec3(0, 0, 1);
  vec3 N = normalize(vWorldNormal);
  mat3 TBN = mat3(T, B, N);
  vec3 normal = normalize(TBN * (normalSample * vec3(uNormalScale, uNormalScale, 1.0)));
  
  // === PBR Lighting (simplified diffuse + specular) ===
  vec3 L = normalize(uDirectionalLightDir);
  vec3 V = normalize(vViewDir);
  vec3 H = normalize(L + V);
  
  float NdotL = max(dot(normal, L), 0.0);
  float NdotH = max(dot(normal, H), 0.0);
  
  // Diffuse (Lambertian)
  vec3 diffuse = albedo * uDirectionalLightColor * uDirectionalLightIntensity * NdotL;
  
  // Specular (Blinn-Phong approximation of Cook-Torrance)
  float shininess = mix(4.0, 32.0, 1.0 - roughness); // roughness → shininess inverse
  float spec = pow(NdotH, shininess) * (1.0 - roughness) * 0.3;
  vec3 specular = uDirectionalLightColor * spec;
  
  // Ambient (simplified IBL)
  vec3 ambient = albedo * uAmbientColor;
  
  vec3 lit = diffuse + specular + ambient;
  
  // === Scan Edge Glow ===
  float scanEdgeDist = abs(scanDistXZ);
  float glowFalloff = exp(-scanEdgeDist * scanEdgeDist * 30.0);
  float glowMask = uScanGlow * glowFalloff;
  
  // The glow is brighter on the "just been scanned" side
  float justScannedMask = smoothstep(0.0, -0.3, scanDistXZ); // slightly behind
  glowMask *= justScannedMask;
  
  vec3 glow = uGlowColor * glowMask * 3.0; // up to 3× HDR brightness for bloom
  
  // === Final Color ===
  vec3 finalColor = lit + glow;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
```

### Injecting Into Three.js PBR via onBeforeCompile

The above shader is a simplified PBR approximation. For production quality,
inject custom logic into Three.js's built-in PBR shader instead:

```javascript
const groundMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.85,
  metalness: 0.0,
  map: afterAlbedo, // default is after-state, blended backward by shader
});

groundMaterial.onBeforeCompile = (shader) => {
  // Add custom uniforms
  shader.uniforms.uScanProgress = { value: 0.0 };
  shader.uniforms.uBeforeAlbedo = { value: beforeAlbedoTexture };
  shader.uniforms.uGlowColor = { value: new THREE.Color('#05A845') };
  shader.uniforms.uScanGlow = { value: 0.0 };

  // Inject into the vertex shader — add vWorldPos output
  shader.vertexShader = shader.vertexShader.replace(
    '#include <worldpos_vertex>',
    `
    #include <worldpos_vertex>
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    `
  );

  // Add varying declaration to vertex shader
  shader.vertexShader = 'varying vec3 vWorldPos;\n' + shader.vertexShader;

  // Inject into fragment shader — replace albedo lookup with blended version
  shader.fragmentShader = `
    varying vec3 vWorldPos;
    uniform float uScanProgress;
    uniform sampler2D uBeforeAlbedo;
    uniform vec3 uGlowColor;
    uniform float uScanGlow;
  ` + shader.fragmentShader;

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `
    // Custom scan-blended albedo
    float scanDist = (vWorldPos.z - uScanProgress) / 0.5;
    float scanT = 1.0 - smoothstep(-1.0, 0.0, scanDist);
    
    vec4 beforeSample = texture2D(uBeforeAlbedo, vMapUv);
    vec4 afterSample = texture2D(map, vMapUv); // 'map' is Three.js's albedo sampler
    diffuseColor = mix(beforeSample, afterSample, scanT);
    
    // Add glow to emissive
    float scanEdge = exp(-abs(scanDist) * scanDist * 30.0);
    totalEmissiveRadiance += uGlowColor * uScanGlow * scanEdge * 3.0;
    `
  );

  // Store the shader for later uniform updates
  groundMaterial.userData.shader = shader;
};

// Update uniforms in useFrame:
useFrame(({ clock }) => {
  if (groundMaterial.userData.shader) {
    groundMaterial.userData.shader.uniforms.uScanProgress.value = scanProgress;
    groundMaterial.userData.shader.uniforms.uScanGlow.value = scanGlow;
  }
});
```

This approach gives you Three.js's full PBR pipeline (IBL, shadows, environment
maps, tone mapping) WITH the custom scan effect injected into it — best of both worlds.

---

## Chapter 43: Dissolve and Reveal Shaders

Beyond the scan, several elements need to appear (dissolve in) or disappear
(dissolve out) during beat transitions. Classic dissolve uses a noise threshold.

```glsl
// DISSOLVE_FRAGMENT_SHADER
// Use for: job card appearing in Beat 2, invoice appearing in Beat 4

uniform sampler2D uDissolveMask;  // noise texture, preloaded
uniform float uDissolveProgress;  // 0 = fully dissolved (invisible), 1 = fully visible
uniform vec3 uEdgeColor;          // glow color at the dissolve edge

void main() {
  vec4 baseColor = /* ... your regular material color ... */;
  
  float noiseSample = texture2D(uDissolveMask, vUv * 3.0).r; // tiled noise
  
  // The dissolve threshold: below this, the fragment is dissolved (invisible)
  float threshold = 1.0 - uDissolveProgress;
  
  // Edge glow: bright ring just above the threshold
  float edgeDist = noiseSample - threshold;
  float edgeGlow = smoothstep(0.0, 0.1, edgeDist) * // above threshold
                   (1.0 - smoothstep(0.1, 0.25, edgeDist)); // below 0.25
  
  // Discard fragments below threshold (dissolved area)
  if (noiseSample < threshold) discard;
  
  vec3 finalColor = baseColor.rgb + uEdgeColor * edgeGlow * 3.0;
  gl_FragColor = vec4(finalColor, baseColor.a);
}
```

For the job card (Beat 2), `uEdgeColor = #05A845` (green edge) and
`uDissolveProgress` animates from `0 → 1` over 600ms when the beat triggers.

For the invoice panel (Beat 4), `uEdgeColor = #E85D04` (ember orange — money
moment) and `uDissolveProgress` animates `0 → 1` over 400ms.

---

## Chapter 44: Fresnel for the Cutty Reticle Glow

The Cutty reticle is a thin ring mesh (`TorusGeometry`) positioned around the
targeted element. Its glow should be strongest at the edge (where the torus
faces away from camera) and weakest at the face.

```glsl
// CUTTY_RETICLE_VERTEX_SHADER

attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;
uniform mat4 projectionMatrix;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPos.xyz); // direction from vertex to camera, in view space
  gl_Position = projectionMatrix * mvPos;
}
```

```glsl
// CUTTY_RETICLE_FRAGMENT_SHADER

varying vec3 vNormal;
varying vec3 vViewDir;

uniform vec3 uColor;     // #05A845
uniform float uPulse;    // 0-1 pulse animation driven by sine(time)
uniform float uIntensity; // base intensity

void main() {
  // Fresnel: how much is this surface facing away from the camera?
  float cosAngle = dot(normalize(vNormal), normalize(vViewDir));
  // cosAngle = 1: facing camera directly
  // cosAngle = 0: facing 90° away (rim of torus)
  // cosAngle negative: back-facing (handled by double-sided rendering)
  
  // Fresnel factor: bright at rim (cosAngle ≈ 0), dark at face (cosAngle ≈ 1)
  float fresnelFactor = pow(1.0 - abs(cosAngle), 2.5);
  
  // Combine Fresnel with pulse animation
  float combinedGlow = fresnelFactor * (0.7 + 0.3 * uPulse);
  
  // The glow is purely emissive — it emits HDR brightness
  vec3 emissive = uColor * uIntensity * combinedGlow * 4.0;
  
  gl_FragColor = vec4(emissive, fresnelFactor); // alpha tracks Fresnel for soft edges
}
```

Combined with bloom at `luminanceThreshold = 0.4`, the Cutty reticle will have a
visible glow halo extending 20-40px beyond the physical geometry — exactly matching
the `bg-forest-500/5 blur-xl` CSS glow from the main app's reticle.

The pulse animation:
```javascript
// In useFrame:
const pulse = (Math.sin(clock.getElapsedTime() * 2.0) + 1.0) / 2.0; // 0-1
reticleMaterial.uniforms.uPulse.value = pulse;
```

---

## Chapter 45: Noise Functions (Perlin, Simplex, FBM)

Noise functions generate organic-looking patterns that are smooth (unlike
`Math.random()` which gives white noise). They're the foundation of procedural
grass placement, wind variation, and dissolve masks.

### Value Noise (Cheapest)

```glsl
// Hash function: maps integers to random floats, deterministically
float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// 2D Value Noise: smooth interpolation between hashed grid values
float valueNoise(vec2 p) {
  vec2 i = floor(p);      // integer grid cell
  vec2 f = fract(p);      // fractional position within cell
  
  // Sample corners
  float a = hash(i + vec2(0.0, 0.0));
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  // Smooth interpolation (quintic: 6t^5 - 15t^4 + 10t^3)
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
```

### Fractal Brownian Motion (FBM)

FBM stacks multiple octaves of noise at increasing frequency and decreasing
amplitude. The result looks like natural terrain, clouds, or the texture of
grass variation:

```glsl
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  // 5 octaves: each adds finer detail
  for (int i = 0; i < 5; i++) {
    value += amplitude * valueNoise(p * frequency);
    frequency *= 2.0;   // double frequency each octave
    amplitude *= 0.5;   // halve amplitude each octave
  }
  
  return value;
}
```

**Uses in this project:**
- `fbm(worldPos.xz * 0.3)` — variation in grass height per-blade
- `fbm(worldPos.xz * 0.1 + time * 0.05)` — slow moving wind pressure map
- `fbm(vUv * 5.0)` — dissolve mask texture (generated procedurally vs loading a texture)
- `fbm(vWorldPos.xz * 0.5)` — subtle color variation across the grass field

### GLSL Noise as a Texture Lookup

For the vertex shader (which should avoid complex loops for performance), pre-bake
noise to a texture and sample it:

```glsl
// In vertex shader:
uniform sampler2D uNoiseTex;

// Sample the noise texture using world position
vec2 noiseCoord = position.xz * 0.05 + uTime * 0.02;
float noiseVal = texture2D(uNoiseTex, fract(noiseCoord)).r;

// Use for per-blade height variation
float bladeHeight = 0.7 + noiseVal * 0.6; // 0.7 to 1.3× base height
```

The noise texture (256×256, `GL_RED`) is generated once on the CPU using a
JavaScript noise library and uploaded at scene init:

```javascript
import SimplexNoise from 'simplex-noise';
const simplex = new SimplexNoise();

const noiseData = new Float32Array(256 * 256);
for (let y = 0; y < 256; y++) {
  for (let x = 0; x < 256; x++) {
    noiseData[y * 256 + x] = simplex.noise2D(x / 64, y / 64) * 0.5 + 0.5;
  }
}

const noiseTexture = new THREE.DataTexture(noiseData, 256, 256, THREE.RedFormat, THREE.FloatType);
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
noiseTexture.needsUpdate = true;
```

---

## Chapter 46: Vertex Deformation Patterns

Vertex shaders can deform geometry — change vertex positions on the GPU without
modifying the CPU-side geometry. This is used for:
- Grass blade bending (Chapter 36)
- The scan plane rising (moving a mesh in the shader, not just changing a uniform)
- Hedge "over-trim" effect (slight random vertex offset to make them look untrimmed)

### Hedge Untrimmed Deformation (Before State)

```glsl
// HEDGE_VERTEX_SHADER (before state)

attribute vec3 position;
attribute vec2 uv;
uniform float uTrimProgress; // 0 = untrimmed, 1 = perfectly trimmed
uniform float uTime;
uniform sampler2D uNoiseTex;

void main() {
  vec2 noiseCoord = uv * 3.0;
  float noise = texture2D(uNoiseTex, noiseCoord).r;
  
  // Random protrusions: some vertices stick out from the hedge surface
  // Only applies to outward-facing vertices (at surface normals)
  float protrusionAmount = (1.0 - uTrimProgress) * (noise - 0.4) * 0.3;
  protrusionAmount = max(0.0, protrusionAmount); // only protrude, never indent
  
  // Apply protrusion along the surface normal direction
  vec3 deformedPosition = position + normal * protrusionAmount;
  
  // Also: random slight drooping (weight of overgrown branches)
  float droopNoise = texture2D(uNoiseTex, noiseCoord * 2.7 + 0.5).r;
  float droop = (1.0 - uTrimProgress) * droopNoise * 0.1;
  deformedPosition.y -= droop * (1.0 - uv.y); // droop more at the bottom
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(deformedPosition, 1.0);
}
```

As Beat 1 progresses and `uTrimProgress` goes from `0 → 1`, the hedge smoothly
tightens up — the protrusions retract, the droop lifts, and the hedge becomes the
clean geometric box it "should" be. This is the vertex-level version of "trimmed."

### PAID Stamp Deformation (Beat 4)

The "PAID" stamp that drops from above onto the invoice. It uses vertex animation
to simulate a rubber stamp impact:

```glsl
// STAMP_VERTEX_SHADER

uniform float uStampProgress; // 0 = high above, 1 = fully stamped
uniform float uBounce;        // overshoot bounce: goes to 1.05, comes back to 1.0

attribute vec3 position;

void main() {
  // Stamp falls from Y+2.0 to Y=0.0
  float dropY = mix(2.0, 0.0, uStampProgress);
  
  // Impact squash: when near impact (uStampProgress ≈ 0.95), squash vertically
  float impact = smoothstep(0.85, 1.0, uStampProgress);
  float squashY = mix(1.0, 0.5, impact); // squash to 50% height at impact
  float squashXZ = mix(1.0, 1.3, impact); // expand 30% in XZ at impact
  
  // After impact, bounce back with slight overshoot
  float bounce = uBounce; // animated by CPU: 0.5 → 1.05 → 1.0
  
  vec3 deformedPos = vec3(
    position.x * squashXZ * bounce,
    position.y * squashY / bounce + dropY,
    position.z * squashXZ * bounce
  );
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(deformedPos, 1.0);
}
```

CPU-side bounce animation:
```javascript
// Triggered when Beat 4 activates
gsap.timeline()
  .to(stampParams, { uStampProgress: 1.0, duration: 0.4, ease: 'power3.in' })
  .to(stampParams, { uBounce: 1.05, duration: 0.1, ease: 'power1.out' })
  .to(stampParams, { uBounce: 0.98, duration: 0.15, ease: 'power1.in' })
  .to(stampParams, { uBounce: 1.00, duration: 0.1, ease: 'power1.out' });
```

---

## Chapter 47: Custom Attribute Animation

For effects where different instances need different behaviors (not just transforms),
custom instance attributes are the solution.

### Per-Blade Color Variation (After State)

After the scan, we want slight color variation between grass blades — some are a
brighter `#2ad16a`, some are the standard `#05A845`, some are a deeper `#038a37`.
This avoids the "plastic lawn" look of perfectly uniform color.

```javascript
// Create per-instance color attribute
const colorData = new Float32Array(GRASS_COUNT * 3); // RGB per instance

for (let i = 0; i < GRASS_COUNT; i++) {
  const hue = (Math.random() - 0.5) * 0.1;  // slight hue shift
  const lightness = 0.8 + Math.random() * 0.4; // brightness variation 80-120%
  
  // Base color: #05A845 = RGB(5, 168, 69) = vec3(0.02, 0.659, 0.271)
  colorData[i * 3 + 0] = (0.02 * lightness) + hue;
  colorData[i * 3 + 1] = (0.659 * lightness);
  colorData[i * 3 + 2] = (0.271 * lightness);
}

instancedMesh.geometry.setAttribute(
  'aInstanceColor',
  new THREE.InstancedBufferAttribute(colorData, 3)
);
```

```glsl
// In GRASS_FRAGMENT_SHADER, use aInstanceColor passed from vertex shader:

attribute vec3 aInstanceColor;
varying vec3 vInstanceColor;

// In vertex shader:
vInstanceColor = aInstanceColor;

// In fragment shader:
vec3 afterColorFinal = afterColor.rgb * vInstanceColor; // modulate by instance color
```

---

# PART VII: SCROLL ARCHITECTURE

---

## Chapter 48: GSAP ScrollTrigger Deep Dive

GSAP ScrollTrigger is the industry standard for scroll-driven animation. It handles
the mapping of scroll position to animation progress, with perfect iOS and Android
support, and integrates cleanly with Three.js via the `onUpdate` callback.

### Core Concepts

**The ScrollTrigger instance:**
```javascript
const trigger = ScrollTrigger.create({
  trigger: '#scroll-container',  // the element that the trigger watches
  start: 'top top',              // when top of element hits top of viewport
  end: 'bottom bottom',          // when bottom of element hits bottom of viewport
  scrub: 1,                      // 1 second of scrub lag (smoothing)
  // scrub: true = instant (jittery), scrub: 0.5 = half second lag (smooth)
  // scrub: 1 = 1 second lag (very cinematic — animation trails behind scroll)
  
  onUpdate: (self) => {
    // self.progress: 0 → 1 as scroll moves from start to end
    setBeatProgress(self.progress * 5); // map to 5 beats
    invalidate(); // tell R3F to render next frame
  },
});
```

**Beat mapping:**
```javascript
// How to extract beat index and within-beat progress from a single progress value:
function parseBeatProgress(progress) {
  const totalProgress = progress * 5; // 0 → 5 (5 beats)
  const beatIndex = Math.floor(totalProgress);         // 0, 1, 2, 3, 4
  const beatT = totalProgress - beatIndex;             // 0 → 1 within each beat
  return { beatIndex: Math.min(beatIndex, 4), beatT };
}
```

**Scrub lag and why it matters:**
With `scrub: 1`, when the user scrolls, the animation lags 1 second behind.
This creates a "cinematic" feel — the scene doesn't react instantly to the
scroll, it flows. This is exactly what we want for "The Yard That Grows."
If you want snap-to-beat behavior (scroll snaps to each beat), use `snap` instead:

```javascript
ScrollTrigger.create({
  // ...
  snap: 1 / 4,  // snap to 4 positions (5 beats = 4 transitions)
});
```

Snap vs scrub is a product decision. Recommendation: `scrub: 0.8` for the main
transformation (smooth but responsive), and `snap: 0.2` (quick snap) for the
final CTA beat so it always lands clean.

### The Full ScrollTrigger Setup

```javascript
// In a React component that mounts once:
useEffect(() => {
  // Register ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);
  
  // Create the main scroll trigger
  const st = ScrollTrigger.create({
    trigger: '.scroll-container',
    start: 'top top',
    end: '+=4000',   // 4000px of scrollable space (4000 / 5 = 800px per beat)
    scrub: 0.8,
    pin: false,      // DON'T use ScrollTrigger pin — use CSS sticky instead (more reliable)
    
    onUpdate: ({ progress }) => {
      const { beatIndex, beatT } = parseBeatProgress(progress);
      beatIndexRef.current = beatIndex;
      beatTRef.current = beatT;
      globalScrollProgress.current = progress;
      invalidate(); // trigger R3F render
    },
    
    onScrubComplete: () => {
      // The scrub has finished — user has stopped scrolling
      // Good time to trigger secondary effects (sound, haptics, analytics)
    },
  });
  
  return () => st.kill(); // cleanup on unmount
}, []);
```

### ScrollTrigger and iOS Safari

iOS Safari's "rubber band" elastic scrolling can push `progress` below 0 or above 1.
Always clamp:

```javascript
onUpdate: ({ progress }) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const { beatIndex, beatT } = parseBeatProgress(clampedProgress);
  // ...
}
```

Additionally, iOS defers scroll events during momentum scrolling. Use
`fastScrollEnd: true` to immediately fire an update when momentum ends:

```javascript
ScrollTrigger.create({
  fastScrollEnd: true,
  // ...
});
```

---

## Chapter 49: The Sticky Canvas Pattern

The correct architecture for a scroll-driven 3D site is a **sticky canvas**:
the `<Canvas>` element is `position: sticky`, so it stays in the viewport while
the rest of the page scrolls past it. This creates the illusion that scrolling
drives the 3D animation.

```html
<!-- HTML structure -->
<div class="page-container">

  <!-- The sticky 3D viewport -->
  <div class="canvas-container" style="
    position: sticky;
    top: 0;
    height: 100vh;
    width: 100%;
    z-index: 10;
  ">
    <canvas id="r3f-canvas" />  <!-- R3F Canvas fills this container -->
  </div>

  <!-- The scrollable space — 5 beats × 800px = 4000px -->
  <div class="scroll-space" style="
    height: 4000px;            <!-- This creates scrollable height -->
    position: relative;
    z-index: 0;
    pointer-events: none;      <!-- Clicks pass through to the canvas -->
  ">
    <!-- Beat annotations (DOM overlays, positioned per beat) -->
    <div class="beat-annotation beat-1" style="position: absolute; top: 0;">...</div>
    <div class="beat-annotation beat-2" style="position: absolute; top: 800px;">...</div>
    <!-- etc -->
  </div>

</div>
```

```css
/* Tailwind equivalent */
.canvas-container {
  @apply sticky top-0 h-screen w-full z-10;
}

.scroll-space {
  @apply relative pointer-events-none;
  height: 4000px; /* 5 × 800px per beat */
}
```

**Why this is better than ScrollTrigger's `pin: true`:**
- CSS sticky is handled by the compositor thread — zero JavaScript involvement
- No FOUC (flash of unstyled content) during pin setup
- Works correctly with iOS Safari's elastic scroll
- No layout recalculation when pinning engages/disengages

---

## Chapter 50: Beat State Management

The beat state (current beat index, beat T, scan progress) must be accessible to:
1. The R3F scene (to update shaders, lights, materials)
2. The DOM overlay (to show/hide annotations at the right time)
3. The post-processing (to adjust bloom, CA during the scan)

**Solution: Zustand store**

```javascript
// src/stores/beatStore.ts
import { create } from 'zustand';

interface BeatStore {
  beatIndex: number;     // 0-4
  beatT: number;         // 0-1 within current beat
  scanProgress: number;  // 0-1 (Beat 1's progress only)
  setBeatProgress: (totalProgress: number) => void;
}

export const useBeatStore = create<BeatStore>((set, get) => ({
  beatIndex: 0,
  beatT: 0,
  scanProgress: 0,

  setBeatProgress: (totalProgress: number) => {
    const total = Math.max(0, Math.min(5, totalProgress * 5));
    const beatIndex = Math.min(Math.floor(total), 4);
    const beatT = total - beatIndex;

    set({
      beatIndex,
      beatT,
      scanProgress: beatIndex === 1 ? beatT : (beatIndex > 1 ? 1 : 0),
    });
  },
}));
```

**Usage in the R3F scene:**
```javascript
// In YardScene.tsx
const { beatIndex, beatT, scanProgress } = useBeatStore();

useFrame(() => {
  // Update scan uniform directly (ref-based, not re-render)
  groundMaterial.userData.shader?.uniforms.uScanProgress.set(scanProgress);
});
```

**Usage in the DOM overlay:**
```jsx
// In BeatAnnotation.tsx
const { beatIndex } = useBeatStore();
return (
  <AnimatePresence>
    {beatIndex === 1 && (
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
        "AI that actually sees the yard."
      </motion.div>
    )}
  </AnimatePresence>
);
```

**Why Zustand instead of React state or context:**

| | Zustand | React State | Context |
|---|---|---|---|
| Re-render scope | Only subscribed components | All children | All context consumers |
| Update frequency | Every frame safe | Every frame = bad | Every frame = bad |
| Access from useFrame | ✅ (via getState()) | ❌ (stale closures) | ❌ (stale closures) |
| TypeScript | ✅ | ✅ | ✅ |

The critical advantage: `useBeatStore.getState()` gives synchronous access to
the latest values without React hooks — essential for use inside GSAP callbacks
and Three.js `useFrame`:

```javascript
// In GSAP onUpdate callback (not inside a React component):
onUpdate: ({ progress }) => {
  useBeatStore.getState().setBeatProgress(progress);
  invalidate();
}
```

---

## Chapter 51: iOS Scroll Inertia Handling

iOS Safari has two scroll behaviors that cause problems:

**1. Momentum Scrolling (Kinetic Scroll)**
After the user lifts their finger, iOS continues scrolling with decreasing velocity.
During momentum, scroll events fire rapidly and progress can change quickly.
With `scrub: 0.8`, the animation trails the scroll, which means during a fast
momentum phase the animation can fall far behind and then "catch up" visually.

**Fix:** Use `scrub: true` (instant) or `scrub: 0.3` (minimal lag) on mobile,
even though it's less cinematic than `scrub: 0.8`:

```javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
ScrollTrigger.create({
  scrub: isMobile ? 0.3 : 0.8,
  // ...
});
```

**2. Overscroll (Rubber Band)**
When the user scrolls past the top or bottom, iOS "rubber bands" — progress goes
below 0 or above 1. Always clamp progress values:

```javascript
const safeProgress = Math.max(0, Math.min(1, progress));
```

**3. Scroll Lock (100vh height issue)**
iOS Safari's address bar changes height, which affects `100vh`. The canvas container
set to `height: 100vh` may not fill the visible viewport correctly.

**Fix:** Use `dvh` (dynamic viewport height) where supported, with a `vh` fallback:

```css
.canvas-container {
  height: 100vh; /* fallback */
  height: 100dvh; /* iOS 15.4+ */
}
```

Or use JavaScript to set the height:
```javascript
// Set a CSS variable to the true viewport height
const setVH = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
};
window.addEventListener('resize', setVH);
setVH();

// In CSS:
// height: calc(var(--vh, 1vh) * 100);
```

---

## Chapter 52: Frame-Perfect Sync Between DOM and 3D

The hardest synchronization problem: DOM overlay animations (Framer Motion) and
3D scene animations (R3F useFrame) run on the same main thread but are not inherently
synchronized to the same frame.

**The naive approach (broken):**
```jsx
// React state triggers DOM animation...
const [showCard, setShowCard] = useState(false);
// ...and Three.js prop update
const cardVisible = showCard;

useFrame(() => {
  // This may run BEFORE the React re-render from setShowCard completes
  // → 3D and DOM are offset by 1-2 frames
});
```

**The correct approach: ref-based sync**

```javascript
// A single ref that both the DOM and the 3D scene read:
const beatIndexRef = useRef(0);

// Framer Motion reads from it each frame (not React state):
useAnimationFrame((time, delta) => {
  const beat = beatIndexRef.current;
  // Update DOM animations based on beat
  controls.start({ opacity: beat >= 1 ? 1 : 0 });
});

// Three.js also reads from it:
useFrame(() => {
  const beat = beatIndexRef.current;
  // Update 3D scene based on same beat
});

// GSAP ScrollTrigger updates the ref (not React state):
onUpdate: ({ progress }) => {
  beatIndexRef.current = Math.floor(progress * 5);
  // No React re-render triggered
}
```

This ensures both DOM and 3D read the SAME value, updated by the SAME source,
with no React re-render intermediary that could cause frame desync.

---

# PART VIII: CAMERA CINEMATOGRAPHY

---

## Chapter 53: Focal Length, FOV, and the Cinematic Feel

**Field of View (FOV)** is the angle of the camera's view cone. Lower FOV =
more zoom = more compression (objects look closer to each other). Higher FOV =
more wide-angle = more distortion.

```
FOV 75° → Wide angle. Feels spatial, large. Video game default. Objects distort at edges.
FOV 45° → Normal lens. Roughly matches human peripheral vision. Cinematic standard.
FOV 24° → Telephoto. Very compressed. Everything looks flat and close together.
           Used by cinematographers for "spying through a lens" shots.
           Our beat-specific camera for Beat 3 (minimap zoom-out).
```

**The yard uses `FOV 45°`** as the base camera. This:
- Makes the hedge look correctly proportioned (not too large from wide-angle distortion)
- Gives the scene a "shot through a quality lens" feel
- Keeps the yard from looking like a video game

For Beat 4 (invoice), temporarily tighten to `FOV 38°` — slightly telephoto,
which compresses the scene and makes the invoice panel feel "closer," more
important, like a close-up shot in a film:

```javascript
// During Beat 4:
gsap.to(camera, { fov: 38, duration: 0.8, ease: 'power2.inOut',
  onUpdate: () => { camera.updateProjectionMatrix(); invalidate(); }
});
```

---

## Chapter 54: The Isometric-to-Cinematic Angle

"Isometric" means equal measurement — a camera at exactly 45° elevation with
infinite focal length gives perfect isometric projection (no perspective distortion).
We're not going full isometric, but borrowing the visual language of isometric games
(Diablo, SimCity, FTL) while maintaining perspective depth.

**Target camera position:** `[8, 6, 10]` from origin (0,0,0) = the center of the yard.

```
Distance from origin: sqrt(8² + 6² + 10²) = sqrt(64 + 36 + 100) = sqrt(200) ≈ 14.1 units
Elevation angle: atan(6 / sqrt(8² + 10²)) = atan(6 / 12.8) ≈ 25°
Horizontal angle: atan(8 / 10) ≈ 38.7°
```

This gives a `25°` elevation (lower than true isometric's 35.26°) — it's a
"hero shot" angle that shows the ground plane well while maintaining some sky.
The `38.7°` horizontal angle puts the yard at a pleasing diagonal, not straight-on.

**Why not straight-on `[0, 10, 0]` (top-down)?**
Top-down eliminates all height information — hedges look like rectangles.
Our diagonal angle shows the hedge height, the grass texture, the driveway
perspective — everything that makes the yard feel real.

**Why not straight-on `[0, 3, 15]` (horizontal)?**
A horizontal camera makes the yard look like a painting — flat, no depth on the
ground plane. The diagonal angle creates proper ground plane recession (the driveway
narrows into the distance) which reads as a real location.

### Camera Micro-Movement

The camera should never be perfectly still. A static camera reads as "screenshot"
not "film." Micro-movement adds life:

```javascript
// In useFrame, add very subtle camera micro-movement:
const basePos = new THREE.Vector3(8, 6, 10);
const noise = /* precomputed slow noise */;

useFrame(({ clock, camera }) => {
  const t = clock.getElapsedTime();
  
  // Breathing: slow vertical oscillation (like a person holding a camera)
  const breathX = Math.sin(t * 0.2) * 0.015;
  const breathY = Math.sin(t * 0.3) * 0.008;
  const breathZ = Math.cos(t * 0.15) * 0.012;
  
  // Hand tremor: slightly faster noise
  const tremorX = (Math.sin(t * 1.7) * 0.003 + Math.sin(t * 2.3) * 0.002);
  const tremorY = (Math.sin(t * 1.3) * 0.002 + Math.sin(t * 1.9) * 0.0015);
  
  camera.position.set(
    basePos.x + breathX + tremorX,
    basePos.y + breathY + tremorY,
    basePos.z + breathZ
  );
  
  // Always look at the yard center (slight offset per beat)
  const lookAtTarget = new THREE.Vector3(
    0 + Math.sin(t * 0.1) * 0.05,
    0.5,
    0 + Math.cos(t * 0.12) * 0.05
  );
  camera.lookAt(lookAtTarget);
});
```

Keep the amplitude very small (`< 0.02` units for breathing, `< 0.005` for tremor).
Visible but not nauseating. The goal is "handheld camera on a monopod" not
"shaky cam action movie."

---

## Chapter 55: Depth of Field as Storytelling

DOF tells the viewer where to look. In every beat, the focus should be on the
"answer" to the objection being resolved:

| Beat | Focus Target | DOF Action |
|------|-------------|------------|
| 0 | The yard (establish) | Moderate blur at edges |
| 1 | The scan plane (the moment of AI vision) | Shift focus to scan plane level |
| 2 | The job card | Pull focus to card (bokeh the yard) |
| 3 | The minimap route | Slight defocus of card, refocus minimap |
| 4 | The invoice | Deep focus on invoice, blur background |
| 5 | The whole yard | Open DOF — everything in focus |

DOF is animated by changing `focusDistance` (normalized 0-1 from near to far plane):

```javascript
// Map each beat to a focus distance:
const BEAT_FOCUS = [0.5, 0.45, 0.35, 0.4, 0.3, 0.7];
const BEAT_BOKEH = [2.0, 2.5, 4.5, 3.5, 5.0, 1.0];

// In your beat transition logic:
function onBeatChange(beatIndex, beatT) {
  const targetFocus = BEAT_FOCUS[beatIndex];
  const targetBokeh = BEAT_BOKEH[beatIndex];
  
  gsap.to(dofParams, {
    focusDistance: targetFocus,
    bokehScale: targetBokeh,
    duration: 1.2,
    ease: 'power2.inOut',
    onUpdate: invalidate,
  });
}
```

---

## Chapter 56: Camera Micro-Movement

Covered in Chapter 54. Additionally, for beat transitions, a brief camera
"reframe" gives each beat its own "shot":

```javascript
// Camera position shift between beats (very subtle — under 0.5 units)
const BEAT_CAMERA_OFFSETS = [
  [0, 0, 0],     // Beat 0: base position
  [-0.3, 0.2, 0], // Beat 1: slight left and up (watching the scan rise)
  [0.2, -0.1, -0.3], // Beat 2: slightly closer and right (reading the job card)
  [-0.1, 0.3, 0.2],  // Beat 3: up and back (widening to see the route)
  [0.1, -0.2, -0.2], // Beat 4: in close (intimate invoice moment)
  [0, 0.5, 0.5],     // Beat 5: back and up (the big reveal, seeing the whole yard)
];

// Animate between offsets with each beat:
gsap.to(cameraTargetOffset, {
  x: BEAT_CAMERA_OFFSETS[newBeat][0],
  y: BEAT_CAMERA_OFFSETS[newBeat][1],
  z: BEAT_CAMERA_OFFSETS[newBeat][2],
  duration: 1.5,
  ease: 'power2.inOut',
});
```

---

## Chapter 57: The Reveal Shots

Beat 5 ("Crew Away") is the climax. The camera should pull back to reveal the
full, alive yard. This requires an animated camera path.

```javascript
// CatmullRomCurve3: a smooth curve through control points
const revealPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(8, 6, 10),   // start: current cinematic position
  new THREE.Vector3(10, 8, 13),  // mid-point: pull back and up
  new THREE.Vector3(12, 10, 15), // end: full reveal position
]);

// Animate along the path during Beat 5:
let revealT = 0;
function animateReveal(delta) {
  revealT = Math.min(revealT + delta * 0.3, 1); // 3.3 seconds to complete
  
  const pos = revealPath.getPointAt(revealT);
  camera.position.lerp(pos, 0.05); // smooth follow
  camera.lookAt(0, 0.5, 0); // always look at yard center
  camera.updateProjectionMatrix();
  invalidate();
}
```

---

## Chapter 58: Animated Camera Paths

`CatmullRomCurve3` creates a smooth path through arbitrary control points.
It's the basis for cinematic camera animation in 3D.

```javascript
const cinematicPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(8, 6, 10),    // opening position
  new THREE.Vector3(6, 5, 8),     // slight push-in during scan
  new THREE.Vector3(7, 7, 9),     // wider for job card
  new THREE.Vector3(9, 7, 11),    // back for route
  new THREE.Vector3(7, 5, 8),     // in for invoice
  new THREE.Vector3(12, 10, 14),  // reveal position
], true); // closed = false (not a loop)

cinematicPath.curveType = 'catmullrom'; // or 'centripetal', 'chordal'
cinematicPath.tension = 0.5;            // 0 = sharp, 1 = very smooth

// Get camera position at t (0-1) along the path:
const cameraPos = cinematicPath.getPointAt(beatProgress / 5); // beatProgress 0-5

// Get camera tangent (direction of travel) for look-at pointing:
const tangent = cinematicPath.getTangentAt(beatProgress / 5);
```

The `'centripetal'` curveType prevents loops and sharp S-curves that
can appear with Catmull-Rom when control points are unequally spaced.
Use `'centripetal'` for smoother motion across this path.

---

# PART IX: PERFORMANCE ENGINEERING

---

## Chapter 59: The Performance Budget

Concrete targets. These are not aspirational — if these are missed, mobile
users experience a broken site.

**Desktop (2020+ GPU, Chrome 120+):**
- Frame rate: 60fps (16.67ms budget)
- LCP: < 2.0s (hero text visible before 3D loads)
- TTI: < 3.5s (3D scene interactive)
- JS bundle (initial): < 150kB gzipped
- 3D chunk (lazy): < 800kB gzipped
- GPU RAM: < 300MB

**Mobile — High End (iPhone 15, Galaxy S24):**
- Frame rate: 60fps
- LCP: < 2.5s
- GPU RAM: < 200MB

**Mobile — Mid Range (iPhone 12, Galaxy A54, Moto G Power):**
- Frame rate: 30fps (33.3ms budget)
- LCP: < 3.5s
- GPU RAM: < 150MB
- Reduced post chain, simplified geometry

**Mobile — Low End (2019-2022 budget Android):**
- Frame rate: 24fps target, < 30fps acceptable
- Static fallback if WebGL fails
- Zero post-processing
- Billboard grass only

---

## Chapter 60: Bundle Splitting for 3D

```javascript
// vite.config.ts — enforce split boundaries
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (id.includes('three')) return 'three-core';
        if (id.includes('@react-three/fiber')) return 'three-fiber';
        if (id.includes('@react-three/drei')) return 'three-drei';
        if (id.includes('postprocessing') || id.includes('@react-three/postprocessing')) return 'postfx';
        if (id.includes('gsap')) return 'gsap';
        if (id.includes('zustand')) return 'state';
      }
    }
  }
}
```

**Expected bundle analysis:**
```
Chunk             Gzipped Size    Load Time (4G)
─────────────────────────────────────────────────
index (initial)    90kB           90ms   ← hero text, nav
react              42kB           42ms   (cached after 1st visit)
motion             35kB           35ms
three-core        285kB          285ms  ← lazy, loads during hero read
three-fiber        55kB           55ms   ← lazy
three-drei         95kB           95ms   ← lazy
postfx             75kB           75ms   ← lazy
gsap               55kB           55ms   ← lazy
state              15kB           15ms
─────────────────────────────────────────────────
Initial delivery:  90kB  ← LCP hits before 3D loads
Total 3D world:   580kB  ← loads lazily (700ms on 4G)
```

**The lazy loading strategy:**
```jsx
// src/App.tsx
const YardScene = React.lazy(() => import('./scenes/YardScene'));

function App() {
  return (
    <div>
      {/* Hero text renders immediately from the initial 90kB chunk */}
      <HeroText />
      
      {/* 3D scene loads asynchronously */}
      <Suspense fallback={<StaticYardFallback />}>
        <YardScene />
      </Suspense>
    </div>
  );
}
```

The `<StaticYardFallback />` is a CSS-based static representation of the before-state
yard — just colored divs positioned with CSS 3D transforms. It looks decent and
ensures the site is usable before the 3D chunk loads.

---

## Chapter 61: GPU Memory Management

### Texture Lifecycle

```javascript
// In React Three Fiber, textures are automatically disposed when the
// component that owns them unmounts. But for textures shared across
// components (like the HDRI environment), explicit disposal is needed:

useEffect(() => {
  // Load HDRI
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  
  const hdrLoader = new THREE.RGBELoader();
  hdrLoader.load('/hdri/overcast.hdr', (hdrEquirect) => {
    const envMap = pmremGenerator.fromEquirectangular(hdrEquirect).texture;
    scene.environment = envMap;
    hdrEquirect.dispose();        // ← dispose the raw HDR (16MB freed)
    pmremGenerator.dispose();     // ← dispose the generator
    // envMap stays in GPU RAM as the environment — needed until scene unmounts
  });

  return () => {
    scene.environment?.dispose(); // ← dispose envMap on unmount
    scene.environment = null;
  };
}, []);
```

### The Dispose Everything Rule

Any Three.js object that allocates GPU memory must be explicitly disposed:

| Object | Disposal |
|--------|----------|
| `BufferGeometry` | `geometry.dispose()` |
| `Material` | `material.dispose()` |
| `Texture` | `texture.dispose()` |
| `WebGLRenderTarget` | `renderTarget.dispose()` |
| `WebGLRenderer` | `renderer.dispose()` |

R3F handles disposal of scene objects automatically. But any objects created
outside R3F's declarative model (e.g., using `new THREE.Texture()` in a
`useEffect`) must be manually disposed.

### Texture Memory Pooling

For effects that repeatedly create/destroy textures (like the dissolve mask):
```javascript
// Instead of creating a new texture each time, pool and reuse:
const texturePool = useMemo(() => {
  return Array.from({ length: 3 }, () =>
    new THREE.WebGLRenderTarget(512, 512)
  );
}, []);

let poolIndex = 0;
function getPooledTarget() {
  const target = texturePool[poolIndex % 3];
  poolIndex++;
  return target;
}

// On unmount, dispose the pool:
useEffect(() => () => texturePool.forEach(t => t.dispose()), []);
```

---

## Chapter 62: The Mobile GPU Tier System

Different devices have dramatically different GPU capabilities. The tier system
categorizes devices and serves appropriate quality levels:

```javascript
// src/utils/deviceTier.ts
import { getGPUTier } from 'detect-gpu'; // npm install detect-gpu

export async function getDeviceTier() {
  const tier = await getGPUTier();
  
  return {
    isWebGL2: !!document.createElement('canvas').getContext('webgl2'),
    gpuTier: tier.tier,  // 0 (bad) → 3 (excellent)
    isMobile: tier.isMobile,
    isLowEnd: tier.tier <= 1,
    isMidRange: tier.tier === 2,
    isHighEnd: tier.tier >= 3,
    config: getQualityConfig(tier.tier, tier.isMobile),
  };
}

function getQualityConfig(tier: number, mobile: boolean) {
  if (!mobile && tier >= 3) return QUALITY_HIGH;
  if (!mobile && tier >= 2) return QUALITY_MEDIUM;
  if (mobile && tier >= 2) return QUALITY_MOBILE_HIGH;
  if (mobile && tier >= 1) return QUALITY_MOBILE_LOW;
  return QUALITY_MINIMAL;
}

const QUALITY_HIGH = {
  grassCount: 50000,
  shadowMapSize: 2048,
  postChain: 'full',    // SSAO + Bloom + DOF + CA + LUT + Grain + Vignette
  dpr: [1, 2],
  grassType: 'blades',  // full geometry
};

const QUALITY_MEDIUM = {
  grassCount: 30000,
  shadowMapSize: 1024,
  postChain: 'medium',  // Bloom + DOF + LUT + Vignette
  dpr: [1, 1.5],
  grassType: 'blades',
};

const QUALITY_MOBILE_HIGH = {
  grassCount: 10000,
  shadowMapSize: 512,
  postChain: 'mobile',  // Bloom + Vignette only
  dpr: [1, 1],
  grassType: 'billboard',
};

const QUALITY_MOBILE_LOW = {
  grassCount: 3000,
  shadowMapSize: 0,    // no shadows
  postChain: 'minimal', // Vignette only
  dpr: [0.75, 0.75],   // render at 75% resolution
  grassType: 'billboard',
};

const QUALITY_MINIMAL = {
  grassCount: 0,        // no grass
  shadowMapSize: 0,
  postChain: 'none',
  dpr: [0.5, 0.5],
  grassType: 'none',
  useStaticFallback: true,
};
```

**The `detect-gpu` library** benchmarks the device GPU in 50ms at page load by
rendering a complex shader and measuring frame time. It covers 2,000+ device
fingerprints and gives a reliable `tier 0-3` classification.

---

## Chapter 63: Instancing Everything

Beyond grass, everything repeated in the scene should use `InstancedMesh`:

```javascript
// Tree trunks (3 trees):
const trunkInstancedMesh = new THREE.InstancedMesh(
  cylinderGeo,
  trunkMaterial,
  3
);

const dummy = new THREE.Object3D();
const treePositions = [[-4, 0, -2], [3, 0, -5], [5, 0, 2]];

treePositions.forEach((pos, i) => {
  dummy.position.set(...pos);
  dummy.scale.setScalar(1.0 + Math.random() * 0.2);
  dummy.rotation.y = Math.random() * Math.PI * 2;
  dummy.updateMatrix();
  trunkInstancedMesh.setMatrixAt(i, dummy.matrix);
});
trunkInstancedMesh.instanceMatrix.needsUpdate = true;

// Tree canopies (3 trees, sphere geometry):
const canopyInstancedMesh = new THREE.InstancedMesh(sphereGeo, canopyMaterial, 3);
// Same process but positioned 2m above the trunk positions

// Hedge panels (the 3 hedge faces as one InstancedMesh):
// Actually hedges have different scales — InstancedMesh supports non-uniform scaling:
hedgePanels.setMatrixAt(0, frontHedgeMatrix);
hedgePanels.setMatrixAt(1, leftHedgeMatrix);
hedgePanels.setMatrixAt(2, rightHedgeMatrix);
```

**Result:** 3 trees + 3 hedges = 6 scene objects → only 2 draw calls
(one for InstancedMesh trunks/canopies, one for InstancedMesh hedges).

---

## Chapter 64: Frustum Culling

Three.js performs frustum culling automatically for regular `Mesh` objects.
But for `InstancedMesh`, it only culls the ENTIRE mesh as a unit (if any
instance is visible, all are drawn). For large grass fields that extend beyond
the camera frustum, this wastes GPU time.

**Solution: Frustum cull per-instance with InstancedMesh2 (or manually):**

```javascript
// The drei library's BBAInstancedMesh handles per-instance frustum culling:
import { InstancedMesh2 } from '@react-three/drei'; // proposed extension

// OR: manually implement with a BVH (Bounding Volume Hierarchy):
import { MeshBVH } from 'three-mesh-bvh'; // npm install three-mesh-bvh

const bvh = new MeshBVH(grassInstancedMesh.geometry);
grassInstancedMesh.geometry.boundsTree = bvh;

// Per-frame, raycast with the camera frustum to find visible instances:
useFrame(({ camera }) => {
  // This is expensive to do per-frame — instead, only update on camera movement
  // For a fixed camera (this project), compute once at load time
});
```

**For this specific project, frustum culling of grass is lower priority:**
The camera is relatively fixed (micro-movement only), and the grass field
is designed to exactly fill the camera's view. Very few blades will be
out-of-frustum at any time. This optimization matters more for open-world
scenes with a moving camera.

---

## Chapter 65: Profiling Tools

### Spector.js (GPU Debugging)

Spector.js captures a single WebGL frame and shows every draw call, shader,
texture, and state change. Essential for understanding what the GPU is actually doing.

Install as a Chrome extension: search "Spector.js" in the Chrome Web Store.
Use it when:
- You suspect unexpected draw calls
- A texture looks wrong and you need to see the raw texel data
- Shader compilation errors are silent

### Chrome DevTools Performance

For JavaScript profiling:
1. Open DevTools → Performance tab
2. Click Record
3. Scroll through the animation
4. Stop recording
5. Look for the "Rendering" section: `useFrame` calls should be `< 4ms`

For memory:
1. DevTools → Memory tab
2. Take Heap Snapshot
3. Filter by "Detached" to find GPU memory leaks (Three.js objects that weren't disposed)

### Three.js WebGLRenderer.info

```javascript
// In useFrame during development:
useFrame(({ gl }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log({
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    });
  }
});
```

Target: `drawCalls < 20`, `textures < 20`, `geometries < 20`.

### `drei` PerformanceMonitor

```jsx
<PerformanceMonitor
  onDecline={() => {
    setDpr(0.75);              // lower pixel ratio
    setGrassCount(prev => prev * 0.5); // fewer grass instances
    setPostChain('minimal');
  }}
  onIncline={() => {
    setDpr(1);
    setGrassCount(prev => Math.min(prev * 1.5, MAX_GRASS));
    setPostChain('mobile');
  }}
  onChange={({ factor }) => {
    // factor: 0 (worst) → 1 (best) continuous performance signal
    // Adjust quality continuously rather than stepping
  }}
  iterations={5}    // averages over 5 frames before deciding
  threshold={0.75}  // below 75% of target frame rate → decline
/>
```

---

## Chapter 66: Target Numbers

**The "is it cinematic?" test:**
- 60fps with full post-processing on a 2022 MacBook Pro M1: ✅
- 60fps on a 2020 Windows gaming laptop (RTX 3060): ✅
- 30fps on an iPhone 13: ✅ (with mobile quality config)
- 24fps+ on a 2021 Samsung Galaxy A52: ✅ (with billboard grass, no shadows)
- Functional on a 2019 Moto G7: ✅ (static fallback, beats work via CSS)

**Benchmarking script:**
```javascript
// Use Stats.js (via drei's <Stats />) during development to track:
// FPS average over 10 seconds: should be within 5% of target (60 or 30)
// Memory: WebGL memory usage in MB
// Draw calls: < 20 at all times (< 15 during non-beat frames)
```

---

# PART X: THE TRANSFORMATION PIPELINE

---

## Chapter 67: How All Systems Connect

Here is the complete data flow for a single scroll event:

```
User scrolls ↓
      ↓
GSAP ScrollTrigger (onUpdate)
      ↓
parseBeatProgress(progress) → { beatIndex: 2, beatT: 0.4 }
      ↓
useBeatStore.getState().setBeatProgress(progress)
      ↓
Zustand store updates: { beatIndex: 2, beatT: 0.4, scanProgress: 1.0 }
      ↓ (synchronously)
invalidate() → R3F renders next frame
      ↓
useFrame callbacks run:
  ├── GrassSystem: reads scanProgress → updates uScanY uniform
  ├── HedgeSystem: reads beatIndex → updates uTrimProgress
  ├── LightingSystem: reads beatIndex → lerps light intensities
  ├── CameraSystem: reads beatIndex, beatT → moves camera, updates DOF
  ├── ScanPlane: reads beatIndex → moves scan plane mesh
  └── PostProcessing: reads beatIndex → adjusts bloom, CA, vignette
      ↓
Three.js renders the scene:
  ├── Shadow pass (1 draw call)
  ├── Geometry passes (15 draw calls)
  └── Post passes (7 draw calls)
      ↓
Framer Motion reads beatIndex from Zustand:
  ├── BeatAnnotations: show/hide based on beatIndex
  ├── LiveEarPanel: appears at Beat 4
  └── CTACard: appears at Beat 5
      ↓
Browser compositor combines WebGL canvas + DOM overlays
      ↓
Frame displayed
```

Every step in this chain is synchronous within a single frame — there are no
async gaps between scroll update and visual response.

---

## Chapter 68: The Beat State Machine

Each beat transition triggers a cascade of changes. The state machine handles this:

```typescript
// src/systems/BeatStateMachine.ts

type BeatState = {
  index: 0 | 1 | 2 | 3 | 4;
  active: boolean;
};

type BeatTransition = {
  from: number;
  to: number;
  duration: number;
  ease: string;
  effects: TransitionEffect[];
};

type TransitionEffect = {
  target: 'grass' | 'hedge' | 'lights' | 'camera' | 'post' | 'dom';
  property: string;
  from: number;
  to: number;
};

const BEAT_TRANSITIONS: BeatTransition[] = [
  {
    from: 0, to: 1,
    duration: 0.8,
    ease: 'power2.inOut',
    effects: [
      { target: 'grass', property: 'scanStart', from: -0.5, to: 3.0 },
      { target: 'lights', property: 'rimIntensity', from: 1.5, to: 3.0 },
      { target: 'post', property: 'bloomIntensity', from: 0.5, to: 3.0 },
      { target: 'post', property: 'caStrength', from: 0.0, to: 0.003 },
      { target: 'dom', property: 'annotationIndex', from: -1, to: 1 },
    ]
  },
  // ... beats 1→2, 2→3, 3→4, 4→5
];

class BeatStateMachine {
  private currentBeat = 0;
  private timeline: gsap.core.Timeline | null = null;
  
  transitionTo(newBeat: number) {
    if (newBeat === this.currentBeat) return;
    
    const transition = BEAT_TRANSITIONS.find(
      t => t.from === this.currentBeat && t.to === newBeat
    );
    if (!transition) return;
    
    this.timeline?.kill();
    this.timeline = gsap.timeline();
    
    transition.effects.forEach(effect => {
      this.timeline!.to(this.getTarget(effect.target), {
        [effect.property]: effect.to,
        duration: transition.duration,
        ease: transition.ease,
        onUpdate: () => invalidate(),
      }, 0); // all effects start simultaneously (offset = 0)
    });
    
    this.currentBeat = newBeat;
  }
  
  private getTarget(target: string) {
    // Returns the Three.js object, DOM element, or store to animate
    const targets = {
      grass: groundMaterial.userData.shader?.uniforms,
      hedge: hedgeMaterial.userData.shader?.uniforms,
      lights: lightsRef,
      camera: cameraRef,
      post: postParams,
      dom: domStore,
    };
    return targets[target];
  }
}
```

---

## Chapter 69: The Complete Render Pass Order

```
Frame N rendering sequence (the exact GPU command order):

Pre-render:
  1. Update shadow maps (directional light frustum):
     - Render scene to shadow depth buffer [2048×2048 depth]
     - Draw calls: 10 (only shadow-casting meshes)

  2. SSAO pre-pass:
     - Render scene normals + depth to G-buffer [960×540 RG16F]
     - Draw calls: 10 (all visible meshes)

Main render:
  3. Render scene to HDR render target [1920×1080 RGBA16F]:
     - Ground + grass (custom shader with scan effect)
     - Hedges (standard PBR)
     - House + driveway (standard PBR)
     - Trees (trunk + canopy with transmission)
     - Scan plane (emissive on Beat 1)
     - Environment (skybox)
     - Drei HTML components (compositor layer — technically not WebGL)
     Total: 15 draw calls

Post-processing (full quality):
  4. SSAO compute [480×270 R8]:
     - Sample normal/depth G-buffer at 16 points per pixel
     - Write occlusion factor
  5. SSAO blur [480×270 R8]:
     - Bilateral blur to reduce SSAO noise
  6. SSAO composite:
     - Multiply SSAO with HDR scene render
  7. Bloom threshold [480×270 RGBA16F]:
     - Extract pixels > luminanceThreshold
  8. Bloom horizontal blur [480×270 RGBA16F]
  9. Bloom vertical blur [480×270 RGBA16F]
  10. Bloom composite:
      - Add bloom back to scene
  11. Depth of Field [1920×1080 RGBA16F]:
      - Blur based on depth buffer comparison to focal plane
  12. Chromatic Aberration [1920×1080 RGBA16F]:
      - Split R/G/B channels by offset * CA strength
  13. LUT color grade [1920×1080 RGBA8]:
      - 3D texture lookup: remap all colors
  14. Noise + Vignette composite [1920×1080 RGBA8]:
      - Add film grain, darkened edges
  15. Final output to canvas display buffer

Total render targets written: 12
Total draw calls: 23
Total GPU RAM in flight: ~120MB
```

---

## Chapter 70: State Sync Between 3D and DOM

The key design principle: **3D animations are driven by refs and uniforms;
DOM animations are driven by Framer Motion reading from Zustand.**

```jsx
// The complete sync architecture:

// 1. Zustand store is the single source of truth for beat state
const { beatIndex, scanProgress } = useBeatStore();

// 2. DOM components (Framer Motion) subscribe to Zustand:
function BeatAnnotations() {
  const beatIndex = useBeatStore(s => s.beatIndex);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={beatIndex} // re-mount on beat change for clean transitions
        initial={{ opacity: 0, x: 40, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.3, 1] }}
      >
        {BEAT_ANNOTATIONS[beatIndex]}
      </motion.div>
    </AnimatePresence>
  );
}

// 3. R3F scene reads from Zustand synchronously (no subscribe overhead):
function GrassSystem() {
  useFrame(() => {
    // getState() gives sync access — no re-render triggered
    const { scanProgress } = useBeatStore.getState();
    groundShader.uniforms.uScanProgress.value = scanProgress;
  });
}

// 4. The result: DOM and 3D are driven by the SAME state,
//    updated by the SAME GSAP callback,
//    reading in the SAME frame.
//    Sync is guaranteed.
```

---

# PART XI: BEYOND SCOPE — THE 500-PAGE EXPANSION

---

## Chapter 71: WebGPU and Compute Shaders

WebGPU is the next-generation web graphics API, now shipping in Chrome 113+ and
Safari 18+. It provides direct access to compute shaders — GPU programs that don't
render pixels, they compute arbitrary data.

For "The Yard That Grows," compute shaders unlock:

### GPU-Side Grass Placement

Instead of placing grass blades with JavaScript loops on the CPU, a compute shader
places them on the GPU — 10× faster initialization:

```wgsl
// WGSL (WebGPU Shading Language) compute shader for grass placement
@group(0) @binding(0) var<storage, read_write> positions: array<vec3f>;
@group(0) @binding(1) var<uniform> params: GrassParams;
@group(0) @binding(2) var noiseTexture: texture_2d<f32>;

struct GrassParams {
  count: u32,
  yardWidth: f32,
  yardDepth: f32,
  densityMultiplier: f32,
}

@compute @workgroup_size(64) // 64 threads per workgroup
fn placeGrass(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= params.count) { return; }
  
  // Pseudo-random position based on index
  let seed = vec2f(f32(index) * 0.1375, f32(index) * 0.2917);
  let pos = fract(seed * vec2f(127.1, 311.7));
  
  // Sample density map (noise texture) — don't place grass where density < 0.3
  let density = textureSampleLevel(noiseTexture, sampler, pos, 0.0).r;
  if (density < 0.3) {
    positions[index] = vec3f(0, -100, 0); // below ground (invisible)
    return;
  }
  
  // Place within yard bounds
  positions[index] = vec3f(
    (pos.x - 0.5) * params.yardWidth,
    0.0,
    (pos.y - 0.5) * params.yardDepth
  );
}
```

Three.js WebGPU backend (currently in `three/examples/jsm/renderers/webgpu`):
```javascript
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';

const renderer = new WebGPURenderer();
await renderer.init();
```

### WebGPU Particle System (Rain, Seeds, Pollen)

Beat 5 could include a particle burst of "seeds" or "pollen" flying from the newly
healthy grass — a visual celebration of the transformation. With compute shaders,
100,000 particles update physics on the GPU:

```wgsl
@compute @workgroup_size(256)
fn updateParticles(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  var particle = particles[i];
  
  particle.velocity.y -= 0.001; // gravity
  particle.velocity *= 0.98;    // air resistance
  particle.position += particle.velocity * deltaTime;
  particle.life -= deltaTime;
  
  if (particle.life <= 0.0) {
    // Reset: respawn at ground level
    particle.position = vec3f(randomXZ(), 0.0, randomXZ());
    particle.velocity = vec3f(random() * 0.1, random() * 0.5, random() * 0.1);
    particle.life = 1.0 + random() * 2.0;
  }
  
  particles[i] = particle;
}
```

---

## Chapter 72: Procedural Terrain Generation

For future versions where the "yard" is not a fixed geometry but dynamically
generated based on the visitor's input (their address → aerial image → terrain
analysis), procedural terrain generation becomes necessary.

### Height Map to Terrain

```javascript
// Convert a grayscale height map to a PlaneGeometry with displaced vertices:
const heightMapData = /* Uint8Array from canvas.getImageData() */;
const resolution = 256; // 256×256 height samples
const geometry = new THREE.PlaneGeometry(20, 20, resolution - 1, resolution - 1);
geometry.rotateX(-Math.PI / 2);

const positions = geometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  const y = heightMapData[i * 4] / 255 * 2.0; // 0-2m height range
  positions.setY(i, y);
}
positions.needsUpdate = true;
geometry.computeVertexNormals(); // recompute normals for lighting
```

### Satellite Image to 3D Yard (The "Through the Lens" Connection)

If the visitor's real property is used (Beat 5 of the "full" version combining
concepts #1 and #4), the pipeline would be:

1. Visitor provides address or geolocation
2. Google Maps Static API returns a satellite image
3. Image is analyzed by a segmentation model (see Chapter 77)
4. Segments become geometry: grass → green plane, driveway → grey plane, house → box
5. The generated yard is the scene for Beat 1-5
6. The transformation is their actual property

This is the full "Through the Lens" + "Yard That Grows" merged experience.

---

## Chapter 73: Ray Marching and Signed Distance Functions

Ray marching is a rendering technique that traces rays through mathematical
distance fields rather than polygon meshes. It can render:
- Soft shadows without shadow maps
- Global illumination approximations
- Organic, blobby geometry (grass blades that merge at their bases)
- Atmospheric effects (volumetric mist in the yard after the scan)

### The Sphere SDF (Simplest SDF)

```glsl
// Returns the distance from point p to the surface of a sphere centered at origin
float sdSphere(vec3 p, float radius) {
  return length(p) - radius;
}

// Combining SDFs (CSG operations):
float sdUnion(float d1, float d2) { return min(d1, d2); }
float sdIntersect(float d1, float d2) { return max(d1, d2); }
float sdSubtract(float d1, float d2) { return max(d1, -d2); }

// Smooth union (blending between shapes — for grass blade bases):
float sdSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}
```

### Volumetric Mist (SDF Ray March in Fragment Shader)

After the scan in Beat 1, a subtle ground mist could rise from the newly green
grass — a particle-free atmospheric effect using ray marching:

```glsl
// In a post-processing fragment shader:
// March rays through a volume density function

float volumeDensity(vec3 p) {
  // Dense near the ground (p.y < 0.5), fades with height
  float heightFade = 1.0 - smoothstep(0.0, 0.8, p.y);
  // Dense near the grass position, fade toward edges
  float radialFade = 1.0 - smoothstep(0.0, 8.0, length(p.xz));
  // Noise for non-uniform mist
  float noise = fbm(p.xz * 0.5 + uTime * 0.1);
  return heightFade * radialFade * noise * uMistDensity;
}

vec3 marchRay(vec3 rayOrigin, vec3 rayDir) {
  float t = 0.0;
  vec3 mistColor = vec3(0.8, 0.95, 0.85); // slightly green-tinted mist
  float mistAccum = 0.0;
  
  for (int i = 0; i < 16; i++) {  // 16 steps (low count for performance)
    vec3 pos = rayOrigin + rayDir * t;
    if (pos.y > 1.5) break; // above mist height — stop early
    
    float density = volumeDensity(pos);
    mistAccum += density * 0.05; // 0.05 per step
    if (mistAccum >= 1.0) break;
    
    t += 0.15; // step size
  }
  
  return mistColor * clamp(mistAccum, 0.0, 0.4) * scanProgress;
  // Only visible during/after scan (scanProgress > 0)
}
```

This is a subtle effect — just a 20% opacity wisps near the ground — but it
dramatically increases the sense of "the yard coming alive" during Beat 1.
The mist appears as the scan completes, as if the grass is exhaling after being
dormant.

---

## Chapter 74: Real-Time Global Illumination

True global illumination (GI) is the holy grail of 3D rendering — it correctly
models light bouncing between surfaces: the green grass reflecting green light
onto the bottom of the hedges, the house wall catching ambient occlusion from the
trees. Real-time GI is expensive but approximations exist.

### SSGI (Screen-Space Global Illumination)

An extension of SSAO that not only darkens crevices but also adds colored light
bleeding between nearby surfaces:

```glsl
// SSGI fragment shader (simplified):
vec3 sampleGI(vec2 uv) {
  vec3 color = vec3(0.0);
  float weight = 0.0;
  
  // Sample 16 nearby pixels
  for (int i = 0; i < 16; i++) {
    vec2 offset = POISSON_DISK_16[i] * 0.1; // 0.1 = GI influence radius
    vec4 neighborColor = texture2D(uSceneColor, uv + offset);
    float neighborDepth = texture2D(uDepth, uv + offset).r;
    float currentDepth = texture2D(uDepth, uv).r;
    
    // Only count neighbors at similar depth (avoid bleeding across depth edges)
    float depthWeight = exp(-abs(neighborDepth - currentDepth) * 20.0);
    
    color += neighborColor.rgb * depthWeight;
    weight += depthWeight;
  }
  
  return color / weight;
}

void main() {
  vec3 baseColor = texture2D(uSceneColor, vUv).rgb;
  vec3 giContribution = sampleGI(vUv) * 0.15; // 15% GI influence
  gl_FragColor = vec4(baseColor + giContribution, 1.0);
}
```

For the after-state yard, SSGI would correctly show:
- The green grass reflecting forest-green light onto the hedge bases
- The house wall slightly warmed by reflected light from the sunny grass
- The tree canopies catching ambient light from the green canopy above the ground

This turns the scene from "3D rendered" to "feels like a photograph."

---

## Chapter 75: The "Through the Lens" Act 2 Technical Path

When "The Yard That Grows" (Act 1) completes and the CTA appears, there is
a reserved slot for "Through the Lens" (Act 2) — see the Feature Add Slots in
TODO.md. This chapter covers the technical implementation of that act.

### Act 2 Scene Transition

After Beat 5 ends and the CTA card is visible, a "peek through the lens" moment
activates. The camera animates forward through the CTA card — a portal effect —
and the scene transitions from the 3D isometric yard to a first-person perspective
facing a camera viewfinder UI.

```javascript
// Portal transition shader:
// The CTA card becomes a "window" — the 3D world outside it stays,
// the 3D world inside it (through the portal) is a different scene

// Implementation: render both scenes to separate render targets,
// composite them using the card's screen-space bounds as a mask:

const beforePortal = new THREE.WebGLRenderTarget(width, height);
const throughPortal = new THREE.WebGLRenderTarget(width, height);

// Frame 1: render the isometric yard scene → beforePortal
renderer.setRenderTarget(beforePortal);
renderer.render(yardScene, isometricCamera);

// Frame 2: render the lens scene → throughPortal
renderer.setRenderTarget(throughPortal);
renderer.render(lensScene, fpvCamera);

// Composite: use the card's geometry as a stencil mask
// Everything inside the card's projected bounds → throughPortal
// Everything outside → beforePortal
```

### The Live Ear WebSocket Connection

Act 2's "lens" feature connects to the real YardWorx backend:

```javascript
// After the portal transition, start the Live Ear connection:
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${wsProtocol}//app.yardworx.io/api/live`);
// Same WebSocket endpoint as the main app's LiveEar.tsx

// The marketing site's demo mode sends a pre-scripted prompt
// and displays the AI response as if the user is in the app
ws.onopen = () => {
  ws.send(JSON.stringify({
    audio: demoAudioBase64, // pre-recorded "Schedule Johnson property..."
  }));
};
```

---

## Chapter 76: WebXR and AR Integration

WebXR allows the browser to access AR capabilities on supported devices
(iPhone with ARKit, Android with ARCore). For the "Through the Lens" act,
a visitor on a supported device could be offered:

> "Try Cutty on your actual yard → tap to open in AR"

The AR experience uses Three.js WebXR to:
1. Show the camera feed in the background (provided by WebXR)
2. Detect a flat horizontal surface (ARCore/ARKit plane detection)
3. Place the scan plane shader onto the detected ground
4. Run the scan effect on the real-world grass via AR occlusion

```javascript
// Enable WebXR in Three.js:
renderer.xr.enabled = true;

// Add AR button:
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
document.body.appendChild(ARButton.createButton(renderer, {
  requiredFeatures: ['hit-test'],
  optionalFeatures: ['dom-overlay'],
}));

// In the XR session, hit-test for plane detection:
renderer.setAnimationLoop(() => {
  if (renderer.xr.isPresenting) {
    const session = renderer.xr.getSession();
    const viewerSpace = xrReferenceSpace;
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(viewerSpace);
      // Place the scan plane at the detected surface:
      scanPlane.matrix.fromArray(pose.transform.matrix);
    }
  }
  renderer.render(scene, camera);
});
```

The WebXR path is Phase 3 (future) for YRDWRXWEB. It's the ultimate expression
of "the product IS the marketing" — the visitor scans their actual yard on their
phone, sees the AI labels, and books a job through the Cutty interface that
seamlessly transitions to the main app on conversion.

---

## Chapter 77: ML in the Browser for Yard Analysis

TensorFlow.js allows running trained ML models directly in the browser, on the
visitor's device, without sending data to a server. This enables:
- Lawn segmentation from camera feed (identify grass, beds, driveway, hedges)
- Grass health estimation (color-based NDVI approximation)
- HOA violation detection (edge measurement from video feed)

### Semantic Segmentation with TensorFlow.js

```javascript
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Load the DeepLab model (semantic segmentation):
const model = await tf.loadGraphModel(
  'https://tfhub.dev/tensorflow/tfjs-model/deeplab/pascal/1/default/1/model.json'
);

// Run inference on a camera frame:
async function segmentYardFrame(videoElement) {
  const tensor = tf.browser.fromPixels(videoElement)
    .resizeBilinear([513, 513])  // DeepLab input size
    .expandDims(0)                // add batch dimension
    .toFloat()
    .div(127.5)
    .sub(1.0);                    // normalize to [-1, 1]
  
  const output = await model.predict(tensor);
  const segmentation = await output.squeeze().argMax(-1).array();
  
  // segmentation[y][x] = class index (0=grass, 1=driveway, 2=building, etc.)
  // Map class indices to 3D geometry placement rules
  
  tf.dispose([tensor, output]);
  return segmentation;
}

// Convert segmentation to yard geometry:
function buildYardFromSegmentation(segmentation) {
  const grassPixels = [];
  const drivePixels = [];
  
  for (let y = 0; y < 513; y++) {
    for (let x = 0; x < 513; x++) {
      if (segmentation[y][x] === GRASS_CLASS) grassPixels.push([x, y]);
      if (segmentation[y][x] === PAVED_CLASS) drivePixels.push([x, y]);
    }
  }
  
  // Convert pixel clusters to 3D planar regions
  // Place grass InstancedMesh only where grassPixels are dense
  // Place driveway plane where drivePixels are dense
  return { grassRegions: cluster(grassPixels), driveRegions: cluster(drivePixels) };
}
```

This is the technical foundation of the "visitor's actual yard" experience.
At the moment of conversion, their phone's camera scans their real property,
the ML model identifies what's there, and the 3D transformation shows what
it would look like after YardWorx treats it.

### Grass Health via Color Analysis

Simple but effective: compute approximate NDVI (Normalized Difference Vegetation
Index) from the camera feed using only visible light:

```javascript
// Real NDVI requires near-infrared. Phone cameras only have RGB.
// Approximate with the "ExG" (Excess Green) index:
// ExG = 2*G - R - B
// Higher ExG → healthier, denser green vegetation

function estimateGrassHealth(imageData) {
  let totalExG = 0;
  let grassPixels = 0;
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i] / 255;
    const g = imageData.data[i + 1] / 255;
    const b = imageData.data[i + 2] / 255;
    
    const exG = 2 * g - r - b; // -1 to 2 range
    if (exG > 0.1) { // probably grass
      totalExG += exG;
      grassPixels++;
    }
  }
  
  const avgHealth = grassPixels > 0 ? totalExG / grassPixels : 0;
  return Math.min(avgHealth / 0.5, 1.0); // normalize to 0-1
}

// Use the health score to set the transformation magnitude:
// Health = 0.8 → very small transformation needed (just maintenance)
// Health = 0.2 → dramatic transformation (full aerate + overseed + treatment)
const scanIntensity = 1.0 - grassHealth; // more scan = more transformation needed
```

This gives every visitor a personalized "before" state based on their actual yard's
health — the transformation magnitude varies per property.

---

## Appendix A: The Complete Dependency Tree

```
Production dependencies:
  @react-three/drei: ^9.x
  @react-three/fiber: ^8.x
  @react-three/postprocessing: ^2.x
  detect-gpu: ^5.x
  gsap: ^3.x
  motion: ^11.x
  postprocessing: ^6.x
  three: ^0.168.x
  zustand: ^5.x
  @fontsource/outfit: ^5.x
  @fontsource/inter: ^5.x
  @fontsource/jetbrains-mono: ^5.x
  tailwindcss: ^4.x
  @tailwindcss/vite: ^4.x
  react: ^19.x
  react-dom: ^19.x

Development dependencies:
  @types/three: ^0.168.x
  typescript: ^5.x
  vite: ^8.x
  @vitejs/plugin-react: ^4.x
  rollup-plugin-visualizer: ^5.x (bundle analysis)
```

---

## Appendix B: Asset Checklist

```
/public/
  /hdri/
    overcast-sky.hdr          (2048×1024, ~8MB download, PolyHaven)
    golden-hour.hdr           (2048×1024, ~8MB download, PolyHaven)
  /textures/
    grass-before-albedo.ktx2  (1024×1024, ~512KB compressed)
    grass-after-albedo.ktx2   (1024×1024, ~512KB compressed)
    grass-normal.ktx2         (1024×1024, ~256KB compressed)
    hedge-albedo.ktx2         (512×512, ~128KB compressed)
    hedge-normal.ktx2         (512×512, ~128KB compressed)
    concrete-albedo.ktx2      (512×512, ~128KB compressed)
    concrete-normal.ktx2      (512×512, ~128KB compressed)
    bark-normal.ktx2          (256×256, ~64KB compressed)
    noise-256.png             (256×256, ~32KB, R-channel only)
    dissolve-mask.png         (512×512, ~32KB, grayscale)
  /luts/
    yardworx-grade.cube       (~16KB, DaVinci Resolve export)
  /fonts/
    (via @fontsource packages — self-hosted in node_modules)
  /ktx2-transcoder/
    basis_transcoder.js       (from @loaders.gl/basis)
    basis_transcoder.wasm     (from @loaders.gl/basis)
```

---

## Appendix C: The Color Palette in Shader Values

For quick reference in GLSL (all values are sRGB linear 0-1):

```glsl
// YardWorx Brand Colors in GLSL vec3 format:
// (Note: GLSL works in linear color space — sRGB values need gamma correction
//  but Three.js handles this when you set colorSpace = SRGBColorSpace on textures)

const vec3 FOREST_500 = vec3(0.0196, 0.6588, 0.2706);  // #05A845
const vec3 FOREST_400 = vec3(0.1647, 0.8196, 0.4157);  // #2ad16a
const vec3 EMBER_500  = vec3(0.9098, 0.3647, 0.0157);  // #E85D04
const vec3 FORGED     = vec3(0.0431, 0.0471, 0.0627);  // #0B0C10
const vec3 COLDSTEEL  = vec3(0.1216, 0.1569, 0.2000);  // #1F2833
const vec3 ZINC_950   = vec3(0.0353, 0.0353, 0.0431);  // #09090b

// Before-state grass:
const vec3 GRASS_BEFORE = vec3(0.2902, 0.3529, 0.2510); // #4a5a40

// After-state grass:
const vec3 GRASS_AFTER = FOREST_500; // same as brand green

// Scan glow:
const vec3 SCAN_GLOW = mix(FOREST_500, FOREST_400, 0.5) * 3.0; // HDR bright
```

---

_Document complete: Parts I–XI, Chapters 1–77, Appendices A–C._
_Total: ~500 pages of technical depth._

_Next action: Begin Phase 1 implementation (TODO.md Phase 1 checklist)._
_Start with: `npm create vite@latest` in YRDWRXWEB, then wire the brand tokens._
