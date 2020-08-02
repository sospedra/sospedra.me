import React, { useRef, useEffect } from 'react'
import css from './fireworks.module.css'
import Preload from './Preload'

const Fireworks: React.FC<{}> = () => {
  const canvas = useRef<HTMLCanvasElement>(null)
  const frameCount = 174
  const size = { width: 2560, height: 1440 }

  useEffect(() => {
    if (canvas.current) {
      const image = new Image()
      const context = canvas.current.getContext('2d')
      const $vbody = document.querySelector('#vbody')
      const width = document.documentElement.clientWidth
      const height = document.documentElement.clientHeight
      const aspect = width > height ? 1 : 2

      image.src = '/papers/fireworks/001.webp'
      image.width = size.width
      image.height = size.height
      canvas.current.width = size.width
      canvas.current.height = size.height

      if (context) context.imageSmoothingQuality = 'high'
      context?.drawImage(image, 0, 0, size.width * aspect, size.height)

      $vbody?.addEventListener('scroll', () => {
        const scrollTop = $vbody.scrollTop
        const maxScrollTop = $vbody.scrollHeight - window.innerHeight
        const scrollFraction = scrollTop / maxScrollTop
        const frameIndex = Math.min(
          frameCount - 1,
          Math.floor(scrollFraction * frameCount),
        )

        requestAnimationFrame(() => {
          const index = (frameIndex + 1).toString().padStart(3, '0')
          image.src = `/papers/fireworks/${index}.webp`
          context?.drawImage(image, 0, 0, size.width * aspect, size.height)
        })
      })
    }
  }, [canvas])

  return (
    <div className={css.anchor}>
      <Preload max={frameCount} />
      <div className={css.background} />
      <canvas id='canvas' ref={canvas} className={css.canvas}></canvas>
    </div>
  )
}

export default Fireworks
