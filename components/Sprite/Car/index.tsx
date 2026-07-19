import React from 'react'
import chassis from './chassis.svg'
import windshield from './windshield.svg'
import rim from './rim.svg'
import reflect from './reflect.svg'
import css from './car.module.css'

const SpriteCar: React.FC = () => {
  return (
    <>
      <link rel='preload' as='image' href={chassis.src} />
      <link rel='preload' as='image' href={windshield.src} />
      <link rel='preload' as='image' href={rim.src} />
      <link rel='preload' as='image' href={reflect.src} />

      <div role='img' className={css.car}>
        <img className={'opacity-0'} src={chassis.src} />
        <img className={css.windshield} src={windshield.src} />
        <img className={css.reflect} src={reflect.src} />
        <img className={css.chassis} src={chassis.src} />
        <img className={css['rim-rear']} src={rim.src} />
        <img className={css['rim-front']} src={rim.src} />
      </div>
    </>
  )
}

export default SpriteCar
