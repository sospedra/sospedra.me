import { jukeSfx, TEMPO } from './juke-sfx'
import { type JukeRecord, RECORDS, selectorCode } from './records'

export type ArmPose = 'rest' | 'lift' | 'play'

export type DomeHandle = {
  carrier: HTMLDivElement
  glare: HTMLDivElement
  magazine: HTMLDivElement
  scope: HTMLCanvasElement
}

export type PlayContext = {
  handle: DomeHandle
  record: JukeRecord
  onPlatter: JukeRecord
  reduceMotion: boolean
  setArmPose: (pose: ArmPose) => void
  setPlatterRecord: (record: JukeRecord) => void
  setLampText: (text: string) => void
}

// mechanical timings, one table, no inline magic
const T = {
  armLift: 360,
  armDrop: 380,
  exit: 520,
  shuffle: 650,
  entry: 680,
  landClack: 470,
  glareOut: 260,
  glareIn: 240,
  glareInDelay: 430,
  reduceGo: 220,
  bar: TEMPO.barMs + 150,
} as const

const HIDDEN_POSE = 'translateY(-118%) rotateY(84deg) scale(.24)'

export function codeOf(record: JukeRecord): string {
  return selectorCode(RECORDS.indexOf(record))
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      resolve()
    })
  })
}

function hotSlat(
  magazine: HTMLDivElement,
  record: JukeRecord,
): Element | undefined {
  const slats = magazine.children
  const num = Number.parseInt(codeOf(record).slice(1), 10) || 3
  const index = Math.max(
    0,
    Math.min(slats.length - 1, Math.floor(slats.length / 2) + num - 3),
  )
  return slats[index]
}

// the record swap: old record spins up into the magazine, flips edge-on,
// files itself. the magazine shuffles, the picked slat glows. the new
// record drops face-on and lands with a bounce and a clack.
async function animateSwap(
  handle: DomeHandle,
  record: JukeRecord,
  setPlatterRecord: (record: JukeRecord) => void,
): Promise<void> {
  const { carrier, glare, magazine } = handle
  const hot = hotSlat(magazine, record)

  jukeSfx.whoosh()
  const glareOut = glare.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: T.glareOut,
    fill: 'forwards',
  })
  const exit = carrier.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: HIDDEN_POSE, opacity: 0 },
    ],
    { duration: T.exit, easing: 'cubic-bezier(.5,0,.9,.4)', fill: 'forwards' },
  )
  await exit.finished

  setPlatterRecord(record)
  hot?.setAttribute('data-hot', '')
  await magazine.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-30px)', offset: 0.45 },
      { transform: 'translateX(9px)', offset: 0.75 },
      { transform: 'translateX(0)' },
    ],
    { duration: T.shuffle, easing: 'ease-in-out' },
  ).finished

  window.setTimeout(() => jukeSfx.clack(), T.landClack)
  const entry = carrier.animate(
    [
      { transform: HIDDEN_POSE, opacity: 0 },
      {
        transform: 'translateY(-6%) rotateY(0deg) scale(1.03)',
        opacity: 1,
        offset: 0.72,
      },
      { transform: 'none', opacity: 1 },
    ],
    { duration: T.entry, easing: 'cubic-bezier(.16,.9,.3,1)' },
  )
  exit.cancel()
  glare.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: T.glareIn,
    delay: T.glareInDelay,
  })
  await entry.finished
  glareOut.cancel()
  for (const animation of glare.getAnimations()) animation.cancel()
  hot?.removeAttribute('data-hot')
}

type ScopeFrame = {
  analyserNode: AnalyserNode
  context: CanvasRenderingContext2D
  data: Uint8Array<ArrayBuffer>
  traceColor: string
  width: number
  height: number
  dpr: number
  deadline: number
}

let scopeFrameHandle = 0
let cachedAmber: string | null = null

function amberTrace(canvas: HTMLCanvasElement): string {
  cachedAmber ??= getComputedStyle(canvas).color
  return cachedAmber
}

function tracePath(
  frame: Pick<ScopeFrame, 'context' | 'data' | 'width' | 'height'>,
): void {
  const step = frame.width / frame.data.length
  for (const [index, value] of frame.data.entries()) {
    const y = (value / 255) * frame.height
    if (index === 0) frame.context.moveTo(0, y)
    else frame.context.lineTo(index * step, y)
  }
}

function drawFrame(frame: ScopeFrame): void {
  frame.analyserNode.getByteTimeDomainData(frame.data)
  frame.context.clearRect(0, 0, frame.width, frame.height)
  frame.context.lineWidth = 2 * frame.dpr
  frame.context.strokeStyle = frame.traceColor
  frame.context.beginPath()
  tracePath(frame)
  frame.context.stroke()
  if (performance.now() >= frame.deadline) {
    frame.context.clearRect(0, 0, frame.width, frame.height)
    return
  }
  scopeFrameHandle = requestAnimationFrame(() => drawFrame(frame))
}

type ScopeOptions = {
  canvas: HTMLCanvasElement
  analyserNode: AnalyserNode
  seconds: number
}

// the scope: waveform from the analyser, dpr-aware, amber trace, rAF loop with a deadline
function startScope(options: ScopeOptions): void {
  const { canvas, analyserNode, seconds } = options
  if (!canvas.clientWidth) return
  const context = canvas.getContext('2d')
  if (!context) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * dpr
  canvas.height = canvas.clientHeight * dpr
  cancelAnimationFrame(scopeFrameHandle)
  drawFrame({
    analyserNode,
    context,
    data: new Uint8Array(analyserNode.fftSize),
    traceColor: amberTrace(canvas),
    width: canvas.width,
    height: canvas.height,
    dpr,
    deadline: performance.now() + seconds * 1000,
  })
}

async function playReduced(
  ctx: PlayContext,
  title: string,
  signal: AbortSignal,
): Promise<void> {
  ctx.setPlatterRecord(ctx.record)
  ctx.setArmPose('play')
  jukeSfx.thump()
  ctx.setLampText(`NOW PLAYING · ${title}`)
  await wait(T.reduceGo, signal)
  if (signal.aborted) return
  window.location.assign(ctx.record.url)
}

async function playFull(
  ctx: PlayContext,
  title: string,
  signal: AbortSignal,
): Promise<void> {
  ctx.setArmPose('lift')
  await wait(T.armLift, signal)
  if (signal.aborted) return
  if (ctx.onPlatter.id !== ctx.record.id) {
    await animateSwap(ctx.handle, ctx.record, ctx.setPlatterRecord)
  }
  ctx.setArmPose('play')
  await wait(T.armDrop, signal)
  if (signal.aborted) return

  jukeSfx.thump()
  jukeSfx.crackle(TEMPO.bar + 0.3)
  jukeSfx.bar()
  const analyserNode = jukeSfx.analyser()
  if (analyserNode) {
    startScope({
      canvas: ctx.handle.scope,
      analyserNode,
      seconds: TEMPO.bar + 0.25,
    })
  }
  ctx.setLampText(`NOW PLAYING · ${title}`)
  await wait(T.bar, signal)
  if (signal.aborted) return
  window.location.assign(ctx.record.url)
}

export function playSequence(
  ctx: PlayContext,
  signal: AbortSignal,
): Promise<void> {
  const title = ctx.record.title.toUpperCase()
  ctx.setLampText(`SELECTED · ${title}`)
  return ctx.reduceMotion
    ? playReduced(ctx, title, signal)
    : playFull(ctx, title, signal)
}
