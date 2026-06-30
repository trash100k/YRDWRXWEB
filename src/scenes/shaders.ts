// ── Grass — multi-octave gust wind, bioluminescent tips, SSS ─────────
export const GRASS_VERTEX_SHADER = /* glsl */`
  attribute float aPhase;
  attribute float aBladeTip;
  attribute vec3  aOffset;
  attribute float aScale;

  uniform float uTime;
  uniform float uWindStrength;
  uniform float uScanZ;
  uniform float uScanProgress;

  varying float vGreened;
  varying float vTip;
  varying vec3  vWorldPos;
  varying vec3  vNormalW;
  varying vec3  vViewW;

  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) {
    vec2 i = floor(p); vec2 f = p - i;
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)),f.x), f.y);
  }
  // Rotation to decorrelate FBM octaves and break grid creasing
  const mat2 fbmRot = mat2(0.8, 0.6, -0.6, 0.8);

  void main() {
    // Growth morph: blade height emerges from ground as scan sweeps through
    float scanDist = aOffset.z - uScanZ;               // > 0 = not yet reached
    float growthT  = clamp(1.0 - scanDist / 2.5, 0.0, 1.0);
    float stagger  = sin(aPhase * 6.2831) * 0.18;     // per-blade timing variation
    float growth   = smoothstep(0.0, 1.0, clamp(growthT + stagger, 0.0, 1.0) * uScanProgress);
    float scaleY   = mix(0.04, 1.0, growth);

    // Spring oscillation: newly-emerged blades wobble before settling
    float wobble = sin(uTime * 9.5 + aPhase * 5.8) * 0.12 * (1.0 - growth) * uScanProgress;
    scaleY = clamp(scaleY + wobble * scaleY, 0.04, 1.14);

    float windFactor = aBladeTip * aBladeTip;

    vec2 wUv  = (aOffset.xz + vec2(uTime * 1.6, uTime * 0.55)) * 0.12;
    vec2 wUv2 = fbmRot * wUv * 2.1 + 3.7;
    vec2 wUv3 = fbmRot * wUv2 * 2.05 + 7.1;
    float gust = n2(wUv) * 0.55 + n2(wUv2) * 0.30 + n2(wUv3) * 0.15;

    float base = sin(uTime * 1.4 + aPhase) * 0.20 + sin(uTime * 2.1 + aPhase * 1.6) * 0.09;
    float bend = (base + sin(uTime * 0.45 + aOffset.x * 0.18) * gust * 0.24) * uWindStrength * windFactor;

    // Height scaled by growth; width stays at aScale so blades don't get thin
    vec3 pos   = vec3(position.x * aScale, position.y * aScale * scaleY, position.z * aScale);
    pos.x     += bend;
    pos.z     += bend * 0.22;
    pos.y      = max(pos.y, 0.0);

    vec3 worldPos = pos + aOffset;

    float greened = 1.0 - smoothstep(-0.5, 2.0, worldPos.z - uScanZ);
    vGreened  = clamp(greened * uScanProgress * 2.0, 0.0, 1.0);
    vTip      = aBladeTip;
    vWorldPos = worldPos;

    // Blade normal in world space: lean the upward normal toward the bend
    // direction so lighting reads the curvature of each blade as it sways.
    vec3 nrm  = normalize(vec3(-bend * 0.6, 1.0, -bend * 0.18 + 0.12));
    vNormalW  = normalize(mat3(modelMatrix) * nrm);

    vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
    vViewW     = normalize(cameraPosition - worldPos);

    gl_Position = projectionMatrix * mvPos;
  }
`

