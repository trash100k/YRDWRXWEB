export const SCAN_VERTEX_SHADER = /* glsl */`
  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPos4 = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos4.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos4;
  }
`

export const SCAN_FRAGMENT_SHADER = /* glsl */`
  uniform float uScanZ;
  uniform float uScanBand;
  uniform vec3  uBeforeColor;
  uniform vec3  uAfterColor;
  uniform vec3  uGlowColor;
  uniform float uGlowIntensity;
  uniform float uScanProgress;
  uniform float uRoughness;

  varying vec3 vWorldPos;
  varying vec2 vUv;

  void main() {
    float scanDist = (vWorldPos.z - uScanZ) / uScanBand;
    float t = 1.0 - smoothstep(-1.0, 0.0, scanDist);
    t = clamp(t, 0.0, 1.0);

    float overshoot = exp(-abs(scanDist - 0.05) * 18.0) * 0.4;
    vec3 brightColor = uAfterColor + vec3(0.2, 0.5, 0.2) * overshoot;
    vec3 albedo = mix(uBeforeColor, brightColor, t);

    float glowFalloff = exp(-scanDist * scanDist * 28.0);
    vec3 glow = uGlowColor * uGlowIntensity * glowFalloff * clamp(uScanProgress * 3.0, 0.0, 1.0);

    float grain = fract(sin(dot(vUv, vec2(127.1, 311.7))) * 43758.5) * 0.04 - 0.02;

    vec3 finalColor = albedo + glow + grain;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

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

  float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p) {
    vec2 i = floor(p); vec2 f = p - i;
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h2(i), h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)),f.x), f.y);
  }

  void main() {
    float windFactor = aBladeTip * aBladeTip;

    vec2 wUv  = (aOffset.xz + vec2(uTime * 1.6, uTime * 0.55)) * 0.12;
    float gust = n2(wUv) * 0.55 + n2(wUv * 2.1 + 3.7) * 0.30 + n2(wUv * 4.3 + 7.1) * 0.15;

    float base = sin(uTime * 1.4 + aPhase) * 0.20 + sin(uTime * 2.1 + aPhase * 1.6) * 0.09;
    float bend = (base + sin(uTime * 0.45 + aOffset.x * 0.18) * gust * 0.24) * uWindStrength * windFactor;

    vec3 pos   = position * aScale;
    pos.x     += bend;
    pos.z     += bend * 0.22;
    pos.y      = max(pos.y, 0.0);

    vec3 worldPos = pos + aOffset;

    float greened = 1.0 - smoothstep(-0.5, 2.0, worldPos.z - uScanZ);
    vGreened  = clamp(greened * uScanProgress * 2.0, 0.0, 1.0);
    vTip      = aBladeTip;
    vWorldPos = worldPos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  }
`

export const GRASS_FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;

  varying float vGreened;
  varying float vTip;
  varying vec3  vWorldPos;

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

    // Subsurface scatter: warm green backlit translucency
    float sss  = pow(vTip, 2.5) * vGreened;
    color += sss * vec3(0.12, 0.62, 0.16) * 0.38;

    // Bioluminescent pulse
    float pulse = 0.5 + 0.5 * sin(uTime * 2.5 + vWorldPos.x * 2.8 + vWorldPos.z * 2.1);
    float bio   = pow(vTip, 3.5) * vGreened * pulse * 0.52;
    color += bio * afterTip;

    // Sporadic sparkle — individual blade flashes
    float spark = pow(max(0.0, sin(uTime * 7.5 + vWorldPos.x * 8.4 + vWorldPos.z * 6.6)), 22.0);
    color += spark * vTip * vGreened * vec3(0.5, 1.0, 0.52) * 0.75;

    gl_FragColor = vec4(color, 1.0);
  }
`

export const FRESNEL_VERTEX_SHADER = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-worldPos.xyz);
    gl_Position = projectionMatrix * worldPos;
  }
`

export const FRESNEL_FRAGMENT_SHADER = /* glsl */`
  uniform vec3  uFresnelColor;
  uniform float uFresnelPower;
  uniform float uOpacity;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), uFresnelPower);
    float pulse = 0.85 + sin(uTime * 2.5) * 0.15;
    float alpha = fresnel * uOpacity * pulse;
    gl_FragColor = vec4(uFresnelColor, alpha);
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

  varying vec3 vDir;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  void main() {
    float h = vDir.y;

    // Zenith → horizon gradient
    float t     = smoothstep(0.0, 0.85, h);
    float above = smoothstep(-0.05, 0.15, h);
    vec3  sky   = mix(uHorizon, mix(uSkyBot, uSkyTop, t), above);

    // Stars fade out as scene greens
    float starFade = clamp(1.0 - uAfter * 2.5, 0.0, 1.0);
    if (h > 0.06 && starFade > 0.01) {
      float sx   = vDir.x / (abs(vDir.y) + 0.001);
      float sz   = vDir.z / (abs(vDir.y) + 0.001);
      float seed = hash(floor(sx * 140.0) + floor(sz * 140.0) * 93.0 + 7.3);
      float brt  = max(0.0, seed - 0.974) / 0.026;
      sky += vec3(brt * 0.80) * starFade * clamp(h, 0.0, 1.0);
    }

    // Subtle star twinkle overlay for extra depth
    float sx2 = vDir.x / (abs(vDir.y) + 0.001) * 0.5;
    float sz2 = vDir.z / (abs(vDir.y) + 0.001) * 0.5;
    float seed2 = hash(floor(sx2 * 240.0) + floor(sz2 * 240.0) * 199.0 + 3.1);
    float dimStar = max(0.0, seed2 - 0.988) / 0.012 * 0.35;
    sky += vec3(dimStar) * starFade * clamp(h, 0.0, 1.0);

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
