'use client'

import { minBy } from 'es-toolkit'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { tapHaptic } from 'services/haptics'
import css from './palette-clamp.module.css'

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const isHexColor = (value: string) => HEX_COLOR_PATTERN.test(value)

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16)
  return [value >> 16, (value >> 8) & 255, value & 255] as const
}

const distance = (a: string, b: string) => {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2
}

const nearestOf = (hex: string, pool: string[]) =>
  minBy(pool, (candidate) => distance(hex, candidate)) ?? hex

const resolveIndex = (palette: string[], selected: string | null) => {
  if (selected === null) return null
  const index = palette.indexOf(selected)
  return index === -1 ? null : index
}

const flag = (value: boolean) => (value ? 'true' : 'false')

type Chip = {
  hex: string
  target: string
  title: string
  isAdded: boolean
  isStray: boolean
  scope?: string
}

const buildChips = (
  mode: Mode,
  pools: { before: string[]; after: string[] },
  scopes?: Record<string, string>,
): Chip[] => {
  const { before, after } = pools
  if (mode === 'sampled') {
    return before.map((hex) => ({
      hex,
      target: hex,
      title: hex,
      isAdded: false,
      isStray: false,
    }))
  }
  const survivors = before.map((hex) => {
    const target = nearestOf(hex, after)
    const isStray = target !== hex
    return {
      hex,
      target,
      title: isStray ? `${hex} merges into ${target}` : hex,
      isAdded: false,
      isStray,
      scope: scopes?.[target],
    }
  })
  const added = after
    .filter((hex) => !before.includes(hex))
    .map((hex) => ({
      hex,
      target: hex,
      title: hex,
      isAdded: true,
      isStray: false,
      scope: scopes?.[hex],
    }))
  return [...survivors, ...added]
}

type Mode = 'sampled' | 'clamped'
type Example = { src: string; width: number; height: number; alt: string }
type ModeCache = { source: ImageData; labels: Uint8Array; shares: number[] }

const MAX_CANVAS_EDGE = 1080
const CHROMA_LABEL = 255
const CHROMA_DIM = 0.35

// the shipped keyer predicate: g > 96, g > r + 48, g > b + 48
const isChromaPixel = (r: number, g: number, b: number) =>
  g > 96 && g > r + 48 && g > b + 48

// load event, not decode(): iOS Safari decode() promises can stall or reject
// on healthy images, and a stalled await leaves the canvas blank forever
const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`image load failed: ${src}`))
    image.src = src
  })