export const GRASS_FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;

  varying float vGreened;
  varying float vTip;
  varying vec3  vWorldPos;
  varying vec3  vNormalW;
  varying vec3  vViewW;

  void main() {
    vec3 beforeBase = vec3(0.20, 0.27, 0.16);
    vec3 afterBase  = vec3(0.018, 0.52, 0.20);
    vec3 afterTip   = vec3(0.16, 0.92, 0.44);
    vec3 beforeTip  = vec3(0.16, 0.23, 0.12);

    // Root-to-tip gradient, before/after blend
    vec3 rootC = mix(beforeBase, afterBase, vGreened);
    vec3 tipC  = mix(beforeTip,  afterTip,  vGreened);
    vec3 color = mix(rootC, tipC, vTip * vTip);

    // Base AO darkening
    color *= mix(0.32, 1.0, vTip);

    // ── Dawn directional lighting ─────────────────────────────────────
    vec3  N = normalize(vNormalW);
    vec3  V = normalize(vViewW);
    vec3  L = normalize(vec3(-0.6, 0.35, -0.7));   // low dawn sun

    // Warm-tinted Lambert key from the rising sun
    float lambert = max(0.0, dot(N, L));
    vec3  sunTint = vec3(1.00, 0.74, 0.42);
    color += color * sunTint * lambert * 0.55;

    // Warm fresnel rim — catches the grazing dawn light on blade edges
    float fres = pow(1.0 - abs(dot(N, V)), 3.0);
    color += fres * vec3(1.00, 0.62, 0.30) * (0.18 + 0.30 * vGreened);

    // Subsurface scatter: warm green backlit translucency, gated so the
    // glow only blooms when looking toward the sun through the blade.
    float backlit = pow(max(0.0, dot(-L, V)), 4.0);
    float sss  = pow(vTip, 2.5) * vGreened * backlit;
    color += sss * vec3(0.12, 0.62, 0.16) * 1.10;

    // Primary bioluminescent pulse — boosted amplitude
    float pulse = 0.5 + 0.5 * sin(uTime * 2.5 + vWorldPos.x * 2.8 + vWorldPos.z * 2.1);
    float bio   = pow(vTip, 3.0) * vGreened * pulse * 0.88;
    color += bio * afterTip;

    // Secondary traveling bio-wave (orthogonal direction, teal tint)
    float pulse2 = 0.5 + 0.5 * sin(uTime * 1.8 + vWorldPos.x * -1.9 + vWorldPos.z * 3.4);
    float bio2   = pow(vTip, 4.0) * vGreened * pulse2 * 0.42;
    color += bio2 * vec3(0.06, 0.72, 0.58);

    // Sporadic sparkle — individual blade flashes
    float spark = pow(max(0.0, sin(uTime * 7.5 + vWorldPos.x * 8.4 + vWorldPos.z * 6.6)), 22.0);
    color += spark * vTip * vGreened * vec3(0.5, 1.0, 0.52) * 0.80;

    // Dew sparkle: tight specular hot-spots on blade tips
    float dew = pow(max(0.0, sin(uTime * 3.8 + vWorldPos.x * 11.3 + vWorldPos.z * 9.7)), 18.0);
    color += dew * vTip * vTip * vGreened * vec3(0.85, 1.0, 0.92) * 1.20;

    gl_FragColor = vec4(color, 1.0);
  }
`

// ── Sky dome — stars → gradient sky ──────────────────────────────────
export const SKY_VERTEX_SHADER = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = (projectionMatrix * modelViewMatrix * vec4(position, 1.0)).xyww;
  }
`

