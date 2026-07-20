import type React from 'react'
import css from './car.module.css'
import chassis from './chassis.svg'
import reflect from './reflect.svg'
import rim from './rim.svg'
import windshield from './windshield.svg'

const SpriteCar: React.FC = () => {
  return (
    <>
      <link rel='preload' as='image' href={chassis.src} />
      <link rel='preload' as='image' href={windshield.src} />
      <link rel='preload' as='image' href={rim.src} />
      <link rel='preload' as='image' href={reflect.src} />

      <div role='img' className={css.car}>
        <img alt='' className={'opacity-0'} src={chassis.src} />
        <img alt='' className={css.windshield} src={windshield.src} />
        <img alt='' className={css.reflect} src={reflect.src} />
        <img alt='' className={css.chassis} src={chassis.src} />
        <img alt='' className={css['rim-rear']} src={rim.src} />
        <img alt='' className={css['rim-front']} src={rim.src} />
      </div>
    </>
  )
}

export default SpriteCar
