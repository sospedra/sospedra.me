import type React from 'react'
import css from './cloud-sprite.module.css'

export const SpriteCloud: React.FC = () => {
  return (
    <div role='img'>
      <div className={css.cloud} />
    </div>
  )
}
