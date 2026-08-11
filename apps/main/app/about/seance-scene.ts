import { debounce } from 'es-toolkit'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BackSide,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  OctahedronGeometry,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TetrahedronGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { Pass } from 'three/addons/postprocessing/Pass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import ANALOG_FRAGMENT from './analog.frag'
import ANALOG_VERTEX from './analog.vert'

export type SeanceScene = { dispose: () => void }

type ScreenPoint = { x: number; y: number }

type SeanceSceneOptions = {
  onReady: () => void
  origin: ScreenPoint | null
}

/* seconds for the ghost to grow and fade in from the pixel-ghost spot */
const BIRTH_SECONDS = 0.85

/* palette mirrors the /about pixel ghost: red body, blue pupils, vapor accents */
const PALETTE = {
  ambient: 0x0a0a2e,
  body: 0x140811,
  eye: 0x184cff,
  fireflyCore: 0xffea00,
  fireflyGlow: 0xfff388,
  glow: 0xff2f4f,
  rimBlue: 0x184cff,
  rimCyan: 0x6df7ea,
} as const

const GHOST = {
  emissive: 5.8,
  floatSpeed: 1.6,
  follow: 0.075,
  opacity: 0.88,
  pulseIntensity: 0.6,
  pulseSpeed: 1.6,
  wobble: 0.35,
} as const

const EYES = { decay: 0.95, response: 0.31, threshold: 0.07 } as const
const FIREFLIES = { count: 16, glow: 2.6, speed: 0.04 } as const
const PARTICLES = { cap: 250, pool: 100, spawnMax: 5, spawnMs: 100 } as const
const POINTER = { idleMs: 3500, movingMs: 80, reachX: 11, reachY: 7 } as const
const BLOOM = { radius: 1.25, strength: 0.3, threshold: 0 } as const

const ANALOG = {
  bleeding: 1,
  grain: 0.4,
  intensity: 0.6,
  jitter: 0.4,
  scanlines: 1,
  vignette: 1,
  vsync: 1,
} as const

type GhostRig = { body: Mesh; group: Group; material: MeshStandardMaterial }
type EyeRig = { inner: MeshBasicMaterial; outer: MeshBasicMaterial }

type Firefly = {
  core: MeshBasicMaterial
  glow: MeshBasicMaterial
  mesh: Mesh
  phase: number
  pulse: number
  velocity: Vector3
}

type ParticleSystem = {
  spawn: (origin: Vector3, count: number) => void
  update: (time: number) => void
}

type PointerState = { lastMoveAt: number; ndc: Vector2; speed: Vector2 }

type Ctx = {
  analog: ShaderPass
  birth: number
  composer: EffectComposer
  eyes: EyeRig
  fireflies: Firefly[]
  ghost: GhostRig
  lastFrame: number
  lastSpawnAt: number
  movement: number
  particles: ParticleSystem
  pointer: PointerState
  raf: number
  scratch: { dir: Vector2; prev: Vector3; wander: Vector2 }
  time: number
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

/* place the ghost where the pixel ghost sits, on the z=0 plane it moves in */
function screenToWorld(camera: PerspectiveCamera, point: ScreenPoint): Vector3 {
  const ndc = new Vector3(
    (point.x / window.innerWidth) * 2 - 1,
    -((point.y / window.innerHeight) * 2 - 1),
    0.5,
  )
  ndc.unproject(camera)
  const dir = ndc.sub(camera.position).normalize()
  const distance = -camera.position.z / dir.z
  return camera.position.clone().add(dir.multiplyScalar(distance))
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

const scatter = (scale: number) =>
  new Vector3(rand(-0.5, 0.5), rand(-0.5, 0.5), rand(-0.5, 0.5)).multiplyScalar(
    scale,
  )

function buildRenderer(host: HTMLElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: false,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)
  return renderer
}

function buildComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
) {
  const size = renderer.getSize(new Vector2())
  const composer = new EffectComposer(renderer)
  const renderPass = new RenderPass(scene, camera)
  renderPass.clearAlpha = 0
  const bloom = new UnrealBloomPass(
    size.clone(),
    BLOOM.strength,
    BLOOM.radius,
    BLOOM.threshold,
  )
  const analog = new ShaderPass({
    fragmentShader: ANALOG_FRAGMENT,
    uniforms: {
      tDiffuse: { value: null },
      uBleeding: { value: ANALOG.bleeding },
      uGrain: { value: ANALOG.grain },
      uIntensity: { value: ANALOG.intensity },
      uJitter: { value: ANALOG.jitter },
      uScanlines: { value: ANALOG.scanlines },
      uTime: { value: 0 },
      uVignette: { value: ANALOG.vignette },
      uVSync: { value: ANALOG.vsync },
    },
    vertexShader: ANALOG_VERTEX,
  })
  const output = new OutputPass()
  const passes: Pass[] = [renderPass, bloom, analog, output]
  for (const pass of passes) composer.addPass(pass)
  return { analog, bloom, composer, passes }
}

