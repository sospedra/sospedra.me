uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uGrain;
uniform float uBleeding;
uniform float uVSync;
uniform float uScanlines;
uniform float uVignette;
uniform float uJitter;
uniform float uIntensity;
varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float gaussian(float z, float u, float o) {
  return (1.0 / (o * sqrt(2.0 * 3.1415))) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));
}

vec3 grain(vec2 uv, float time, float intensity) {
  float seed = dot(uv, vec2(12.9898, 78.233));
  float noise = fract(sin(seed) * 43758.5453 + time * 2.0);
  noise = gaussian(noise, 0.0, 0.25);
  return vec3(noise) * intensity;
}

void main() {
  vec2 uv = vUv;
  float time = uTime * 1.8;

  vec2 jitteredUV = uv;
  if (uJitter > 0.01) {
    jitteredUV.x += (random(vec2(floor(time * 60.0))) - 0.5) * 0.003 * uJitter * uIntensity;
    jitteredUV.y += (random(vec2(floor(time * 30.0) + 1.0)) - 0.5) * 0.001 * uJitter * uIntensity;
  }

  if (uVSync > 0.01) {
    float vsyncRoll = sin(time * 2.0 + uv.y * 100.0) * 0.02 * uVSync * uIntensity;
    float vsyncChance = step(0.95, random(vec2(floor(time * 4.0))));
    jitteredUV.y += vsyncRoll * vsyncChance;
  }

  vec4 color = texture2D(tDiffuse, jitteredUV);

  if (uBleeding > 0.01) {
    float bleedAmount = 0.012 * uBleeding * uIntensity;
    float offsetPhase = time * 1.5 + uv.y * 20.0;
    vec2 redOffset = vec2(sin(offsetPhase) * bleedAmount, 0.0);
    vec2 blueOffset = vec2(-sin(offsetPhase * 1.1) * bleedAmount * 0.8, 0.0);
    float r = texture2D(tDiffuse, jitteredUV + redOffset).r;
    float g = texture2D(tDiffuse, jitteredUV).g;
    float b = texture2D(tDiffuse, jitteredUV + blueOffset).b;
    color = vec4(r, g, b, color.a);
  }

  if (uGrain > 0.01) {
    vec3 grainEffect = grain(uv, time, 0.075 * uGrain * uIntensity);
    grainEffect *= (1.0 - color.rgb);
    color.rgb += grainEffect;
  }

  if (uScanlines > 0.01) {
    float scanlineFreq = 600.0 + uScanlines * 400.0;
    float scanlinePattern = sin(uv.y * scanlineFreq) * 0.5 + 0.5;
    color.rgb *= (1.0 - scanlinePattern * 0.1 * uScanlines * uIntensity);
    float horizontalLines = sin(uv.y * scanlineFreq * 0.1) * 0.02 * uScanlines * uIntensity;
    color.rgb *= (1.0 - horizontalLines);
  }

  if (uVignette > 0.01) {
    vec2 vignetteUV = (uv - 0.5) * 2.0;
    color.rgb *= (1.0 - dot(vignetteUV, vignetteUV) * 0.3 * uVignette * uIntensity);
  }

  // overlay compositing: derive alpha from luminance so the page shows through
  // the dark void while the lit ghost and its glow stay visible
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.a = clamp(lum * 1.5, 0.0, 1.0);
  gl_FragColor = color;
}
