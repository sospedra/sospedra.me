import React, { useRef, useEffect } from 'react'
import css from './fireworks.module.css'
import Preload from './Preload'
import {
  createFrameRoute,
  createAspectRatio,
  createVirtualImage,
  createCanvasContext,
  createDraw,
  createScrollListener,
} from './service'

const Fireworks: React.FC<{}> = () => {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvas.current) {
      const context = createCanvasContext(canvas.current)
      const aspect = createAspectRatio()
      const image = createVirtualImage()
      const draw = createDraw(context, image, aspect)

      draw()

      createScrollListener((frame) => {
        requestAnimationFrame(() => {
          image.src = createFrameRoute(frame + 1)
          draw()
        })
      })
    }
  }, [canvas])

  return (
    <div className={css.anchor}>
      <Preload />
      <div className={css.background} />
      <canvas id='canvas' ref={canvas} className={css.canvas} />
    </div>
  )
}

export default Fireworks
