'use client'

import { throttle } from 'es-toolkit'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import css from './carousel.module.css'
import { pad } from './pad'

type Slide = {
  src: string
  alt: string
}

const SLIDE_WIDTH = 1600
const SLIDE_HEIGHT = 805
const SCROLL_THROTTLE_MS = 100

const Carousel: React.FC<{ label: string; items: Slide[] }> = (props) => {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const handleScroll = useMemo(
    () =>
      throttle(() => {
        const node = track.current
        if (!node) return
        const raw = Math.round(node.scrollLeft / node.clientWidth)
        setIndex(Math.min(props.items.length - 1, Math.max(0, raw)))
      }, SCROLL_THROTTLE_MS),
    [props.items.length],
  )

  useEffect(() => () => handleScroll.cancel(), [handleScroll])

  const scrollBySlide = (step: number) => {
    track.current?.scrollBy({
      left: step * track.current.clientWidth,
      behavior: 'smooth',
    })
  }

  return (
    <section
      aria-label={props.label}
      aria-roledescription='carousel'
      className={css.carousel}
    >
      <span className={css.label}>{props.label}</span>
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
      <div className={css.deck}>
        <span className={css.counter}>
          {pad(index + 1)}&nbsp;/&nbsp;{pad(props.items.length)}
        </span>
        <span className={css.note}>{props.items[index]?.alt}</span>
        <span className={css.controls}>
          <button
            aria-label='Previous shot'
            className={css.button}
            onClick={() => scrollBySlide(-1)}
            type='button'
          >
            ←
          </button>
          <button
            aria-label='Next shot'
            className={css.button}
            onClick={() => scrollBySlide(1)}
            type='button'
          >
            →
          </button>
        </span>
      </div>
    </section>
  )
}

export default Carousel
