import React from 'react'
import Head from 'next/head'
import css from './mountain.module.css'

const SpriteMountain: React.FC<{}> = () => {
  return (
    <>
      <Head>
        <link rel='preload' as='image' href={require('./mountain.svg')} />
        <link rel='preload' as='image' href={require('./clouds.svg')} />
        <link rel='preload' as='image' href={require('./bridge.svg')} />
      </Head>

      <div role='img'>
        <div className={css.peak} />
        <div className={css.clouds} />
        <div className={css.bridge} />
      </div>
    </>
  )
}

export default SpriteMountain
