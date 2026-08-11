uniform sampler2D tDepth; uniform vec2 res;
uniform float near; uniform float far;
uniform float fogNear; uniform float fogFar;
uniform vec3 edgeColor; uniform float strength;
varying vec2 vUv;
float lin(float d){
  float z = d * 2.0 - 1.0;
  return (2.0 * near * far) / (far + near - z * (far - near));
}
void main(){
  vec2 px = 1.0 / res;
  float c = lin(texture2D(tDepth, vUv).x);
  float m1 = c;
  m1 = max(m1, lin(texture2D(tDepth, vUv + vec2(px.x, 0.0)).x));
  m1 = max(m1, lin(texture2D(tDepth, vUv - vec2(px.x, 0.0)).x));
  m1 = max(m1, lin(texture2D(tDepth, vUv + vec2(0.0, px.y)).x));
  m1 = max(m1, lin(texture2D(tDepth, vUv - vec2(0.0, px.y)).x));
  float m2 = c;
  m2 = max(m2, lin(texture2D(tDepth, vUv + px*1.8).x));
  m2 = max(m2, lin(texture2D(tDepth, vUv - px*1.8).x));
  m2 = max(m2, lin(texture2D(tDepth, vUv + vec2(px.x,-px.y)*1.8).x));
  m2 = max(m2, lin(texture2D(tDepth, vUv - vec2(px.x,-px.y)*1.8).x));
  float e = max(smoothstep(0.02, 0.09, (m1-c)/c),
                0.6 * smoothstep(0.03, 0.12, (m2-c)/c));
  float f = smoothstep(fogNear, fogFar, c);
  e *= (1.0 - 0.85*f);
  gl_FragColor = vec4(edgeColor * e * strength, 1.0);
}