function buildGhostGeometry(): SphereGeometry {
  const geometry = new SphereGeometry(2, 40, 40)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    if (positions.getY(i) >= -0.2) continue
    const x = positions.getX(i)
    const z = positions.getZ(i)
    const hem =
      Math.sin(x * 5) * 0.35 +
      Math.cos(z * 4) * 0.25 +
      Math.sin((x + z) * 3) * 0.15
    positions.setY(i, -2 + hem)
  }
  geometry.computeVertexNormals()
  return geometry
}

function buildGhost(scene: Scene): GhostRig {
  const material = new MeshStandardMaterial({
    alphaTest: 0.1,
    color: PALETTE.body,
    emissive: PALETTE.glow,
    emissiveIntensity: GHOST.emissive,
    metalness: 0,
    opacity: GHOST.opacity,
    roughness: 0.02,
    side: DoubleSide,
    transparent: true,
  })
  const body = new Mesh(buildGhostGeometry(), material)
  const group = new Group()
  group.add(body)
  scene.add(group)
  return { body, group, material }
}

function buildEyes(parent: Group): EyeRig {
  const socketGeometry = new SphereGeometry(0.45, 16, 16)
  const socketMaterial = new MeshBasicMaterial({ color: 0x000000 })
  const innerGeometry = new SphereGeometry(0.3, 12, 12)
  const outerGeometry = new SphereGeometry(0.525, 12, 12)
  const inner = new MeshBasicMaterial({
    color: PALETTE.eye,
    opacity: 0,
    transparent: true,
  })
  const outer = new MeshBasicMaterial({
    color: PALETTE.eye,
    opacity: 0,
    side: BackSide,
    transparent: true,
  })

  for (const x of [-0.7, 0.7]) {
    const socket = new Mesh(socketGeometry, socketMaterial)
    socket.position.set(x, 0.6, 1.9)
    socket.scale.set(1.1, 1, 0.6)
    const iris = new Mesh(innerGeometry, inner)
    iris.position.set(x, 0.6, 2)
    const halo = new Mesh(outerGeometry, outer)
    halo.position.set(x, 0.6, 1.95)
    parent.add(socket, iris, halo)
  }
  return { inner, outer }
}

function buildLights(scene: Scene) {
  scene.add(new AmbientLight(PALETTE.ambient, 0.08))
  const rimBlue = new DirectionalLight(PALETTE.rimBlue, 1.8)
  rimBlue.position.set(-8, 6, -4)
  const rimCyan = new DirectionalLight(PALETTE.rimCyan, 1.26)
  rimCyan.position.set(8, -4, -6)
  scene.add(rimBlue, rimCyan)
}

