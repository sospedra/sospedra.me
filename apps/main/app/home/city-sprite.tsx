import type React from 'react'
import css from './city-sprite.module.css'

const SpriteCity: React.FunctionComponent = () => {
  return (
    <>
      <link
        rel='preload'
        as='image'
        href='/images/street-home.webp?v=crisp-1'
        imageSrcSet='/images/street-home.webp?v=crisp-1 1x, /images/street-home@2x.webp?v=crisp-1 2x'
      />
      <link rel='preload' as='image' href='/images/bridge.svg' />
      <span aria-hidden='true' className={css.skyglow} />
      <span aria-hidden='true' className={css.dusk} />
      <figure aria-hidden='true' className={css.city}>
        <span className={css.horizon} />
        <span className={css.skyline} />
        <span className={css.architecture} />
        <span className={css.roadway} />
        <span className={css.bridge} />
        <span className={css.atmosphere} />
      </figure>
    </>
  )
}

export default SpriteCity
