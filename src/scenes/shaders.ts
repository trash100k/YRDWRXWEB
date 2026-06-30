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

    // Overshoot: briefly flash brighter (forest-300) before settling
    float overshoot = exp(-abs(scanDist - 0.05) * 18.0) * 0.4;
    vec3 brightColor = uAfterColor + vec3(0.2, 0.5, 0.2) * overshoot;
    vec3 albedo = mix(uBeforeColor, brightColor, t);

    // Edge glow
    float glowFalloff = exp(-scanDist * scanDist * 28.0);
    vec3 glow = uGlowColor * uGlowIntensity * glowFalloff * clamp(uScanProgress * 3.0, 0.0, 1.0);

    // Subtle noise-like variation via uv
    float grain = fract(sin(dot(vUv, vec2(127.1, 311.7))) * 43758.5) * 0.04 - 0.02;

    vec3 finalColor = albedo + glow + grain;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

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

  void main() {
    float windFactor = aBladeTip * aBladeTip; // quadratic — tip bends most

    float wave1 = sin(uTime * 1.4 + aPhase) * 0.12;
    float wave2 = sin(uTime * 2.1 + aPhase * 1.6) * 0.06;
    float wave3 = sin(uTime * 0.6 + aPhase * 3.3) * 0.03;
    float windBend = (wave1 + wave2 + wave3) * uWindStrength * windFactor;

    vec3 pos = position * aScale;
    pos.x += windBend;
    pos.y = max(pos.y, 0.0);

    vec3 worldPos = pos + aOffset;

    // Greening wave from scan plane
    float greened = 1.0 - smoothstep(-0.5, 1.5, worldPos.z - uScanZ);
    vGreened = clamp(greened * uScanProgress * 2.0, 0.0, 1.0);
    vTip = aBladeTip;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  }
`

export const GRASS_FRAGMENT_SHADER = /* glsl */`
  uniform float uTime;

  varying float vGreened;
  varying float vTip;

  void main() {
    vec3 beforeColor = vec3(0.24, 0.31, 0.21);
    vec3 afterColor  = vec3(0.02, 0.66, 0.27);
    vec3 tipAfter    = vec3(0.17, 0.85, 0.41);

    vec3 base = mix(beforeColor, afterColor, vGreened);
    vec3 color = mix(base, mix(beforeColor * 1.2, tipAfter, vGreened), vTip);

    float emissive = vGreened * 0.08 * (0.9 + sin(uTime * 2.0 + vTip * 3.14) * 0.1);
    color += emissive * afterColor;

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
