uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
uniform float uSweepH; uniform float uEx;
uniform vec3 uSunDir; uniform float uSunI; uniform vec3 uSunCol;
uniform float uPkStart; uniform float uPkSpan;
varying vec3 vColor; varying vec3 vNormal;
varying vec3 vWorldPos; varying float vFogZ;
void main(){
  float f = smoothstep(fogNear, fogFar, vFogZ);
  vec3 N = normalize(vNormal);
  float sh = clamp(dot(N, uSunDir), 0.0, 1.0);
  float amb = mix(0.85, 0.55, uSunI);
  float dif = mix(0.10, 0.60, uSunI);
  vec3 col = vColor * amb
           + vColor * uSunCol * (dif * sh)
           + vColor * 0.06 * clamp(N.y, 0.0, 1.0);
  float g1 = fract(sin(dot(floor(vWorldPos.xz*0.030), vec2(127.1,311.7)))*43758.5453);
  float g2 = fract(sin(dot(floor(vWorldPos.xz*0.008), vec2(269.5,183.3)))*43758.5453);
  col *= 1.0 + (g1*0.62 + g2*0.38 - 0.5) * 0.16 * (1.0 - f*0.85);
  float th = vWorldPos.y / uEx;
  float pk = uPkSpan > 0.0
    ? clamp((th - uPkStart) / uPkSpan, 0.0, 1.0) : 0.0;
  pk = pk * pk * (3.0 - 2.0 * pk);
  col = mix(col, vec3(0.30, 1.0, 0.45) * 0.85, pk * 0.8);
  col += vec3(0.25, 1.0, 0.42) * pk * pk * 0.30;
  float d = (th - uSweepH) / 110.0;
  col += vec3(0.30, 1.0, 0.45) * exp(-d*d) * 0.10;
  gl_FragColor = vec4(mix(col, fogColor, f), 1.0);
}
