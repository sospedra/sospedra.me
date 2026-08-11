precision mediump float;

varying vec2 vUvFrom;
varying vec2 vUvTo;

uniform float uProgress;
uniform sampler2D uFrom;
uniform sampler2D uTo;

void main() {
  float lift = (1.0 - uProgress) * (texture2D(uTo, vUvTo).r * 0.3) * 2.0;
  vec4 from = texture2D(uFrom, vec2(vUvFrom.x, vUvFrom.y + lift)) * (1.0 - uProgress);
  vec4 to = texture2D(uTo, vec2(vUvTo.x, vUvTo.y - lift)) * uProgress;
  gl_FragColor = from + to;
}
