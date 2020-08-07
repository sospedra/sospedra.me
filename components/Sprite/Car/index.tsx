import React from 'react'
import Head from 'next/head'
import css from './car.module.css'

const SpriteCar: React.FC<{}> = () => {
  return (
    <>
      <Head>
        <link rel='preload' as='image' href={require('./chassis.svg')} />
        <link rel='preload' as='image' href={require('./windshield.svg')} />
        <link rel='preload' as='image' href={require('./rim.svg')} />
        <link rel='preload' as='image' href={require('./reflect.svg')} />
      </Head>

      <div role='img' className={css.car}>
        <img className={'opacity-0'} src={require('./chassis.svg')} />
        <img className={css.windshield} src={require('./windshield.svg')} />
        <img className={css.reflect} src={require('./reflect.svg')} />
        <img className={css.chassis} src={require('./chassis.svg')} />
        <img className={css['rim-rear']} src={require('./rim.svg')} />
        <img className={css['rim-front']} src={require('./rim.svg')} />
      </div>
    </>
  )
}

export default SpriteCar