export const SKY_FRAGMENT_SHADER = /* glsl */`
  uniform vec3  uSkyTop;
  uniform vec3  uSkyBot;
  uniform vec3  uHorizon;
  uniform float uAfter;
  uniform float uScanGlow;
  uniform vec3  uSunDir;

  varying vec3 vDir;

  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  // Stars on a stable spherical hash cell at given density
  float starField(vec3 dir, float density, float thresh) {
    vec2  sc   = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
    float seed = hash2(floor(sc * density));
    float h    = max(0.0, seed - thresh) / max(1e-4, 1.0 - thresh);
    return smoothstep(0.04, 0.30, h);
  }

  void main() {
    float h = vDir.y;

    // Base zenith → horizon gradient
    float t     = smoothstep(0.0, 0.85, h);
    float above = smoothstep(-0.08, 0.22, h);
    vec3  sky   = mix(uHorizon, mix(uSkyBot, uSkyTop, t), above);

    // ─── Dramatic pre-dawn / dawn color bands (additive, driven by uAfter) ───
    // Crimson horizon band  (h ≈ -0.05)
    float band0 = exp(-pow((h + 0.05) * 8.0, 2.0));
    sky += vec3(0.82, 0.08, 0.03) * band0 * uAfter * 1.15;

    // Deep orange rise  (h ≈ 0.04)
    float band1 = exp(-pow((h - 0.04) * 6.0, 2.0));
    sky += vec3(1.00, 0.38, 0.05) * band1 * uAfter * 0.88;

    // Golden glow  (h ≈ 0.18)
    float band2 = exp(-pow((h - 0.18) * 4.5, 2.0));
    sky += vec3(0.96, 0.70, 0.16) * band2 * uAfter * 0.52;

    // Purple-violet zenith shift  (h ≈ 0.35)
    float band3 = exp(-pow((h - 0.35) * 3.2, 2.0));
    sky += vec3(0.22, 0.08, 0.48) * band3 * uAfter * 0.38;

    // AI scan energy on horizon — green sweep (h ≈ -0.02)
    float scanBand = exp(-pow((h + 0.02) * 10.0, 2.0));
    sky += vec3(0.04, 0.92, 0.38) * uScanGlow * scanBand * 0.90;

    // Stars: fade with after progress AND scan glow
    float starFade = clamp(1.0 - uAfter * 2.2 - uScanGlow * 2.5, 0.0, 1.0);
    float skyMask  = clamp(h, 0.0, 1.0);
    if (starFade > 0.01) {
      // Bright layer — stable spherical parameterization, soft-faded
      float brt = starField(vDir, 60.0, 0.974);
      sky += vec3(brt * 0.80) * starFade * skyMask;
    }

    // Dim twinkle layer — denser, fainter cells
    float dimStar = starField(vDir, 120.0, 0.988) * 0.35;
    sky += vec3(dimStar) * starFade * skyMask;

    // ─── Always-present sun disc (post-scan) ──────────────────────────
    // Angular proximity of the view ray to the sun direction.
    float sunDot  = dot(normalize(vDir), normalize(uSunDir));
    // Tight, soft-edged disc — the bright body of the sun.
    float disc    = smoothstep(0.9982, 0.9997, sunDot);
    // Wide warm halo bleeding into the surrounding sky.
    float halo    = pow(max(0.0, sunDot), 220.0);
    vec3  sunCore = vec3(1.00, 0.93, 0.74);
    vec3  sunHalo = vec3(1.00, 0.58, 0.22);
    sky += sunCore * disc * uAfter * 1.4;
    sky += sunHalo * halo * uAfter * 0.6;

    // Triangular-PDF dither to kill 8-bit gradient banding
    float d = (hash2(gl_FragCoord.xy) - hash2(gl_FragCoord.yx)) * (1.0 / 255.0);
    sky += d;

    gl_FragColor = vec4(sky, 1.0);
  }
`

// ── Firefly particles ─────────────────────────────────────────────────
export const PARTICLE_VERTEX_SHADER = /* glsl */`
  attribute float aPhase;
  uniform float uTime;
  varying float vFade;
  varying float vPhase;

  void main() {
    float t = fract(uTime * 0.16 + aPhase);

    vec3 pos = position;
    pos.y += t * 5.5;
    pos.x += sin(uTime * 0.72 + aPhase * 4.1) * 0.6;
    pos.z += cos(uTime * 0.53 + aPhase * 2.9) * 0.45;

    vFade  = t < 0.12 ? t / 0.12 : t > 0.78 ? (1.0 - t) / 0.22 : 1.0;
    vPhase = aPhase;

    vec4 mv      = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 5.5 * (460.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`

export const PARTICLE_FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uOpacity;
  varying float vFade;
  varying float vPhase;

  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float r    = length(uv);
    float disc = 1.0 - smoothstep(0.22, 0.5, r);
    float glow = exp(-r * 7.5) * 0.65;
    float alpha = (disc + glow) * uOpacity * vFade;

    float pulse = 0.5 + 0.5 * sin(uTime * 4.2 + vPhase * 6.28318);
    vec3  color = mix(vec3(0.04, 0.65, 0.28), vec3(0.30, 1.0, 0.52), pulse);

    gl_FragColor = vec4(color, alpha);
  }
