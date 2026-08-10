'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { prefersQuietFx } from 'services/theme'
import styles from './stall-box.module.css'
import {
  type BazaarStallId,
  type FxFrame,
  layerFiles,
  STALL_SCENES,
  type StallLayer,
} from './stalls-manifest'

const HOVER_STEP_MS = 150
const REVERSE_STEP_MS = 100
const REST_STEP = -1

const layerZ = (layer: StallLayer) =>
  layer.role === 'plate' ? 0 : layer.zorder

const restFile = (layer: StallLayer): string => {
  if (layer.role === 'plate') return layer.file ?? 'plate-key.png'
  if (layer.role === 'effect') return layer.frames[0].file
  if (layer.role === 'prop') return layer.rest
  return layer.idle[0].file
}

const hoverStepFile = (
  hover: string | string[] | undefined,
  step: number,
): string | null => {
  if (!hover) return null
  if (typeof hover === 'string') return hover
  return hover[Math.min(step, hover.length - 1)] ?? null
}

const reducedFile = (layer: StallLayer, active: boolean): string => {
  if (layer.role === 'char' && active) {
    return layer.hover[layer.hover.length - 1].file
  }
  return restFile(layer)
}

type Timers = { ids: number[] }

const schedule = (timers: Timers, fn: () => void, ms: number) => {
  timers.ids.push(window.setTimeout(fn, ms))
}

function loopFrames(
  timers: Timers,
  frames: FxFrame[],
  show: (file: string) => void,
) {
  const tick = (i: number) => {
    // re-check per frame: fx-quiet can flip without re-running the effect
    if (!prefersQuietFx()) show(frames[i].file)
    schedule(timers, () => tick((i + 1) % frames.length), frames[i].ms ?? 200)
  }
  tick(0)
}

type LayerContext = {
  active: boolean
  layers: StallLayer[]
  show: (index: number, file: string) => void
  timers: Timers
  step: { current: number }
  reversing: boolean
  hasChar: boolean
}

type LayerOfRole<Role extends StallLayer['role']> = Extract<
  StallLayer,
  { role: Role }
>

const showPose = (
  layer: LayerOfRole<'char'>,
  index: number,
  ctx: LayerContext,
  step: number,
) => {
  ctx.show(index, layer.hover[step].file)
  for (const [otherIndex, other] of ctx.layers.entries()) {
    if (other.role === 'prop' && other.hover) {
      ctx.show(otherIndex, hoverStepFile(other.hover, step) ?? other.rest)
    }
    if (other.role === 'effect' && other.hover) {
      ctx.show(
        otherIndex,
        hoverStepFile(other.hover, step) ?? other.frames[0].file,
      )
    }
  }
}

const settle = (
  layer: LayerOfRole<'char'>,
  index: number,
  ctx: LayerContext,
) => {
  ctx.step.current = REST_STEP
  loopFrames(ctx.timers, layer.idle, (file) => ctx.show(index, file))
  for (const [otherIndex, other] of ctx.layers.entries()) {
    if (other.role === 'prop') ctx.show(otherIndex, other.rest)
    if (other.role === 'effect' && other.hover) {
      loopFrames(ctx.timers, other.frames, (file) => ctx.show(otherIndex, file))
    }
  }
}

/* walks the pose one frame per tick toward hold (active) or rest (not) */
const stepPose = (
  layer: LayerOfRole<'char'>,
  index: number,
  ctx: LayerContext,
  step: number,
) => {
  if (step === REST_STEP) {
    settle(layer, index, ctx)
    return
  }
  ctx.step.current = step
  showPose(layer, index, ctx, step)
  const target = ctx.active ? layer.hover.length - 1 : REST_STEP
  if (step === target) return
  const forward = target > step
  const next = step + (forward ? 1 : -1)
  const pace = forward ? HOVER_STEP_MS : REVERSE_STEP_MS
  schedule(ctx.timers, () => stepPose(layer, index, ctx, next), pace)
}

