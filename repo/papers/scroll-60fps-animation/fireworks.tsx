'use client'

import type React from 'react'
import { useEffect, useRef } from 'react'
import css from './fireworks.module.css'
import Preload from './fireworks-preload'
import {
  createAspectRatio,
  createDraw,
  createFrameRoute,
  createScrollListener,
  createVirtualImage,
  prepareCanvas,
} from './scroll-frames'

const Fireworks: React.FC = () => {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = canvas.current
    if (!node) return
    const context = prepareCanvas(node)
    const aspect = createAspectRatio()
    const image = createVirtualImage()
    const draw = createDraw(context, image, aspect)

    draw()

    let frameRequest = 0
    const unsubscribe = createScrollListener((frame) => {
      cancelAnimationFrame(frameRequest)
      frameRequest = requestAnimationFrame(() => {
        image.src = createFrameRoute(frame + 1)
        draw()
      })
    })

    return () => {
      unsubscribe()
      cancelAnimationFrame(frameRequest)
    }
  }, [])

  return (
    <div className={css.anchor}>
      <Preload />
      <div className={css.background} />
      <canvas id='canvas' ref={canvas} className={css.canvas} />
    </div>
  )
}

export default Fireworks
