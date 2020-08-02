import React, { useRef, useEffect } from 'react'
import css from './fireworks.module.css'
import Preload from './Preload'

const Fireworks: React.FC<{}> = () => {
  const canvas = useRef<HTMLCanvasElement>(null)
  const frameCount = 174

  useEffect(() => {
    if (canvas.current) {
      const image = new Image()
      const context = canvas.current.getContext('2d')
      const $vbody = document.querySelector('#vbody')

      canvas.current.width = document.documentElement.clientWidth
      canvas.current.height = document.documentElement.clientHeight
      image.src = '/papers/fireworks/001.webp'
      image.width = document.documentElement.clientWidth
      image.height = document.documentElement.clientHeight
      image.onload = function () {
        context?.drawImage(image, 0, 0)
      }

      $vbody?.addEventListener('scroll', () => {
        const scrollTop = $vbody.scrollTop
        const maxScrollTop = $vbody.scrollHeight - window.innerHeight
        const scrollFraction = scrollTop / maxScrollTop
        const frameIndex = Math.min(
          frameCount - 1,
          Math.floor(scrollFraction * frameCount),
        )
        console.log('e', scrollTop, frameIndex)
        requestAnimationFrame(() => {
          const index = (frameIndex + 1).toString().padStart(3, '0')
          image.src = `/papers/fireworks/${index}.webp`
          context?.drawImage(image, 0, 0)
        })
      })
    }
  }, [canvas])

  return (
    <div className={css.anchor}>
      <Preload max={frameCount} />
      <div className={css.background}>
        <canvas ref={canvas} className={css.canvas}></canvas>
      </div>
    </div>
  )
}

export default Fireworks