function buildFireflies(scene: Scene): Firefly[] {
  const coreGeometry = new SphereGeometry(0.02, 4, 4)
  const glowGeometry = new SphereGeometry(0.08, 8, 8)
  return Array.from({ length: FIREFLIES.count }, () => {
    const core = new MeshBasicMaterial({
      color: PALETTE.fireflyCore,
      opacity: 0.9,
      transparent: true,
    })
    const glow = new MeshBasicMaterial({
      color: PALETTE.fireflyGlow,
      opacity: 0.4,
      side: BackSide,
      transparent: true,
    })
    const mesh = new Mesh(coreGeometry, core)
    mesh.add(new Mesh(glowGeometry, glow))
    mesh.position.set(rand(-20, 20), rand(-15, 15), rand(-10, 10))
    scene.add(mesh)
    return {
      core,
      glow,
      mesh,
      phase: rand(0, Math.PI * 2),
      pulse: rand(2, 5),
      velocity: scatter(FIREFLIES.speed),
    }
  })
}

/* per-frame hot path: plain loops and in-place vector math on purpose */
function updateFireflies(fireflies: Firefly[], time: number) {
  for (const firefly of fireflies) {
    const pulse = Math.sin((time + firefly.phase) * firefly.pulse) * 0.4 + 0.6
    firefly.glow.opacity = FIREFLIES.glow * 0.4 * pulse
    firefly.core.opacity = FIREFLIES.glow * 0.35 * pulse
    firefly.velocity.x += rand(-0.0005, 0.0005)
    firefly.velocity.y += rand(-0.0005, 0.0005)
    firefly.velocity.z += rand(-0.0005, 0.0005)
    firefly.velocity.clampLength(0, FIREFLIES.speed)
    firefly.mesh.position.add(firefly.velocity)
    if (Math.abs(firefly.mesh.position.x) > 30) firefly.velocity.x *= -0.5
    if (Math.abs(firefly.mesh.position.y) > 20) firefly.velocity.y *= -0.5
    if (Math.abs(firefly.mesh.position.z) > 15) firefly.velocity.z *= -0.5
  }
}

type Particle = {
  life: number
  decay: number
  material: MeshBasicMaterial
  mesh: Mesh
  spin: Vector3
  velocity: Vector3
}

function createParticles(scene: Scene): ParticleSystem {
  const geometries = [
    new SphereGeometry(0.05, 6, 6),
    new TetrahedronGeometry(0.04),
    new OctahedronGeometry(0.045),
  ]
  const baseColor = new Color(PALETTE.glow)
  const group = new Group()
  scene.add(group)

  const idle: Mesh[] = []
  const alive: Particle[] = []
  let total = 0

  const buildMesh = () => {
    const geometry = geometries[Math.floor(rand(0, geometries.length))]
    const material = new MeshBasicMaterial({
      alphaTest: 0.1,
      color: baseColor,
      opacity: 0,
      transparent: true,
    })
    const mesh = new Mesh(geometry, material)
    mesh.visible = false
    group.add(mesh)
    return mesh
  }

  for (let i = 0; i < PARTICLES.pool; i++) idle.push(buildMesh())

  const takeMesh = (): Mesh | undefined => {
    const pooled = idle.pop()
    if (pooled) return pooled
    if (total >= PARTICLES.cap - PARTICLES.pool) return undefined
    total += 1
    return buildMesh()
  }

  const spawn = (origin: Vector3, count: number) => {
    for (let i = 0; i < count; i++) {
      const mesh = takeMesh()
      if (!mesh) return
      mesh.visible = true
      const material = mesh.material as MeshBasicMaterial
      material.color.copy(baseColor).offsetHSL(rand(-0.05, 0.05), 0, 0)
      mesh.position.copy(origin).add(scatter(3.5))
      mesh.position.y -= 0.8
      mesh.position.z = origin.z - rand(0.8, 1.4)
      const size = rand(0.6, 1.3)
      mesh.scale.set(size, size, size)
      mesh.rotation.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28))
      alive.push({
        decay: rand(0.005, 0.008),
        life: 1,
        material,
        mesh,
        spin: scatter(0.015),
        velocity: scatter(0.012).add(new Vector3(0, -0.002, -0.006)),
      })
    }
  }

  /* per-frame hot path: swap-pop keeps the alive list allocation-free */
  const update = (time: number) => {
    for (let i = alive.length - 1; i >= 0; i--) {
      const particle = alive[i]
      particle.life -= particle.decay
      if (particle.life <= 0) {
        particle.mesh.visible = false
        particle.material.opacity = 0
        idle.push(particle.mesh)
        alive[i] = alive[alive.length - 1]
        alive.pop()
        continue
      }
      particle.material.opacity = particle.life * 0.85
      particle.mesh.position.add(particle.velocity)
      particle.mesh.position.x +=
        Math.cos(time * 1.8 + particle.mesh.position.y) * 0.0008
      particle.mesh.rotation.x += particle.spin.x
      particle.mesh.rotation.y += particle.spin.y
      particle.mesh.rotation.z += particle.spin.z
    }
  }

  return { spawn, update }
}

