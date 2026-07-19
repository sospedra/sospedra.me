import React from 'react'
import css from './mountain.module.css'

export const SpriteCloud: React.FC = () => {
  return (
    <div role='img'>
      <div className={css.cloud} />
    </div>
  )
}

const SpriteMountain: React.FC = () => {
  return (
    <>
      <link rel='preload' as='image' href={'/images/mountain.svg'} />
      <link rel='preload' as='image' href={'/images/clouds.svg'} />
      <link rel='preload' as='image' href={'/images/bridge.svg'} />

      <div role='img'>
        <div className={css.peak} />
        <div className={css.clouds} />
        <div className={css.bridge} />
      </div>
    </>
  )
}

export default SpriteMountain
