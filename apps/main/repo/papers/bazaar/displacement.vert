attribute vec2 aPosition;

uniform vec2 uScaleFrom;
uniform vec2 uScaleTo;

varying vec2 vUvFrom;
varying vec2 vUvTo;

void main() {
  vec2 uv = aPosition * 0.5 + 0.5;
  vUvFrom = (uv - 0.5) * uScaleFrom + 0.5;
  vUvTo = (uv - 0.5) * uScaleTo + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
