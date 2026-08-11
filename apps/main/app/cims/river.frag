uniform float uTime;
uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
varying float vDist; varying float vFogZ;
void main(){
  float w = 0.5 + 0.5 * sin(vDist * 0.0011 - uTime * 2.2);
  vec3 col = vec3(0.55, 0.92, 0.60) * (0.28 + 0.72 * w);
  float f = smoothstep(fogNear, fogFar, vFogZ);
  gl_FragColor = vec4(mix(col, vec3(0.0), f), 1.0);
}