function attachPointer(state: PointerState): () => void {
  let lastSample = 0
  const onMove = (event: PointerEvent) => {
    const now = performance.now()
    if (now - lastSample < 16) return
    lastSample = now
    const x = (event.clientX / window.innerWidth) * 2 - 1
    const y = -(event.clientY / window.innerHeight) * 2 + 1
    state.speed.set(x - state.ndc.x, y - state.ndc.y)
    state.ndc.set(x, y)
    state.lastMoveAt = now
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerdown', onMove)
  return () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onMove)
  }
}

function ghostTarget(ctx: Ctx, now: number): Vector2 {
  if (now - ctx.pointer.lastMoveAt < POINTER.idleMs) return ctx.pointer.ndc
  return ctx.scratch.wander.set(
    Math.sin(ctx.time * 0.9) * 0.55,
    Math.cos(ctx.time * 0.7) * 0.4,
  )
}

function applyWobble(
  ctx: Ctx,
  pulse: number,
  targetX: number,
  targetY: number,
) {
  const { body, group } = ctx.ghost
  const direction = ctx.scratch.dir.set(
    targetX - group.position.x,
    targetY - group.position.y,
  )
  if (direction.lengthSq() > 0) direction.normalize()
  const tilt = 0.1 * GHOST.wobble * 0.05
  body.rotation.z = body.rotation.z * 0.95 - direction.x * tilt
  body.rotation.x = body.rotation.x * 0.95 + direction.y * tilt
  body.rotation.y = Math.sin(ctx.time * 1.4) * 0.05 * GHOST.wobble
  const variation =
    1 + Math.sin(ctx.time * 2.1) * 0.025 * GHOST.wobble + pulse * 0.015
  const breath = 1 + Math.sin(ctx.time * 0.8) * 0.012
  const grow = easeOut(ctx.birth)
  body.scale.setScalar(variation * breath * grow)
  ctx.ghost.material.opacity = GHOST.opacity * grow
}

function updateGhost(ctx: Ctx, now: number) {
  const ndc = ghostTarget(ctx, now)
  const targetX = ndc.x * POINTER.reachX
  const targetY = ndc.y * POINTER.reachY
  const group = ctx.ghost.group

  ctx.scratch.prev.copy(group.position)
  // hold at the pixel-ghost spot while it materializes, then release to follow
  const followStep = ctx.birth < 1 ? 0 : GHOST.follow
  group.position.x += (targetX - group.position.x) * followStep
  group.position.y += (targetY - group.position.y) * followStep
  const moved = ctx.scratch.prev.distanceTo(group.position)
  ctx.movement = ctx.movement * EYES.decay + moved * (1 - EYES.decay)

  const time = ctx.time
  group.position.y +=
    Math.sin(time * GHOST.floatSpeed * 1.5) * 0.03 +
    Math.cos(time * GHOST.floatSpeed * 0.7) * 0.018 +
    Math.sin(time * GHOST.floatSpeed * 2.3) * 0.008

  const pulse = Math.sin(time * GHOST.pulseSpeed) * GHOST.pulseIntensity
  ctx.ghost.material.emissiveIntensity =
    GHOST.emissive + pulse + Math.sin(time * 0.6) * 0.12

  applyWobble(ctx, pulse, targetX, targetY)
}

function updateEyes(ctx: Ctx) {
  const moving = ctx.movement > EYES.threshold
  const target = moving ? 1 : 0
  const rate = moving ? EYES.response * 2 : EYES.response
  ctx.eyes.inner.opacity += (target - ctx.eyes.inner.opacity) * rate
  ctx.eyes.outer.opacity = ctx.eyes.inner.opacity * 0.3
}