`

// ── Aerial haze dust — sparse warm-white motes that catch the god rays ─
export const DUST_VERTEX_SHADER = /* glsl */`
  attribute float aPhase;
  uniform float uTime;
  varying float vTw;

  void main() {
    // Slow, near-buoyant drift — large gentle loops, barely moving.
    vec3 pos = position;
    pos.x += sin(uTime * 0.18 + aPhase * 6.1) * 1.1;
    pos.y += sin(uTime * 0.13 + aPhase * 3.7) * 0.6;
    pos.z += cos(uTime * 0.15 + aPhase * 4.9) * 0.9;

    // Lazy twinkle so individual motes shimmer as the shafts cross them.
    vTw = 0.55 + 0.45 * sin(uTime * 0.9 + aPhase * 6.28318);

    vec4 mv      = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (3.2 + sin(aPhase * 5.1) * 1.0) * (300.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`

export const DUST_FRAGMENT_SHADER = /* glsl */`
  uniform float uOpacity;
  varying float vTw;

  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float r    = length(uv);
    float disc = 1.0 - smoothstep(0.10, 0.5, r);
    float glow = exp(-r * 6.0) * 0.55;
    float alpha = (disc + glow) * uOpacity * vTw;

    // Warm-white mote — faint amber bias so it sits in the golden shafts.
    vec3 color = vec3(1.0, 0.93, 0.80);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`

// ── Scan-wake sparkle — particles burst upward from the scan line ─────
export const WAKE_VERTEX_SHADER = /* glsl */`
  attribute float aPhase;
  uniform float uTime;
  uniform float uScanZ;
  varying float vFade;
  varying float vPhase;

  void main() {
    float t    = fract(uTime * 2.1 + aPhase);   // 0→1 lifecycle per particle

    vec3 pos   = position;
    pos.z      = uScanZ + sin(aPhase * 6.2831) * 0.9 + cos(aPhase * 3.7) * t * 1.4;
    pos.y     += t * t * 5.5 + t * 0.3;          // accelerate upward
    pos.x     += sin(aPhase * 13.7 + t * 2.5) * t * 1.6;

    // Sharp fade in, longer fade out
    vFade  = t < 0.08 ? t / 0.08 : (1.0 - t) / 0.92;
    vFade  = clamp(vFade * vFade, 0.0, 1.0);
    vPhase = aPhase;

    vec4 mv      = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (2.5 + sin(aPhase * 7.3) * 1.2) * (320.0 / -mv.z);
    gl_Position  = projectionMatrix * mv;
  }
`

export const WAKE_FRAGMENT_SHADER = /* glsl */`
  uniform float uOpacity;
  uniform float uTime;
  varying float vFade;
  varying float vPhase;

  void main() {
    vec2  uv   = gl_PointCoord - 0.5;
    float r    = length(uv);
    float disc = 1.0 - smoothstep(0.18, 0.5, r);
    float glow = exp(-r * 10.0) * 0.9;
    float alpha = (disc + glow) * uOpacity * vFade;

    float spark  = pow(max(0.0, sin(uTime * 14.0 + vPhase * 9.42)), 7.0);
    vec3  color  = mix(vec3(0.14, 0.92, 0.40), vec3(0.85, 1.0, 0.92), spark);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`

// ── Lens flare — sun starburst billboard ──────────────────────────────
export const FLARE_VERTEX_SHADER = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const FLARE_FRAGMENT_SHADER = /* glsl */`
  uniform float uOpacity;
  uniform float uTime;
  varying vec2  vUv;

  void main() {
    vec2  p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);

    // Soft core
    float core   = exp(-r * r * 9.0);
    float corona  = exp(-r * 2.8) * 0.55;

    // 6-spike starburst
    float spike6  = pow(abs(sin(a * 3.0 + uTime * 0.08)), 14.0) * exp(-r * 3.2);
    // 12-spike finer grating
    float spike12 = pow(abs(sin(a * 6.0 - uTime * 0.04)), 20.0) * exp(-r * 4.8) * 0.35;

    // Horizontal anamorphic streak — cyan-tinted lens flare signature
    float streak = exp(-pow(p.y * 22.0, 2.0)) * exp(-abs(p.x) * 1.8) * 0.6;

    // Diffraction rings with per-channel chromatic dispersion
    float ring1R = exp(-pow((r        - 0.32) * 14.0, 2.0)) * 0.22;
    float ring1G = exp(-pow((r * 1.01 - 0.32) * 14.0, 2.0)) * 0.22;
    float ring1B = exp(-pow((r * 1.02 - 0.32) * 14.0, 2.0)) * 0.22;
    float ring2R = exp(-pow((r        - 0.50) * 20.0, 2.0)) * 0.10;
    float ring2G = exp(-pow((r * 1.01 - 0.50) * 20.0, 2.0)) * 0.10;
    float ring2B = exp(-pow((r * 1.02 - 0.50) * 20.0, 2.0)) * 0.10;
    float ring3R = exp(-pow((r        - 0.68) * 26.0, 2.0)) * 0.06;
    float ring3G = exp(-pow((r * 1.01 - 0.68) * 26.0, 2.0)) * 0.06;
    float ring3B = exp(-pow((r * 1.02 - 0.68) * 26.0, 2.0)) * 0.06;
    vec3  rings  = vec3(ring1R + ring2R + ring3R,
                        ring1G + ring2G + ring3G,
                        ring1B + ring2B + ring3B);

    // Achromatic brightness for core, corona, spikes and streak
    float brightness = core + corona + spike6 + spike12 + streak;

    // Warm sun gradient: white-yellow core → orange rim
    vec3  innerC = vec3(1.0, 0.96, 0.80);
    vec3  outerC = vec3(1.0, 0.55, 0.12);
    vec3  color  = mix(outerC, innerC, core + corona * 0.5);

    // Cyan tint on the anamorphic streak
    vec3  rgb    = color * brightness + vec3(0.55, 0.85, 1.0) * streak + rings;

    float total  = brightness + rings.r + rings.g + rings.b;
    float alpha  = clamp(total * uOpacity, 0.0, 1.0);
    gl_FragColor = vec4(rgb, alpha);
  }
`

// ── Ground energy rings (post-scan expanding pulses) ──────────────────
export const RING_VERTEX_SHADER = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const RING_FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uOpacity;
  varying vec2  vUv;

  void main() {
    vec2  p = vUv * 2.0 - 1.0;
    p.x  *= 1.4; // match scene width/depth
    float r = length(p);

    float speed = 0.19;
    float t1 = mod(uTime * speed,        1.5);
    float t2 = mod(uTime * speed + 0.55, 1.5);
    float t3 = mod(uTime * speed + 1.05, 1.5);

    float w = 13.0;
    float f1 = exp(-pow((r - t1) * w, 2.0)) * (1.0 - t1 / 1.5);
    float f2 = exp(-pow((r - t2) * w, 2.0)) * (1.0 - t2 / 1.5) * 0.65;
    float f3 = exp(-pow((r - t3) * w, 2.0)) * (1.0 - t3 / 1.5) * 0.38;

    float glow = (f1 + f2 + f3) * uOpacity * max(0.0, 1.05 - r * 0.55);
    vec3  color = vec3(0.04, 0.88, 0.38);
    gl_FragColor = vec4(color, clamp(glow, 0.0, 1.0));
  }
`

// ── Morning mist — ground-level wispy fog, clears as scan passes ──────
export const MIST_VERTEX_SHADER = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos4.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos4;
  }
`

export const MIST_FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uScanZ;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) {
    vec2 i = floor(p); vec2 f = p - i;
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)),f.x), f.y);
  }
  const mat2 fbmRot = mat2(0.8, 0.6, -0.6, 0.8);

  void main() {
    vec2 wUv = vWorldPos.xz;

    // Multi-octave drifting noise — rotate between octaves to break the
    // axis-aligned grid creasing of value noise.
    vec2 q1   = wUv * 0.22 + vec2(uTime * 0.040, uTime * 0.025);
    vec2 q2   = fbmRot * q1 * 2.27 + vec2(-uTime * 0.030, uTime * 0.055);
    vec2 q3   = fbmRot * q2 * 2.20 + vec2(uTime * 0.085, -uTime * 0.035);
    float n1  = n2(q1);
    float n2v = n2(q2);
    float n3  = n2(q3);
    float mist = n1 * 0.55 + n2v * 0.30 + n3 * 0.15;
    // Wider noise window so more of the lawn carries fog — the pre-scan
    // morning mist needs to read clearly before the scan burns it away.
    mist = smoothstep(0.34, 0.80, mist);

    // Dissipate as scan sweeps past this position
    float cleared = clamp((uScanZ - vWorldPos.z + 1.5) / 4.0, 0.0, 1.0);
    mist *= (1.0 - cleared * cleared);

    // Rectangular edge soft fade
    vec2 center = abs(vUv - 0.5) * 2.0;
    float edge  = 1.0 - smoothstep(0.60, 1.0, max(center.x, center.y));

    float alpha = mist * edge * uOpacity * 0.34;
    // Dither alpha to suppress banding in the soft fog falloff
    alpha += (h2(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0);
    gl_FragColor = vec4(vec3(0.60, 0.72, 0.88), clamp(alpha, 0.0, 1.0));
  }
`

// ── God-ray shafts — volumetric light from sun billboard ─────────────
export const GOD_RAY_VERTEX_SHADER = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const GOD_RAY_FRAGMENT_SHADER = /* glsl */`
  uniform float uOpacity;
  uniform float uTime;

  varying vec2 vUv;

  float h1(float n) { return fract(sin(n) * 43758.5453); }

  void main() {
    // plane top (vUv.y=1) is the sun/root; bottom (vUv.y=0) is the far tip
    float fromRoot = 1.0 - vUv.y;  // 0 at sun, 1 at far tip

    // Per-shaft faint horizontal jitter so neighbouring rays differ slightly
    float jitter = (h1(floor(vUv.x * 90.0)) - 0.5) * 0.06;
    float xc     = (vUv.x - 0.5) + jitter;

    // Softened side edges
    float edgeX = 1.0 - smoothstep(0.16, 0.52, abs(xc) * 2.0);

    // Exponential fade along length — bright at sun root, invisible at tip
    float lenFade = pow(1.0 - fromRoot, 1.75);

    // Slow shimmer along the ray
    float shimmer = 0.78 + 0.22 * sin(uTime * 1.5 + vUv.y * 10.0);

    float brightness = lenFade * edgeX * shimmer;

    // Warm golden at sun root → orange-amber at tip; smoothstep lets the
    // far tips actually reach the warm amber end of the gradient.
    vec3 rootC = vec3(1.00, 0.90, 0.58);
    vec3 tipC  = vec3(1.00, 0.58, 0.14);
    vec3 color = mix(rootC, tipC, smoothstep(0.0, 1.0, fromRoot));

    float alpha = brightness * uOpacity;
    // Trim the brightness pedestal so the shafts read as light, not haze,
    // and dither the alpha to kill banding across the long falloff.
    alpha += (h1(dot(gl_FragCoord.xy, vec2(0.07, 0.11))) - 0.5) * (1.0 / 255.0);
    gl_FragColor = vec4(color * (brightness + 0.04), clamp(alpha, 0.0, 1.0));
  }
`

// ── Ground aura — bioluminescent noise carpet post-scan ──────────────
export const AURA_VERTEX_SHADER = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos4.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos4;
  }
