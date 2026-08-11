export type MeltPalette = 'inferno' | 'oil' | 'violet'

// gradient-map ramps: index 0 = full ink, last = paper. the mishko recipe
// is a grayscale melt pass recolored entirely by this one LUT
export const PALETTES: Record<MeltPalette, { stops: string[]; dark: boolean }> =
  {
    inferno: {
      stops: [
        '#0d020f',
        '#2a0a4a',
        '#88226a',
        '#e35933',
        '#f9950a',
        '#f8c932',
        '#f2e7cf',
      ],
      dark: false,
    },
    oil: {
      stops: [
        '#f4ffe9',
        '#9adbc8',
        '#31c49f',
        '#7b2d8b',
        '#232a55',
        '#0b0b12',
        '#05060a',
      ],
      dark: true,
    },
    violet: {
      stops: [
        '#120520',
        '#3b0a6b',
        '#6a1fb8',
        '#9b4dff',
        '#cbb5ee',
        '#e2ddf0',
        '#e8e4f2',
      ],
      dark: false,
    },
  }

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform sampler2D uText;
uniform sampler2D uLut;
uniform sampler2D uHeat;
uniform vec2 uRes;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * noise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float heat = texture2D(uHeat, uv).r;
  float columns = fbm(vec2(uv.x * 7.0, uTime * 0.06));
  float wave = fbm(vec2(uv.x * 16.0 + 31.0, uv.y * 2.0 + uTime * 0.12));
  float drip = (0.085 + 0.34 * heat) * (0.25 + 0.75 * columns);
  float sway = (wave - 0.5) * (0.016 + 0.06 * heat);
  float ink = 1.0;
  for (int i = 0; i < 9; i++) {
    float f = float(i) / 8.0;
    vec2 p = vec2(uv.x + sway * f, uv.y + drip * f);
    float tap = texture2D(uText, p).r;
    ink = min(ink, tap + f * 0.52);
  }
  float t = smoothstep(0.08, 0.94, ink);
  t += (hash(gl_FragCoord.xy + fract(uTime) * 61.7) - 0.5) * 0.09;
  float vig = smoothstep(1.3, 0.45, distance(uv, vec2(0.5)));
  t = mix(t * 0.93 + 0.03, t, vig);
  gl_FragColor = vec4(texture2D(uLut, vec2(clamp(t, 0.01, 0.99), 0.5)).rgb, 1.0);
}
`

const TEXT_SIZE = 1024
const HEAT_SIZE = 96

export type MeltEngine = {
  setPhrase: (phrase: string, gothic: boolean) => void
  setPalette: (palette: MeltPalette) => void
  snapshot: () => string
  destroy: () => void
}

type Families = { display: string; gothic: string }

const compile = (gl: WebGLRenderingContext, kind: number, source: string) => {
  const shader = gl.createShader(kind)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return shader
}

const makeTexture = (gl: WebGLRenderingContext, unit: number) => {
  const texture = gl.createTexture()
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return texture
}

const fitLines = (
  ctx: CanvasRenderingContext2D,
  lines: string[],
  family: string,
) => {
  const target = TEXT_SIZE * 0.82
  let size = 300
  ctx.font = `900 ${size}px ${family}`
  const widest = Math.max(
    ...lines.map((line) => ctx.measureText(line).width),
    1,
  )
  size = Math.min(300 * (target / widest), TEXT_SIZE / (lines.length * 1.08))
  return Math.floor(size)
}

const drawPhrase = (
  canvas: HTMLCanvasElement,
  phrase: string,
  family: string,
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, TEXT_SIZE, TEXT_SIZE)
  const lines = phrase.trim().split(/\s+/).filter(Boolean)
  if (lines.length === 0) return
  const size = fitLines(ctx, lines, family)
  ctx.font = `900 ${size}px ${family}`
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lineHeight = size * 1.04
  const startY = TEXT_SIZE / 2 - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, index) => {
    ctx.fillText(line, TEXT_SIZE / 2, startY + index * lineHeight)
  })
}

const buildLut = (canvas: HTMLCanvasElement, stops: string[]) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const gradient = ctx.createLinearGradient(0, 0, 256, 0)
  stops.forEach((stop, index) => {
    gradient.addColorStop(index / (stops.length - 1), stop)
  })
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 1)
}

export const createMeltEngine = (
  canvas: HTMLCanvasElement,
  families: Families,
  quiet: boolean,
): MeltEngine | null => {
  const gl = canvas.getContext('webgl', { antialias: false })
  if (!gl) return null

  const program = gl.createProgram()
  const vert = compile(gl, gl.VERTEX_SHADER, VERT)
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!program || !vert || !frag) return null
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram, not a React hook
  gl.useProgram(program)

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  const aPos = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const textCanvas = document.createElement('canvas')
  textCanvas.width = TEXT_SIZE
  textCanvas.height = TEXT_SIZE
  const lutCanvas = document.createElement('canvas')
  lutCanvas.width = 256
  lutCanvas.height = 1

  makeTexture(gl, 0)
  makeTexture(gl, 1)
  makeTexture(gl, 2)
  gl.uniform1i(gl.getUniformLocation(program, 'uText'), 0)
  gl.uniform1i(gl.getUniformLocation(program, 'uLut'), 1)
  gl.uniform1i(gl.getUniformLocation(program, 'uHeat'), 2)
  const uRes = gl.getUniformLocation(program, 'uRes')
  const uTime = gl.getUniformLocation(program, 'uTime')

  const heat = new Float32Array(HEAT_SIZE * HEAT_SIZE)
  const heatBytes = new Uint8Array(HEAT_SIZE * HEAT_SIZE)

  const uploadText = () => {
    gl.activeTexture(gl.TEXTURE0)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      textCanvas,
    )
  }

  const uploadLut = () => {
    gl.activeTexture(gl.TEXTURE1)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, lutCanvas)
  }

  const uploadHeat = () => {
    for (let i = 0; i < heat.length; i++) {
      heat[i] *= 0.988
      heatBytes[i] = Math.min(255, heat[i] * 255)
    }
    gl.activeTexture(gl.TEXTURE2)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      HEAT_SIZE,
      HEAT_SIZE,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      heatBytes,
    )
  }

  const splat = (x: number, y: number) => {
    const cx = Math.floor(x * HEAT_SIZE)
    const cy = Math.floor(y * HEAT_SIZE)
    const radius = 9
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = cx + dx
        const py = cy + dy
        if (px < 0 || py < 0 || px >= HEAT_SIZE || py >= HEAT_SIZE) continue
        const falloff = Math.exp(-(dx * dx + dy * dy) / (radius * 2.2))
        const index = py * HEAT_SIZE + px
        heat[index] = Math.min(1.4, heat[index] + falloff * 0.16)
      }
    }
  }

  const onPointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    splat(
      (event.clientX - rect.left) / rect.width,
      1 - (event.clientY - rect.top) / rect.height,
    )
  }
  canvas.addEventListener('pointermove', onPointer)
  canvas.addEventListener('pointerdown', onPointer)

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio, 1.6)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(2, Math.round(rect.width * dpr))
    canvas.height = Math.max(2, Math.round(rect.height * dpr))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(uRes, canvas.width, canvas.height)
  }
  fit()
  const observer = new ResizeObserver(fit)
  observer.observe(canvas)

  const start = performance.now()
  let raf = 0
  const render = () => {
    uploadHeat()
    const elapsed = quiet ? 4.2 : (performance.now() - start) / 1000
    gl.uniform1f(uTime, elapsed)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  const loop = () => {
    render()
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  const engine: MeltEngine = {
    setPhrase: (phrase, gothic) => {
      const family = gothic ? families.gothic : families.display
      const ready = document.fonts.load(`900 120px ${family}`)
      drawPhrase(textCanvas, phrase, family)
      uploadText()
      ready.then(() => {
        drawPhrase(textCanvas, phrase, family)
        uploadText()
      })
    },
    setPalette: (palette) => {
      buildLut(lutCanvas, PALETTES[palette].stops)
      uploadLut()
    },
    snapshot: () => {
      render()
      return canvas.toDataURL('image/png')
    },
    destroy: () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerdown', onPointer)
    },
  }
  return engine
}
