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

    // paint on decode: a synchronous draw after a src swap rasters nothing
    image.onload = draw

    // coalesce by skipping, never by cancelling: touch scrolling delivers
    // event bursts between frames, and cancelling starves the callback
    let frameRequest = 0
    let nextFrame = 0
    const unsubscribe = createScrollListener((frame) => {
      nextFrame = frame
      if (frameRequest) return
      frameRequest = requestAnimationFrame(() => {
        frameRequest = 0
        image.src = createFrameRoute(nextFrame + 1)
      })
    })

    return () => {
      image.onload = null
      unsubscribe()
      cancelAnimationFrame(frameRequest)
    }
  }, [])

  return (
    <div aria-hidden='true' className={css.anchor}>
      <Preload />
      <div className={css.background} />
      <canvas id='canvas' ref={canvas} className={css.canvas} />
    </div>
  )
}

export default Fireworks
