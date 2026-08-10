'use client'

import { clamp, throttle } from 'es-toolkit'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Fullscreen from 'services/markdown/fullscreen'
import { prefersQuietFx } from 'services/theme'
import css from './carousel.module.css'
import {
  createDisplacementRenderer,
  type DisplacementRenderer,
} from './displacement'
import { pad } from './pad'

type Slide = {
  src: string
  alt: string
}

const SLIDE_WIDTH = 1600
const SLIDE_HEIGHT = 805
const SCROLL_THROTTLE_MS = 100
const FX_MAX_DPR = 2

// a drawable bitmap: melt textures upload synchronously, so a slide that is
// still lazy-loading falls back to a plain scroll instead of a blocked await
const isReady = (
  image: HTMLImageElement | undefined,
): image is HTMLImageElement =>
  image?.complete === true && image.naturalWidth > 0

const Carousel: React.FC<{ label: string; items: Slide[] }> = (props) => {
  const track = useRef<HTMLDivElement>(null)
  const fx = useRef<HTMLCanvasElement>(null)
  const renderer = useRef<DisplacementRenderer | null>(null)
  const rendererFailed = useRef(false)
  const [index, setIndex] = useState(0)

  const handleScroll = useMemo(
    () =>
      throttle(() => {
        const node = track.current
        if (!node) return
        const raw = Math.round(node.scrollLeft / node.clientWidth)
        setIndex(clamp(raw, 0, props.items.length - 1))
      }, SCROLL_THROTTLE_MS),
    [props.items.length],
  )

  useEffect(() => () => handleScroll.cancel(), [handleScroll])
  useEffect(() => () => renderer.current?.destroy(), [])

  const goTo = (target: number) => {
    track.current?.scrollTo({
      left: target * track.current.clientWidth,
      behavior: prefersQuietFx() ? 'auto' : 'smooth',
    })
  }

  const ensureRenderer = (seed: HTMLImageElement) => {
    if (renderer.current || rendererFailed.current) return renderer.current
    const canvas = fx.current
    if (!canvas) return null
    const created = createDisplacementRenderer(canvas)
    if (created === null) {
      rendererFailed.current = true
      return null
    }
    created.setActive(seed)
    renderer.current = created
    return created
  }

  const sizeFx = (node: HTMLDivElement, canvas: HTMLCanvasElement) => {
    const dpr = Math.min(window.devicePixelRatio || 1, FX_MAX_DPR)
    const width = Math.round(node.clientWidth * dpr)
    const height = Math.round(node.clientHeight * dpr)
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
  }

  const melt = (
    fromImage: HTMLImageElement,
    toImage: HTMLImageElement,
    target: number,
  ) => {
    const node = track.current
    const canvas = fx.current
    const fxRenderer = canvas ? ensureRenderer(fromImage) : null
    if (!node || !canvas || fxRenderer === null || fxRenderer.lost) {
      if (canvas) canvas.style.opacity = ''
      goTo(target)
      return
    }
    sizeFx(node, canvas)
    fxRenderer.transitionTo(toImage, () => {
      canvas.style.opacity = ''
    })
    canvas.style.opacity = '1'
    node.scrollTo({ left: target * node.clientWidth, behavior: 'auto' })
  }

  const navigate = (step: number) => {
    const node = track.current
    if (!node || node.clientWidth === 0) return
    // mid-flight taps chain: the next slide in travel direction is "current"
    const slot = node.scrollLeft / node.clientWidth
    const from = step > 0 ? Math.ceil(slot) : Math.floor(slot)
    const target = clamp(from + step, 0, props.items.length - 1)
    if (target === from) return
    const slides = node.querySelectorAll('img')
    const fromImage = slides[from]
    const toImage = slides[target]
    if (prefersQuietFx() || !isReady(fromImage) || !isReady(toImage)) {
      goTo(target)
      return
    }
    melt(fromImage, toImage, target)
  }

  // fullscreen nav: the melt canvas is hidden behind the dialog, so jump plain
  const jumpTo = (step: number) => {
    const target = clamp(index + step, 0, props.items.length - 1)
    if (target === index) return
    setIndex(target)
    track.current?.scrollTo({
      left: target * track.current.clientWidth,
      behavior: 'auto',
    })
  }

  const handleTrackKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      navigate(event.key === 'ArrowLeft' ? -1 : 1)
    }
  }

  return (
    <section
      aria-label={props.label}
      aria-roledescription='carousel'
      className={css.carousel}
      onKeyDown={handleTrackKeyDown}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: The named carousel region must receive focus for arrow-key scrolling.
      tabIndex={0}
    >
      <span className={css.label}>{props.label}</span>
      <div className={css.stage}>
        <div className={css.track} onScroll={handleScroll} ref={track}>
          {props.items.map((item) => (
            <img
              alt={item.alt}
              className={css.slide}
              decoding='async'
              draggable={false}
              height={SLIDE_HEIGHT}
              key={item.src}
              loading='lazy'
              src={item.src}
              width={SLIDE_WIDTH}
            />
          ))}
        </div>
        <canvas className={css.fx} ref={fx} />
      </div>
      <div className={css.deck}>
        <span aria-live='polite' className={css.status}>
          <span className={css.counter}>
            {pad(index + 1)}&nbsp;/&nbsp;{pad(props.items.length)}
          </span>
          <span className={css.note}>{props.items[index]?.alt}</span>
        </span>
        <span className={css.controls}>
          <button
            aria-disabled={index === 0}
            aria-label='Previous shot'
            className={css.button}
            onClick={() => navigate(-1)}
            type='button'
          >
            ↑
          </button>
          <button
            aria-disabled={index === props.items.length - 1}
            aria-label='Next shot'
            className={css.button}
            onClick={() => navigate(1)}
            type='button'
          >
            ↓
          </button>
          <Fullscreen
            caption={props.items[index]?.alt}
            label={props.label}
            meta={
              <>
                <span className={css.counter}>
                  {pad(index + 1)}&nbsp;/&nbsp;{pad(props.items.length)}
                </span>
                <button
                  aria-disabled={index === 0}
                  aria-label='Previous shot'
                  className={css.button}
                  onClick={() => jumpTo(-1)}
                  type='button'
                >
                  ↑
                </button>
                <button
                  aria-disabled={index === props.items.length - 1}
                  aria-label='Next shot'
                  className={css.button}
                  onClick={() => jumpTo(1)}
                  type='button'
                >
                  ↓
                </button>
              </>
            }
            trigger='⛶'
            triggerClassName={css.button}
          >
            <img
              alt=''
              height={SLIDE_HEIGHT}
              src={props.items[index]?.src}
              width={SLIDE_WIDTH}
            />
          </Fullscreen>
        </span>
      </div>
    </section>
  )
}

export default Carousel
