export type TapeSwapParts = {
  ghost: HTMLElement
  slot: HTMLElement
  source: HTMLElement
}

export type TapeSwapSounds = {
  insert: () => void
}

type TapeSwapPhase = 'pickup' | 'travel' | 'register' | 'feed' | 'latch'

type Pose = {
  x: number
  y: number
  scaleX: number
  scaleY: number
  tilt: number
}

type Stage = {
  phase: TapeSwapPhase
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
}

const snap = (value: number): number => {
  const density = window.devicePixelRatio || 1
  return Math.round(value * density) / density
}

const place = (pose: Pose): string =>
  `translate3d(${snap(pose.x)}px, ${snap(pose.y)}px, 0) scale(${pose.scaleX}, ${pose.scaleY}) rotate(${pose.tilt}deg)`

const frame = (pose: Pose, opacity = 1, offset?: number): Keyframe => ({
  transform: place(pose),
  opacity,
  ...(offset === undefined ? {} : { offset }),
})

/*
 * The ghost has the source tape's untransformed dimensions. Every destination
 * coordinate is derived from the live slot rectangle, so the final registration
 * stays centred at every responsive layout and display density.
 */
const stages = (parts: TapeSwapParts): Stage[] => {
  const source = parts.source.getBoundingClientRect()
  const slot = parts.slot.getBoundingClientRect()
  const width = parts.source.offsetWidth
  const height = parts.source.offsetHeight

  parts.ghost.style.width = `${width}px`
  parts.ghost.style.height = `${height}px`

  const computed = window.getComputedStyle(parts.source)
  const sourceTilt = Number.parseFloat(computed.getPropertyValue('--tip')) || 0
  const mouthInsetX = Math.max(8, Math.min(16, slot.width * 0.035))
  const mouthInsetY = Math.max(5, Math.min(9, slot.height * 0.16))
  const mouthWidth = slot.width - mouthInsetX * 2
  const mouthHeight = slot.height - mouthInsetY * 2

  /*
   * Let width determine the convincing cassette size, then compress only the
   * final few millimetres into the mouth. This reads as perspective, not as a
   * small tape teleporting into an oversized aperture.
   */
  const dockScaleX = Math.min(1.16, mouthWidth / width)
  const dockScaleY = Math.min(dockScaleX, mouthHeight / height)
  const dockWidth = width * dockScaleX
  const dockHeight = height * dockScaleY
  const dockX = slot.left + (slot.width - dockWidth) / 2
  const dockY = slot.top + (slot.height - dockHeight) / 2
  const side = source.left > slot.left ? 1 : -1

  const start: Pose = {
    x: source.left,
    y: source.top,
    scaleX: source.width / width,
    scaleY: source.height / height,
    tilt: sourceTilt,
  }
  const lifted: Pose = {
    x: source.left - side * 7,
    y: source.top - 18,
    scaleX: start.scaleX * 1.012,
    scaleY: start.scaleY * 1.012,
    tilt: sourceTilt * 0.55,
  }
  const preDock: Pose = {
    x: dockX + side * Math.min(22, slot.width * 0.055),
    y: dockY + Math.min(12, slot.height * 0.22),
    scaleX: dockScaleX * 1.018,
    scaleY: dockScaleX * 1.018,
    tilt: side * 0.7,
  }
  const docked: Pose = {
    x: dockX,
    y: dockY,
    scaleX: dockScaleX,
    scaleY: dockScaleY,
    tilt: 0,
  }
  const swallowed: Pose = {
    ...docked,
    x: docked.x + dockWidth * 0.045,
    y: slot.top + slot.height / 2 - dockHeight * 0.09,
    scaleX: dockScaleX * 0.91,
    scaleY: dockScaleY * 0.18,
  }

  return [
    {
      phase: 'pickup',
      keyframes: [
        frame(start, 0.01),
        frame(
          { ...start, y: start.y + 2, tilt: sourceTilt + side * 0.3 },
          1,
          0.18,
        ),
        frame(lifted),
      ],
      options: {
        duration: 190,
        easing: 'cubic-bezier(0.2, 0.72, 0.28, 1)',
        fill: 'forwards',
      },
    },
    {
      phase: 'travel',
      keyframes: [
        frame(lifted),
        frame(
          {
            x: lifted.x + (preDock.x - lifted.x) * 0.58,
            y: Math.min(lifted.y, preDock.y) - Math.min(30, slot.width * 0.045),
            scaleX: lifted.scaleX + (preDock.scaleX - lifted.scaleX) * 0.58,
            scaleY: lifted.scaleY + (preDock.scaleY - lifted.scaleY) * 0.58,
            tilt: -side * 1.15,
          },
          1,
          0.58,
        ),
        frame(preDock),
      ],
      options: {
        duration: 390,
        easing: 'cubic-bezier(0.42, 0, 0.2, 1)',
        fill: 'forwards',
      },
    },
    {
      phase: 'register',
      keyframes: [
        frame(preDock),
        frame(
          {
            ...docked,
            x: docked.x - side * 2,
            y: docked.y - 1,
            tilt: -side * 0.22,
          },
          1,
          0.72,
        ),
        frame(docked),
      ],
      options: {
        duration: 210,
        easing: 'steps(6, end)',
        fill: 'forwards',
      },
    },
    {
      phase: 'feed',
      keyframes: [
        frame(docked),
        frame(
          {
            ...docked,
            x: docked.x + dockWidth * 0.012,
            y: docked.y + dockHeight * 0.08,
            scaleX: dockScaleX * 0.976,
            scaleY: dockScaleY * 0.84,
          },
          0.92,
          0.36,
        ),
        frame(swallowed, 0),
      ],
      options: {
        duration: 300,
        easing: 'cubic-bezier(0.55, 0, 0.9, 0.55)',
        fill: 'forwards',
      },
    },
    {
      phase: 'latch',
      keyframes: [frame(swallowed, 0), frame(swallowed, 0)],
      options: {
        duration: 130,
        fill: 'forwards',
      },
    },
  ]
}

export const runTapeSwap = (
  parts: TapeSwapParts,
  sounds: TapeSwapSounds,
  done: () => void,
): { cancel: () => void } => {
  let cancelled = false

  const setPhase = (phase: TapeSwapPhase) => {
    parts.ghost.dataset.phase = phase
    parts.slot.dataset.phase = phase
  }

  const play = (stage: Stage): Promise<unknown> => {
    setPhase(stage.phase)
    return parts.ghost
      .animate(stage.keyframes, stage.options)
      .finished.catch(() => null)
  }

  const run = async () => {
    const sequence = stages(parts)
    parts.source.style.visibility = 'hidden'

    for (const stage of sequence) {
      if (cancelled) return
      if (stage.phase === 'feed') sounds.insert()
      await play(stage)
    }

    if (!cancelled) done()
  }
  void run()

  return {
    cancel: () => {
      cancelled = true
      parts.source.style.visibility = ''
      delete parts.ghost.dataset.phase
      delete parts.slot.dataset.phase
      parts.ghost.style.width = ''
      parts.ghost.style.height = ''
      for (const animation of parts.ghost.getAnimations()) animation.cancel()
    },
  }
}
