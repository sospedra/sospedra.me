import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { animated, config, useSpring } from 'react-spring'
import Link from 'components/Link'
import SpriteCity from 'components/sprite/city'
import Triangle from './Triangle'
import Title from './Title'
import css from './home.module.css'

const IndexPage: NextPage = () => {
  const [offset, setOffset] = useState(100)
  const { transform } = useSpring({
    transform: `translateY(${offset}vh)`,
    config: config.slow,
  })

  useEffect(() => {
    setOffset(0)
  }, [])

  return (
    <animated.div style={{ transform }}>
      <div className='flex flex-col items-center justify-center flex-1 w-screen h-screen'>
        <Head>
          <title>Rub&eacute;n Sospedra ~ sospedra.me</title>
        </Head>

        <main className={css.main}>
          <Title />

          <div className={css.menu}>
            <ul className=''>
              <li>
                <Link url='/papers' onClick={() => setOffset(100)}>
                  Papers
                </Link>
              </li>
              <li>
                <Link url='/papers' onClick={() => setOffset(100)}>
                  About
                </Link>
              </li>
              <li>
                <Link url='/papers' onClick={() => setOffset(100)}>
                  Contact
                </Link>
              </li>
            </ul>
            <Triangle />
          </div>
        </main>

        <SpriteCity />
      </div>
    </animated.div>
  )
}

export default IndexPage
