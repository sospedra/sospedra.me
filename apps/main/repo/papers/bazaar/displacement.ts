// Port of the "nav displacement map" pen: https://codepen.io/AlainBarrios/pen/NQWzzz
const DURATION_MS = 800

const VERTEX_SHADER = `
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
`

const FRAGMENT_SHADER = `
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
`

const easeOutCubic = (t: number) => {
  const shifted = t - 1
  return shifted * shifted * shifted + 1
}

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null
  return shader
}

const linkProgram = (gl: WebGLRenderingContext) => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vertex || !fragment) return null
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  return program
}

const createSlotTexture = (gl: WebGLRenderingContext, unit: number) => {
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
}

export type DisplacementRenderer = {
  readonly lost: boolean
  setActive: (image: HTMLImageElement) => void
  transitionTo: (image: HTMLImageElement, onDone: () => void) => void
  destroy: () => void
}

export const createDisplacementRenderer = (
  canvas: HTMLCanvasElement,
): DisplacementRenderer | null => {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    depth: false,
    stencil: false,
  })
  if (!gl) return null
  const program = linkProgram(gl)
  if (!program) return null

  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL method, not a React hook.
  gl.useProgram(program)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  )
  const aPosition = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(aPosition)
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

  const uniforms = {
    progress: gl.getUniformLocation(program, 'uProgress'),
    scaleFrom: gl.getUniformLocation(program, 'uScaleFrom'),
    scaleTo: gl.getUniformLocation(program, 'uScaleTo'),
    from: gl.getUniformLocation(program, 'uFrom'),
    to: gl.getUniformLocation(program, 'uTo'),
  }
  gl.uniform1i(uniforms.from, 0)
  gl.uniform1i(uniforms.to, 1)
  createSlotTexture(gl, 0)
  createSlotTexture(gl, 1)

  let lost = false
  let frame = 0
  let start = 0
  let pendingImage: HTMLImageElement | null = null
  let activeDone: (() => void) | null = null
  let aspectFrom = 1
  let aspectTo = 1

  // flush the in-flight completion: a swallowed onDone leaves the caller's
  // overlay canvas at opacity 1, frozen over the content
  canvas.addEventListener(
    'webglcontextlost',
    () => {
      lost = true
      cancelAnimationFrame(frame)
      activeDone?.()
      activeDone = null
    },
    { once: true },
  )

  const upload = (unit: number, image: HTMLImageElement) => {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    return image.naturalWidth / Math.max(1, image.naturalHeight)
  }

  const coverScale = (aspect: number) => {
    const canvasAspect = canvas.width / Math.max(1, canvas.height)
    if (aspect > canvasAspect) return [canvasAspect / aspect, 1]
    return [1, aspect / canvasAspect]
  }

  const draw = (progress: number) => {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.uniform1f(uniforms.progress, progress)
    gl.uniform2fv(uniforms.scaleFrom, coverScale(aspectFrom))
    gl.uniform2fv(uniforms.scaleTo, coverScale(aspectTo))
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const finish = (onDone: () => void) => {
    if (pendingImage) {
      aspectFrom = upload(0, pendingImage)
      pendingImage = null
    }
    activeDone = null
    onDone()
  }

  const setActive = (image: HTMLImageElement) => {
    if (lost) return
    aspectFrom = upload(0, image)
  }

  const transitionTo = (image: HTMLImageElement, onDone: () => void) => {
    if (lost) {
      onDone()
      return
    }
    cancelAnimationFrame(frame)
    activeDone = onDone
    pendingImage = image
    aspectTo = upload(1, image)
    start = performance.now()
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / DURATION_MS)
      draw(easeOutCubic(t))
      if (t < 1) {
        frame = requestAnimationFrame(tick)
        return
      }
      finish(onDone)
    }
    tick()
  }

  const destroy = () => {
    cancelAnimationFrame(frame)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  return {
    get lost() {
      return lost
    },
    setActive,
    transitionTo,
    destroy,
  }
}
