import { clamp } from 'es-toolkit'

export type GaugePoint = { x: number; y: number }

export type GaugeRect = {
  height: number
  left: number
  top: number
  width: number
}

const PLAYER_GAUGE_CENTER_X = 622.47 / 1254
const PLAYER_GAUGE_CENTER_Y = 619.68 / 1254
const TIME_GAUGE_START = 197.19
export const TIME_GAUGE_SWEEP = 94.31
const VOLUME_GAUGE_START = 59.5
const VOLUME_GAUGE_SWEEP = 91.54
const VOLUME_LINEAR_JOIN_PROGRESS = 0.6266764
const VOLUME_LINEAR_GRADIENT_ANGLE = 206.86596
const VOLUME_LINEAR_STOP_START = 4.52994
const VOLUME_LINEAR_STOP_RATE = 84.49333
const VOLUME_LINEAR_ORIGIN_X = 152.08
const VOLUME_LINEAR_ORIGIN_Y = 2.784
const VOLUME_LINEAR_DIRECTION_X = -0.4519048
const VOLUME_LINEAR_DIRECTION_Y = 0.8920662
const VOLUME_LINEAR_DISTANCE = 266.30871
const VOLUME_MASK_WIDTH = 197
const VOLUME_MASK_HEIGHT = 464

const clampProgress = (progress: number): number => clamp(progress, 0, 1)

const gaugeAngle = (panelRect: GaugeRect, point: GaugePoint): number => {
  const centerX = panelRect.left + panelRect.width * PLAYER_GAUGE_CENTER_X
  const centerY = panelRect.top + panelRect.height * PLAYER_GAUGE_CENTER_Y
  const radians = Math.atan2(point.x - centerX, centerY - point.y)
  return ((radians * 180) / Math.PI + 360) % 360
}

export const timeGaugeProgress = (
  panelRect: GaugeRect,
  point: GaugePoint,
): number => {
  const angle = gaugeAngle(panelRect, point)
  return clampProgress(
    (TIME_GAUGE_START + TIME_GAUGE_SWEEP - angle) / TIME_GAUGE_SWEEP,
  )
}

export const volumeGaugeProgress = (
  panelRect: GaugeRect,
  gaugeRect: GaugeRect,
  point: GaugePoint,
): number => {
  if (gaugeRect.width === 0 || gaugeRect.height === 0) return 0

  const localX =
    ((point.x - gaugeRect.left) / gaugeRect.width) * VOLUME_MASK_WIDTH
  const localY =
    ((point.y - gaugeRect.top) / gaugeRect.height) * VOLUME_MASK_HEIGHT
  const linearDistance =
    (localX - VOLUME_LINEAR_ORIGIN_X) * VOLUME_LINEAR_DIRECTION_X +
    (localY - VOLUME_LINEAR_ORIGIN_Y) * VOLUME_LINEAR_DIRECTION_Y

  if (linearDistance <= VOLUME_LINEAR_DISTANCE) {
    return (
      clampProgress(linearDistance / VOLUME_LINEAR_DISTANCE) *
      VOLUME_LINEAR_JOIN_PROGRESS
    )
  }

  const angle = gaugeAngle(panelRect, point)
  return clampProgress((angle - VOLUME_GAUGE_START) / VOLUME_GAUGE_SWEEP)
}

export const volumeGaugeBackground = (volume: number): string => {
  const progress = clampProgress(volume)

  if (progress <= VOLUME_LINEAR_JOIN_PROGRESS) {
    const stop = VOLUME_LINEAR_STOP_START + progress * VOLUME_LINEAR_STOP_RATE

    return `linear-gradient(${VOLUME_LINEAR_GRADIENT_ANGLE}deg, var(--music-orange) 0 ${stop}%, var(--music-orange-deep) ${stop}%)`
  }

  const angle = progress * VOLUME_GAUGE_SWEEP
  return `conic-gradient(from ${VOLUME_GAUGE_START}deg at -60.67% 35.29%, var(--music-orange) 0 ${angle}deg, var(--music-orange-deep) ${angle}deg)`
}
