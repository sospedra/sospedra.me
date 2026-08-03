'use client'

import { uniq } from 'es-toolkit'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import styles from './scene.module.css'
import {
  type BazaarStallId,
  type FxFrame,
  STALL_SCENES,
  type StallLayer,
} from './stalls-manifest'

const HOVER_STEP_MS = 150

const layerZ = (layer: StallLayer) =>
  layer.role === 'plate' ? 0 : layer.zorder

const restFile = (layer: StallLayer): string => {
  if (layer.role === 'plate') return layer.file ?? 'plate-key.png'
  if (layer.role === 'effect') return layer.frames[0].file
  if (layer.role === 'prop') return layer.rest
  return layer.idle[0].file
}

const layerFiles = (layer: StallLayer): string[] => {
  if (layer.role === 'plate') return [layer.file ?? 'plate-key.png']
  if (layer.role === 'effect') {
    const hover = Array.isArray(layer.hover)
      ? layer.hover
      : layer.hover
        ? [layer.hover]
        : []
    return uniq([...layer.frames.map((frame) => frame.file), ...hover])
  }
  if (layer.role === 'prop') {
    return uniq([layer.rest, ...(layer.hover ?? [])])
  }
  return uniq([
    ...layer.idle.map((frame) => frame.file),
    ...layer.hover.map((frame) => frame.file),
  ])
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
    show(frames[i].file)
    schedule(timers, () => tick((i + 1) % frames.length), frames[i].ms ?? 200)
  }
  tick(0)
}

type LayerContext = {
  active: boolean
  layers: StallLayer[]
  show: (index: number, file: string) => void
  timers: Timers
}

type LayerOfRole<Role extends StallLayer['role']> = Extract<
  StallLayer,
  { role: Role }
>

const greet = (
  layer: LayerOfRole<'char'>,
  index: number,
  ctx: LayerContext,
) => {
  const stepTo = (step: number) => {
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
    if (step < layer.hover.length - 1) {
      schedule(ctx.timers, () => stepTo(step + 1), HOVER_STEP_MS)
    }
  }
  stepTo(0)
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
    if (!ctx.active || !layer.hover) {
      loopFrames(ctx.timers, layer.frames, (file) => ctx.show(index, file))
      return
    }
    ctx.show(index, hoverStepFile(layer.hover, 0) ?? restFile(layer))
  },
  prop: (layer, index, ctx) => {
    if (!ctx.active) ctx.show(index, layer.rest)
  },
  char: (layer, index, ctx) => {
    if (!ctx.active) {
      loopFrames(ctx.timers, layer.idle, (file) => ctx.show(index, file))
      return
    }
    greet(layer, index, ctx)
  },
}

const driveLayer = <Role extends StallLayer['role']>(
  role: Role,
  layer: LayerOfRole<Role>,
  index: number,
  ctx: LayerContext,
) => ROLE_DRIVERS[role](layer, index, ctx)

/** One r17 stall: plate + effect loops + props + char, driven by `active`.
    All frames render once; animation only flips opacity — zero refetching. */
export default function SceneStall(props: {
  id: BazaarStallId
  active: boolean
}) {
  const { id, active } = props
  const scene = STALL_SCENES[id]
  const layers = useMemo(
    () =>
      [...(scene.layers as StallLayer[])].sort((a, b) => layerZ(a) - layerZ(b)),
    [scene],
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const imgRefs = useRef(new Map<string, HTMLImageElement>())
  const [breakpointTick, setBreakpointTick] = useState(0)

  /* the hidden breakpoint tree must not animate; re-check on crossing 700px */
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)')
    const bump = () => setBreakpointTick((t) => t + 1)
    query.addEventListener('change', bump)
    return () => query.removeEventListener('change', bump)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: breakpointTick re-arms timers when the visible tree changes
  useLayoutEffect(() => {
    if (!rootRef.current || rootRef.current.offsetParent === null) return
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const timers: Timers = { ids: [] }
    const show = (index: number, file: string) => {
      const layer = layers[index]
      for (const frame of layerFiles(layer)) {
        const img = imgRefs.current.get(`${index}:${frame}`)
        if (img) img.style.opacity = frame === file ? '1' : '0'
      }
    }
    const ctx: LayerContext = { active, layers, show, timers }

    for (const [index, layer] of layers.entries()) {
      if (layer.role === 'plate') continue
      if (reduced) {
        show(index, reducedFile(layer, active))
        continue
      }
      driveLayer(layer.role, layer, index, ctx)
    }

    return () => {
      for (const timer of timers.ids) window.clearTimeout(timer)
    }
  }, [active, layers, breakpointTick])

  return (
    <div className={styles.sceneStack} aria-hidden ref={rootRef}>
      {layers.map((layer, index) => {
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
            loading={layer.role === 'plate' ? 'eager' : 'lazy'}
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
