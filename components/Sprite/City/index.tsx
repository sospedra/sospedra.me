import type React from 'react'
import css from './city.module.css'

const SpriteCity: React.FunctionComponent = () => {
  return (
    <>
      <link rel='preload' as='image' href={'/images/street.svg'} />
      <figure aria-hidden='true' className={css.city}>
        <span className={css.horizon} />
        <span className={css.architecture} />
        <span className={css.roadway} />
        <span className={css.atmosphere} />
      </figure>
    </>
  )
}

export default SpriteCity