const loadImageData = async (src: string) => {
  const image = await loadImage(src)
  const longest = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = Math.min(1, MAX_CANVAS_EDGE / longest)
  const width = Math.round(image.naturalWidth * scale)
  const height = Math.round(image.naturalHeight * scale)
  const buffer = document.createElement('canvas')
  buffer.width = width
  buffer.height = height
  const context = buffer.getContext('2d')
  if (!context) throw new Error('2d context unavailable')
  context.drawImage(image, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

const buildCache = (source: ImageData, palette: string[]): ModeCache => {
  const pool = palette.map(hexToRgb)
  const labels = new Uint8Array(source.width * source.height)
  const counts = new Array(palette.length).fill(0)
  const { data } = source
  let content = 0
  // hot path: nearest-palette label for ~1M pixels, plain loops on purpose
  for (let i = 0; i < labels.length; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    if (isChromaPixel(r, g, b)) {
      labels[i] = CHROMA_LABEL
      continue
    }
    let best = 0
    let bestScore = Number.POSITIVE_INFINITY
    for (let p = 0; p < pool.length; p++) {
      const [pr, pg, pb] = pool[p]
      const score = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
      if (score < bestScore) {
        bestScore = score
        best = p
      }
    }
    labels[i] = best
    counts[best] += 1
    content += 1
  }
  const total = Math.max(content, 1)
  return { source, labels, shares: counts.map((count) => count / total) }
}

const paintIsolation = (cache: ModeCache, selected: number | null) => {
  const { source, labels } = cache
  const out = new ImageData(source.width, source.height)
  const src = source.data
  const dst = out.data
  // hot path: one recolor pass per selection, plain loop on purpose
  for (let i = 0; i < labels.length; i++) {
    const at = i * 4
    dst[at + 3] = 255
    if (selected === null || labels[i] === selected) {
      dst[at] = src[at]
      dst[at + 1] = src[at + 1]
      dst[at + 2] = src[at + 2]
      continue
    }
    const grey = 0.2126 * src[at] + 0.7152 * src[at + 1] + 0.0722 * src[at + 2]
    const level = labels[i] === CHROMA_LABEL ? grey * CHROMA_DIM : grey
    dst[at] = level
    dst[at + 1] = level
    dst[at + 2] = level
  }
  return out
}

const PaletteClamp: React.FC<{
  label: string
  before: string[]
  after: string[]
  scopes?: Record<string, string>
  examples: Record<Mode, Example>
}> = (props) => {
  const [mode, setMode] = useState<Mode>('sampled')
  const [selected, setSelected] = useState<string | null>(null)
  const [share, setShare] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const caches = useRef<Partial<Record<Mode, ModeCache>>>({})
  const painted = useRef<string | null>(null)

  const before = props.before.filter(isHexColor)
  const after = props.after.filter(isHexColor)
  const palette = mode === 'clamped' ? after : before
  const chips = buildChips(mode, { before, after }, props.scopes)
  const example = props.examples[mode]

  const pickMode = (next: Mode) => {
    setMode(next)
    setSelected(null)
    setFailed(false)
  }

  const pickHex = (target: string) => {
    setSelected((current) => (current === target ? null : target))
  }

  // no dependency array: palette and example are fresh literals every render,
  // so the signature ref decides when a repaint is due
  useEffect(() => {
    let cancelled = false
    const signature = `${mode}|${selected ?? ''}`
    const paint = (cache: ModeCache) => {
      const node = canvas.current
      if (!node) return
      caches.current[mode] = cache
      node.width = cache.source.width
      node.height = cache.source.height
      const isolate = resolveIndex(palette, selected)
      node.getContext('2d')?.putImageData(paintIsolation(cache, isolate), 0, 0)
      painted.current = signature
      setShare(isolate === null ? null : cache.shares[isolate])
    }
    const render = async () => {
      if (!canvas.current || painted.current === signature) return
      const cache =
        caches.current[mode] ??
        buildCache(await loadImageData(example.src), palette)
      if (!cancelled) paint(cache)
    }
    render().catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
    }
  })

  return (
    <section aria-label={props.label} className={css.palette}>
      <div className={css.head}>
        <span className={css.label}>{props.label}</span>
        <span aria-hidden='true' className={css.count}>
          {mode === 'clamped'
            ? `${after.length} colors survive`
            : `${before.length} colors sampled`}
        </span>
        <span className={css.toggle}>
          <button
            aria-pressed={mode === 'sampled'}
            className={css.mode}
            onClick={() => {
              tapHaptic()
              pickMode('sampled')
            }}
            type='button'
          >
            sampled {before.length}
          </button>
          <button
            aria-pressed={mode === 'clamped'}
            className={css.mode}
            onClick={() => {
              tapHaptic()
              pickMode('clamped')
            }}
            type='button'
          >
            clamped {after.length}
          </button>
        </span>
      </div>
      <figure className={css.figure}>
        {failed ? (
          <img
            alt={example.alt}
            className={css.canvas}
            height={example.height}
            src={example.src}
            width={example.width}
          />
        ) : (
          <canvas
            aria-label={example.alt}
            className={css.canvas}
            ref={canvas}
            role='img'
          />
        )}
        <figcaption className={css.caption}>
          {selected !== null && share !== null
            ? `${selected} owns ${(share * 100).toFixed(1)}% of the content pixels`
            : `${example.alt} · select a swatch to isolate its region`}
        </figcaption>
      </figure>
      <div className={css.grid}>
        {chips.map((chip) => (
          <button
            aria-pressed={selected === chip.target}
            className={css.chip}
            data-added={flag(chip.isAdded)}
            data-stray={flag(chip.isStray)}
            key={chip.hex}
            onClick={() => pickHex(chip.target)}
            title={chip.title}
            type='button'
          >
            <span className={css.swatch} style={{ background: chip.target }} />
            <span className={css.hex}>{chip.hex}</span>
            {chip.isStray ? (
              <span className='sr-only'>{chip.title}</span>
            ) : null}
            {chip.isAdded ? (
              <span className={css.scope}>added by law</span>
            ) : null}
            {chip.scope ? (
              <span className={css.scope}>{chip.scope}</span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  )
}

export default PaletteClamp
