import { IDLE_WAVE, type WaveParams } from './signal.ts'
import FRAGMENT_SHADER from './wave.frag?raw'
import VERTEX_SHADER from './wave.vert?raw'

const QUAD = new Float32Array([
  -1, -1, 0, 1, -1, 0, -1, 1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0,
])

const UNIFORM_NAMES = [
  'resolution',
  'time',
  'frequency',
  'amplitude',
  'split',
  'tint',
  'pulse',
] as const

type UniformName = (typeof UNIFORM_NAMES)[number]

type Pipeline = {
  locations: Record<UniformName, WebGLUniformLocation>
}

type Motion = {
  current: {
    frequency: number
    amplitude: number
    split: number
    tint: [number, number, number]
  }
  target: WaveParams
  pulse: number
  time: number
}

export type WaveHandle = {
  retune: (target: WaveParams) => void
}

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Shader allocation failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed')
  }
  return shader
}

const linkProgram = (gl: WebGLRenderingContext): WebGLProgram => {
  const program = gl.createProgram()
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER))
  gl.attachShader(
    program,
    compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER),
  )
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed')
  }
  return program
}

const uniformLocations = (
  gl: WebGLRenderingContext,
  program: WebGLProgram,
): Pipeline['locations'] => {
  const entries = UNIFORM_NAMES.map((name) => {
    const location = gl.getUniformLocation(program, name)
    if (!location) throw new Error(`Missing uniform: ${name}`)
    return [name, location] as const
  })
  return Object.fromEntries(entries) as Pipeline['locations']
}

const createPipeline = (gl: WebGLRenderingContext): Pipeline => {
  const program = linkProgram(gl)
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0)
  return { locations: uniformLocations(gl, program) }
}

const createMotion = (): Motion => ({
  current: {
    frequency: IDLE_WAVE.frequency,
    amplitude: IDLE_WAVE.amplitude,
    split: IDLE_WAVE.split,
    tint: [...IDLE_WAVE.tint],
  },
  target: IDLE_WAVE,
  pulse: 0,
  time: 0,
})

const TIME_RATE = 0.6
const EASE_RATE = 4
const PULSE_DECAY_RATE = 5

const step = (motion: Motion, dt: number): void => {
  const ease = 1 - Math.exp(-dt * EASE_RATE)
  const { current, target } = motion
  current.frequency += (target.frequency - current.frequency) * ease
  current.amplitude += (target.amplitude - current.amplitude) * ease
  current.split += (target.split - current.split) * ease
  for (const channel of [0, 1, 2] as const) {
    current.tint[channel] +=
      (target.tint[channel] - current.tint[channel]) * ease
  }
  motion.pulse *= Math.exp(-dt * PULSE_DECAY_RATE)
  motion.time += dt * TIME_RATE
}

const snap = (motion: Motion): void => {
  motion.current = {
    frequency: motion.target.frequency,
    amplitude: motion.target.amplitude,
    split: motion.target.split,
    tint: [...motion.target.tint],
  }
  motion.pulse = 0
}

const resize = (canvas: HTMLCanvasElement, gl: WebGLRenderingContext): void => {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.round(canvas.clientWidth * ratio)
  const height = Math.round(canvas.clientHeight * ratio)
  if (canvas.width === width && canvas.height === height) return
  canvas.width = width
  canvas.height = height
  gl.viewport(0, 0, width, height)
}

const render = (
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  motion: Motion,
): void => {
  const { locations } = pipeline
  gl.uniform2f(
    locations.resolution,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
  )
  gl.uniform1f(locations.time, motion.time)
  gl.uniform1f(locations.frequency, motion.current.frequency)
  gl.uniform1f(locations.amplitude, motion.current.amplitude)
  gl.uniform1f(locations.split, motion.current.split)
  gl.uniform3f(locations.tint, ...motion.current.tint)
  gl.uniform1f(locations.pulse, motion.pulse)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

export const mountWave = (canvas: HTMLCanvasElement): WaveHandle | null => {
  const gl = canvas.getContext('webgl')
  if (!gl) return null

  let pipeline = createPipeline(gl)
  const motion = createMotion()
  const stillMode = window.matchMedia('(prefers-reduced-motion: reduce)')
  let raf = 0
  let last = performance.now()

  const frame = (now: number): void => {
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    resize(canvas, gl)
    step(motion, dt)
    render(gl, pipeline, motion)
    raf = window.requestAnimationFrame(frame)
  }

  const renderStill = (): void => {
    resize(canvas, gl)
    snap(motion)
    render(gl, pipeline, motion)
  }

  const start = (): void => {
    last = performance.now()
    raf = window.requestAnimationFrame(frame)
  }

  const restart = (): void => {
    window.cancelAnimationFrame(raf)
    if (stillMode.matches) renderStill()
    else start()
  }

  restart()
  stillMode.addEventListener('change', restart)
  window.addEventListener('resize', () => {
    if (stillMode.matches) renderStill()
  })
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    window.cancelAnimationFrame(raf)
  })
  canvas.addEventListener('webglcontextrestored', () => {
    pipeline = createPipeline(gl)
    restart()
  })

  return {
    retune: (target) => {
      motion.target = target
      motion.pulse = 1
      if (stillMode.matches) renderStill()
    },
  }
}