`

export const AURA_FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) {
    vec2 i = floor(p); vec2 f = p - i;
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)),f.x), f.y);
  }
  const mat2 fbmRot = mat2(0.8, 0.6, -0.6, 0.8);

  void main() {
    vec2 wUv = vWorldPos.xz;

    // Flowing multi-octave noise — rotate between octaves to break grid
    // creasing in the bioluminescent carpet.
    vec2 q1   = wUv * 0.45 + vec2(uTime * 0.10, uTime * 0.07);
    vec2 q2   = fbmRot * q1 * 2.22 + vec2(-uTime * 0.07, uTime * 0.13);
    vec2 q3   = fbmRot * q2 * 2.20 + vec2(uTime * 0.17, -uTime * 0.09);
    float n1  = n2(q1);
    float n2v = n2(q2);
    float n3  = n2(q3);
    float aura = n1 * 0.50 + n2v * 0.30 + n3 * 0.20;
    aura = smoothstep(0.42, 0.82, aura);

    // Organic pulse
    float pulse = 0.72 + 0.28 * sin(uTime * 2.2 + vWorldPos.x * 1.5 + vWorldPos.z * 1.2);
    aura *= pulse;

    // Radial vignette so it fades at scene edges
    vec2  centered = (vUv - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.55, 1.0, length(centered));

    float alpha = aura * edge * uOpacity * 0.26;
    // Dither alpha to suppress banding in the soft glow falloff
    alpha += (h2(gl_FragCoord.xy) - 0.5) * (1.0 / 255.0);
    gl_FragColor = vec4(vec3(0.04, 0.88, 0.42), clamp(alpha, 0.0, 1.0));
  }
`
