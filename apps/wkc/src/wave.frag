precision highp float;
uniform vec2 resolution;
uniform float time;
uniform float frequency;
uniform float amplitude;
uniform float split;
uniform vec3 tint;
uniform float pulse;

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

  float d = length(p) * split;

  float rx = p.x * (1.0 + d);
  float gx = p.x;
  float bx = p.x * (1.0 - d);

  float glow = 0.045 + pulse * 0.09;
  float r = glow / abs(p.y + sin((rx + time) * frequency) * amplitude);
  float g = glow / abs(p.y + sin((gx + time) * frequency) * amplitude);
  float b = glow / abs(p.y + sin((bx + time) * frequency) * amplitude);

  gl_FragColor = vec4(vec3(r, g, b) * tint, 1.0);
}
