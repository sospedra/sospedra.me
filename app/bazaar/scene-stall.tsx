'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './bazaar4.module.css'
import {
  type Bazaar4StallId,
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

/** every frame a layer can show; all are mounted once and opacity-flipped */
const layerFiles = (layer: StallLayer): string[] => {
  if (layer.role === 'plate') return [layer.file ?? 'plate-key.png']
  if (layer.role === 'effect') {
    const hover = Array.isArray(layer.hover)
      ? layer.hover
      : layer.hover
        ? [layer.hover]
        : []
    return [...new Set([...layer.frames.map((f) => f.file), ...hover])]
  }
  if (layer.role === 'prop') {
    return [...new Set([layer.rest, ...(layer.hover ?? [])])]
  }
  return [
    ...new Set([
      ...layer.idle.map((f) => f.file),
      ...layer.hover.map((f) => f.file),
    ]),
  ]
}

const hoverStepFile = (
  hover: string | string[] | undefined,
  step: number,
): string | null => {
  if (!hover) return null
  if (typeof hover === 'string') return hover
  return hover[Math.min(step, hover.length - 1)] ?? null
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
    schedule(timers, () => tick((i + 1) % frames.length), frames[i].ms || 200)
  }
  tick(0)
}

/** One r17 stall: plate + effect loops + props + char, driven by `active`.
    All frames render once; animation only flips opacity — zero refetching. */
export default function SceneStall(props: {
  id: Bazaar4StallId
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
  useEffect(() => {
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

    layers.forEach((layer, index) => {
      if (layer.role === 'plate') return
      if (reduced) {
        show(
          index,
          layer.role === 'char' && active
            ? layer.hover[layer.hover.length - 1].file
            : restFile(layer),
        )
        return
      }
      if (layer.role === 'effect') {
        if (!active || !layer.hover) {
          loopFrames(timers, layer.frames, (f) => show(index, f))
          return
        }
        show(index, hoverStepFile(layer.hover, 0) ?? restFile(layer))
        return
      }
      if (layer.role === 'prop') {
        if (!active) show(index, layer.rest)
        return
      }
      /* char: idle loop at rest, 4-step greeting held while active */
      if (!active) {
        loopFrames(timers, layer.idle, (f) => show(index, f))
        return
      }
      const stepTo = (step: number) => {
        show(index, layer.hover[step].file)
        layers.forEach((other, otherIndex) => {
          if (other.role === 'prop' && other.hover) {
            show(otherIndex, hoverStepFile(other.hover, step) ?? other.rest)
          }
          if (other.role === 'effect' && other.hover) {
            show(
              otherIndex,
              hoverStepFile(other.hover, step) ?? other.frames[0].file,
            )
          }
        })
        if (step < layer.hover.length - 1) {
          schedule(timers, () => stepTo(step + 1), HOVER_STEP_MS)
        }
      }
      stepTo(0)
    })

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
            src={`/images/bazaar4/${id}/${file}`}
            alt=''
            draggable={false}
            loading={layer.role === 'plate' ? 'eager' : 'lazy'}
            style={{ opacity: file === restFile(layer) ? 1 : 0 }}
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
