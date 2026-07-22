export type TapeSwapParts = {
  ghost: HTMLElement
  slot: HTMLElement
  source: HTMLElement
}

export type TapeSwapSounds = {
  insert: () => void
}

type Stage = {
  keyframes: Keyframe[]
  options: KeyframeAnimationOptions
}

const place = (x: number, y: number, scale: number, tilt = 0): string =>
  `translate(${x}px, ${y}px) scale(${scale}) rotate(${tilt}deg)`

/* Ghost anchors at transform-origin 0 0; the push-in pairs translateY with a
   bottom clip and fade so the spine reads as swallowed by the slot. */
const stages = (parts: TapeSwapParts) => {
  const width = parts.ghost.offsetWidth
  const height = parts.ghost.offsetHeight
  const slot = parts.slot.getBoundingClientRect()
  const source = parts.source.getBoundingClientRect()

  const sourceScale = source.width / width
  const dockScale = (slot.width * 0.82) / width
  const dockHeight = height * dockScale
  const dockX = slot.left + (slot.width - width * dockScale) / 2
  const dockY = slot.top + 6
  const mouthY = dockY - dockHeight

  const approach: Stage = {
    keyframes: [
      { transform: place(source.left, source.top, sourceScale), opacity: 1 },
      {
        transform: place(
          (source.left + dockX) / 2,
          Math.min(source.top, mouthY) - 36,
          (sourceScale + dockScale) / 2,
          -1.6,
        ),
        opacity: 1,
        offset: 0.55,
      },
      { transform: place(dockX, mouthY, dockScale), opacity: 1 },
    ],
    options: {
      duration: 560,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    },
  }

  const pushIn: Stage = {
    keyframes: [
      {
        transform: place(dockX, mouthY, dockScale),
        clipPath: 'inset(0 0 0% 0)',
        opacity: 1,
      },
      {
        transform: place(dockX, dockY, dockScale * 0.94),
        clipPath: 'inset(0 0 96% 0)',
        opacity: 0.12,
      },
    ],
    options: {
      duration: 300,
      easing: 'cubic-bezier(0.5, 0, 1, 1)',
      fill: 'forwards',
    },
  }

  return { approach, pushIn }
}

export const runTapeSwap = (
  parts: TapeSwapParts,
  sounds: TapeSwapSounds,
  done: () => void,
): { cancel: () => void } => {
  let cancelled = false
  const play = (stage: Stage): Promise<unknown> =>
    parts.ghost
      .animate(stage.keyframes, stage.options)
      .finished.catch(() => null)

  const run = async () => {
    const stage = stages(parts)
    parts.source.style.visibility = 'hidden'
    sounds.insert()
    await play(stage.approach)
    if (cancelled) return
    await play(stage.pushIn)
    if (cancelled) return
    done()
  }
  void run()

  return {
    cancel: () => {
      cancelled = true
      parts.source.style.visibility = ''
      for (const animation of parts.ghost.getAnimations()) animation.cancel()
    },
  }
}