function spawnTrail(ctx: Ctx, now: number) {
  const pointerMoving = now - ctx.pointer.lastMoveAt < POINTER.movingMs
  if (!pointerMoving || ctx.movement <= 0.005) return
  if (now - ctx.lastSpawnAt <= PARTICLES.spawnMs) return
  ctx.lastSpawnAt = now
  const speed = ctx.pointer.speed.length() * 24
  const count = Math.min(PARTICLES.spawnMax, Math.max(1, Math.floor(speed)))
  ctx.particles.spawn(ctx.ghost.group.position, count)
}

function tick(ctx: Ctx, timestamp: number) {
  ctx.raf = requestAnimationFrame((next) => tick(ctx, next))
  const delta = timestamp - ctx.lastFrame
  ctx.lastFrame = timestamp
  if (delta <= 0 || delta > 100) return
  ctx.time += (delta / 16.67) * 0.01
  ctx.birth = Math.min(1, ctx.birth + delta / 1000 / BIRTH_SECONDS)

  updateGhost(ctx, timestamp)
  updateEyes(ctx)
  updateFireflies(ctx.fireflies, ctx.time)
  spawnTrail(ctx, timestamp)
  ctx.particles.update(ctx.time)
  ctx.analog.uniforms.uTime.value = ctx.time
  ctx.composer.render()
}

function disposeObject(object: Object3D) {
  if (!(object instanceof Mesh)) return
  object.geometry.dispose()
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material]
  for (const material of materials) material.dispose()
}

export function createSeanceScene(
  host: HTMLElement,
  options: SeanceSceneOptions,
): SeanceScene {
  const scene = new Scene()
  const camera = new PerspectiveCamera(
    75,
    host.clientWidth / Math.max(1, host.clientHeight),
    0.1,
    1000,
  )
  camera.position.z = 20
  // unproject needs a current world matrix; no render has run yet
  camera.updateMatrixWorld(true)

  const renderer = buildRenderer(host)
  const { analog, bloom, composer, passes } = buildComposer(
    renderer,
    scene,
    camera,
  )
  buildLights(scene)
  const ghost = buildGhost(scene)
  const eyes = buildEyes(ghost.group)
  const fireflies = buildFireflies(scene)
  const particles = createParticles(scene)

  if (options.origin) {
    ghost.group.position.copy(screenToWorld(camera, options.origin))
  }
  ghost.body.scale.setScalar(0)
  ghost.material.opacity = 0

  const ctx: Ctx = {
    analog,
    birth: 0,
    composer,
    eyes,
    fireflies,
    ghost,
    lastFrame: 0,
    lastSpawnAt: 0,
    movement: 0,
    particles,
    pointer: {
      lastMoveAt: Number.NEGATIVE_INFINITY,
      ndc: new Vector2(),
      speed: new Vector2(),
    },
    raf: 0,
    scratch: { dir: new Vector2(), prev: new Vector3(), wander: new Vector2() },
    time: 0,
  }

  const applySize = () => {
    const { clientHeight, clientWidth } = host
    if (clientWidth === 0 || clientHeight === 0) return
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(clientWidth, clientHeight)
    composer.setSize(clientWidth, clientHeight)
    bloom.setSize(clientWidth, clientHeight)
  }
  const onResize = debounce(applySize, 250)
  const observer = new ResizeObserver(onResize)
  observer.observe(host)
  const detachPointer = attachPointer(ctx.pointer)

  particles.spawn(ghost.group.position, 10)
  composer.render()
  composer.render()
  options.onReady()
  ctx.raf = requestAnimationFrame((timestamp) => {
    ctx.lastFrame = timestamp
    tick(ctx, timestamp)
  })

  const dispose = () => {
    cancelAnimationFrame(ctx.raf)
    observer.disconnect()
    onResize.cancel()
    detachPointer()
    scene.traverse(disposeObject)
    for (const pass of passes) pass.dispose()
    composer.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { dispose }
}
