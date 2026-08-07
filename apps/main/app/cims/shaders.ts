import { Color, Vector2, Vector3 } from 'three'
import { EDGE_GLOW } from './palette.ts'

export const TERRAIN_VERTEX = /* glsl */ `
varying vec3 vColor; varying vec3 vNormal;
varying vec3 vWorldPos; varying float vFogZ;
void main(){
  vColor = color;
  vNormal = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`

export const TERRAIN_FRAGMENT = /* glsl */ `
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
}`

export const RIVER_VERTEX = /* glsl */ `
attribute float aDist;
varying float vDist; varying float vFogZ;
void main(){
  vDist = aDist;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogZ = -mv.z;
  gl_Position = projectionMatrix * mv;
}`

export const RIVER_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 fogColor; uniform float fogNear; uniform float fogFar;
varying float vDist; varying float vFogZ;
void main(){
  float w = 0.5 + 0.5 * sin(vDist * 0.0011 - uTime * 2.2);
  vec3 col = vec3(0.55, 0.92, 0.60) * (0.28 + 0.72 * w);
  float f = smoothstep(fogNear, fogFar, vFogZ);
  gl_FragColor = vec4(mix(col, vec3(0.0), f), 1.0);
}`

export const EDGE_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

export const EDGE_FRAGMENT = /* glsl */ `
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
}`

export const terrainUniforms = (ex: number) => ({
  fogColor: { value: new Color() },
  fogNear: { value: 1 },
  fogFar: { value: 2 },
  uSweepH: { value: 0 },
  uEx: { value: ex },
  uSunDir: { value: new Vector3(0, 1, 0) },
  uSunI: { value: 0 },
  uSunCol: { value: new Color(1, 1, 1) },
  uPkStart: { value: 0 },
  uPkSpan: { value: 0 },
})

export const riverUniforms = () => ({
  uTime: { value: 0 },
  fogColor: { value: new Color() },
  fogNear: { value: 1 },
  fogFar: { value: 2 },
})

export const edgeUniforms = () => ({
  tDepth: { value: null },
  res: { value: new Vector2(1, 1) },
  near: { value: 2 },
  far: { value: 1500000 },
  fogNear: { value: 1 },
  fogFar: { value: 2 },
  edgeColor: { value: new Color(EDGE_GLOW) },
  strength: { value: 1.0 },
})