const ROLE_DRIVERS: {
  [Role in StallLayer['role']]: (
    layer: LayerOfRole<Role>,
    index: number,
    ctx: LayerContext,
  ) => void
} = {
  plate: () => {},
  effect: (layer, index, ctx) => {
    if (!layer.hover || (!ctx.active && !ctx.hasChar)) {
      loopFrames(ctx.timers, layer.frames, (file) => ctx.show(index, file))
      return
    }
    // inactive with a char: settle restarts the loop after the reverse pass
    if (ctx.active) {
      ctx.show(index, hoverStepFile(layer.hover, 0) ?? restFile(layer))
    }
  },
  prop: (layer, index, ctx) => {
    if (!ctx.active && !ctx.reversing) ctx.show(index, layer.rest)
  },
  char: (layer, index, ctx) => {
    if (ctx.active) {
      const start = ctx.step.current === REST_STEP ? 0 : ctx.step.current
      stepPose(layer, index, ctx, start)
      return
    }
    if (ctx.step.current === REST_STEP) {
      settle(layer, index, ctx)
      return
    }
    stepPose(layer, index, ctx, ctx.step.current - 1)
  },
}

const driveLayer = <Role extends StallLayer['role']>(
  role: Role,
  layer: LayerOfRole<Role>,
  index: number,
  ctx: LayerContext,
) => ROLE_DRIVERS[role](layer, index, ctx)

const paintFrame = (img: HTMLImageElement | undefined, on: boolean) => {
  if (img) img.style.opacity = on ? '1' : '0'
}

const makeShow =
  (layers: StallLayer[], imgs: Map<string, HTMLImageElement>) =>
  (index: number, file: string) => {
    for (const frame of layerFiles(layers[index])) {
      paintFrame(imgs.get(`${index}:${frame}`), frame === file)
    }
  }

const showReducedScene = (ctx: LayerContext) => {
  for (const [index, layer] of ctx.layers.entries()) {
    if (layer.role === 'plate') continue
    ctx.show(index, reducedFile(layer, ctx.active))
    if (layer.role === 'char') {
      ctx.step.current = ctx.active ? layer.hover.length - 1 : REST_STEP
    }
  }
}

const driveScene = (ctx: LayerContext) => {
  for (const [index, layer] of ctx.layers.entries()) {
    if (layer.role !== 'plate') driveLayer(layer.role, layer, index, ctx)
  }
}

/** One r17 stall: plate + effect loops + props + char, driven by `active`.
    All frames render once; animation only flips opacity — zero refetching. */
export default function SceneStall(props: {
  id: BazaarStallId
  active: boolean
  eager?: boolean
}) {
  const { id, active, eager = false } = props
  const scene = STALL_SCENES[id]
  const layers = useMemo(
    () =>
      [...(scene.layers as StallLayer[])].sort((a, b) => layerZ(a) - layerZ(b)),
    [scene],
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const imgRefs = useRef(new Map<string, HTMLImageElement>())
  const stepRef = useRef(REST_STEP)
  const [visible, setVisible] = useState(false)

  /* which tree shows is a container-query decision, invisible to media
     listeners and racing layout reads: the box resizes from zero when its
     tree turns on, so observe the box itself */
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const sync = () => setVisible(root.offsetParent !== null)
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!visible || !rootRef.current) return
    const timers: Timers = { ids: [] }
    const ctx: LayerContext = {
      active,
      layers,
      show: makeShow(layers, imgRefs.current),
      timers,
      step: stepRef,
      // read before the drivers run: they mutate the ref synchronously
      reversing: !active && stepRef.current !== REST_STEP,
      hasChar: layers.some((layer) => layer.role === 'char'),
    }

    if (prefersQuietFx()) showReducedScene(ctx)
    else driveScene(ctx)

    return () => {
      for (const timer of timers.ids) window.clearTimeout(timer)
    }
  }, [visible, active, layers])

  return (
    <div className={styles.sceneStack} aria-hidden ref={rootRef}>
      {layers.map((layer, index) => {
        const rest = restFile(layer)
        const frames = layerFiles(layer).map((file) => (
          <img
            key={`${layer.id}:${file}`}
            ref={(el) => {
              if (el) imgRefs.current.set(`${index}:${file}`, el)
              else imgRefs.current.delete(`${index}:${file}`)
            }}
            src={`/images/bazaar/${id}/${file}`}
            alt=''
            draggable={false}
            loading={layer.role === 'plate' && eager ? 'eager' : 'lazy'}
            data-layer={layer.role}
            data-frame={file}
            data-rest={file === rest ? '' : undefined}
          />
        ))
        /* the hologram flickers as a GROUP: an animation on the imgs
           themselves would override the frame-switching opacities */
        if (id === 'papers' && layer.role === 'char') {
          return (
            <div key={layer.id} className={styles.holoFlicker}>
              {frames}
            </div>
          )
        }
        return frames
      })}
    </div>
  )
}
