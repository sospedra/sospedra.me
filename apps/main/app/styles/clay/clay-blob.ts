import * as THREE from 'three'

const BASE_AMP = 0.16
const NOISE_FREQ = 1.9
const DRIFT = 0.22
const POKE_SECONDS = 1.4
const DPR_CAP = 1.5

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
varying vec3 vNormalView;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x);
  float b = mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x);
  float c = mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x);
  float d = mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x);
  return mix(mix(a, b, f.y), mix(c, d, f.y), f.z);
}

float fbm(vec3 p) {
  float n = 0.5 * vnoise(p);
  n += 0.3 * vnoise(p * 2.3 + 19.7);
  n += 0.2 * vnoise(p * 4.1 + 47.3);
  return n - 0.5;
}

vec3 displace(vec3 p) {
  float bump = fbm(p * uFreq + vec3(uTime));
  return p + normalize(p) * bump * uAmp;
}

void main() {
  vec3 n = normalize(position);
  vec3 tangent = abs(n.y) < 0.99
    ? normalize(cross(n, vec3(0.0, 1.0, 0.0)))
    : vec3(1.0, 0.0, 0.0);
  vec3 bitangent = normalize(cross(n, tangent));
  float eps = 0.08;
  vec3 displaced = displace(position);
  vec3 nearT = displace(normalize(position + tangent * eps));
  vec3 nearB = displace(normalize(position + bitangent * eps));
  vec3 bumpedNormal = normalize(cross(nearT - displaced, nearB - displaced));
  vNormalView = normalize(normalMatrix * bumpedNormal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform sampler2D uMatcap;
varying vec3 vNormalView;

void main() {
  vec3 n = normalize(vNormalView);
  vec2 uv = n.xy * 0.495 + 0.5;
  gl_FragColor = vec4(texture2D(uMatcap, uv).rgb, 1.0);
}
`

const paintRadial = (
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number; r: number },
  stops: [number, string][],
) => {
  const gradient = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, at.r)
  for (const [offset, color] of stops) gradient.addColorStop(offset, color)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
}

const buildMatcapTexture = (): THREE.CanvasTexture => {
  const sheet = document.createElement('canvas')
  sheet.width = 256
  sheet.height = 256
  const ctx = sheet.getContext('2d')
  if (!ctx) throw new Error('matcap canvas has no 2d context')
  ctx.fillStyle = '#9fd8c9'
  ctx.fillRect(0, 0, 256, 256)
  paintRadial(ctx, { x: 128, y: 128, r: 130 }, [
    [0, 'rgb(190 235 222 / 60%)'],
    [0.66, 'rgb(159 216 201 / 0%)'],
    [1, 'rgb(84 130 116 / 62%)'],
  ])
  paintRadial(ctx, { x: 88, y: 78, r: 150 }, [
    [0, 'rgb(255 255 255 / 88%)'],
    [0.4, 'rgb(255 255 255 / 34%)'],
    [1, 'rgb(255 255 255 / 0%)'],
  ])
  paintRadial(ctx, { x: 76, y: 66, r: 34 }, [
    [0, 'rgb(255 255 255 / 92%)'],
    [1, 'rgb(255 255 255 / 0%)'],
  ])
  paintRadial(ctx, { x: 208, y: 214, r: 170 }, [
    [0, 'rgb(64 108 96 / 68%)'],
    [0.55, 'rgb(64 108 96 / 26%)'],
    [1, 'rgb(64 108 96 / 0%)'],
  ])
  return new THREE.CanvasTexture(sheet)
}

// damped spring: amp spikes to ~2.5x on poke, settles within ~1.2s
const pokeEnvelope = (seconds: number) => {
  if (seconds < 0 || seconds > POKE_SECONDS) return 0
  return Math.exp(-3.4 * seconds) * Math.cos(9 * seconds)
}

export type ClayBlob = {
  vertexCount: number
  start: () => void
  stop: () => void
  poke: () => void
  setFrozen: (frozen: boolean) => void
  dispose: () => void
}

export const createClayBlob = (canvas: HTMLCanvasElement): ClayBlob => {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, DPR_CAP))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30)
  camera.position.set(0, 0, 4.1)

  const geometry = new THREE.IcosahedronGeometry(1, 15)
  const matcap = buildMatcapTexture()
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: BASE_AMP },
      uFreq: { value: NOISE_FREQ },
      uMatcap: { value: matcap },
    },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.scale.setScalar(1.18)
  scene.add(mesh)
  canvas.dataset.vertices = String(geometry.attributes.position.count)

  const fit = () => {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  fit()
  const observer = new ResizeObserver(fit)
  observer.observe(canvas)

  let raf = 0
  let last = 0
  let time = 0
  let frozen = false
  let pokedAt = Number.NEGATIVE_INFINITY

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    if (!frozen) {
      time += dt
      mesh.rotation.y += dt * 0.24
      mesh.rotation.x = Math.sin(time * 0.31) * 0.14
    }
    const spring = pokeEnvelope((now - pokedAt) / 1000)
    material.uniforms.uTime.value = time * DRIFT
    material.uniforms.uAmp.value = Math.max(BASE_AMP * (1 + 1.5 * spring), 0.03)
    const squash = 0.2 * spring
    mesh.scale.set(1.18 * (1 + squash * 0.55), 1.18 * (1 - squash), 1.18)
    renderer.render(scene, camera)
    raf = requestAnimationFrame(frame)
  }

  const start = () => {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  const stop = () => {
    cancelAnimationFrame(raf)
    raf = 0
  }

  return {
    vertexCount: geometry.attributes.position.count,
    start,
    stop,
    poke: () => {
      pokedAt = performance.now()
    },
    setFrozen: (next) => {
      frozen = next
    },
    dispose: () => {
      stop()
      observer.disconnect()
      geometry.dispose()
      material.dispose()
      matcap.dispose()
      renderer.dispose()
    },
  }
}
