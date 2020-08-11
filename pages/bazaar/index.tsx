import { NextPage } from 'next'
import { useCallback, UIEvent, useEffect, useState } from 'react'
import { animated, useSpring } from 'react-spring'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import SpriteMountain from 'components/Sprite/Mountain'
import SpriteCar from 'components/Sprite/Car'
import Cheatcodes from 'components/Cheatcodes'
import css from './bazaar.module.css'

const Bazaar: NextPage = () => {
  const [dimension, setDimension] = useState(300)
  const [{ scroll }, set] = useSpring(() => ({ scroll: 0 }))
  const onScroll = useCallback(
    (event: UIEvent) => {
      set({
        scroll: Math.min(event.currentTarget.scrollTop, dimension),
      })
    },
    [dimension],
  )

  useEffect(() => {
    setDimension(window.innerHeight / 2)
  }, [])

  return (
    <Shell
      title='Bazaar'
      className=''
      description='Gallery of my featured projects'
      canonical='/bazaar'
    >
      <div className={css.bazaar} onScrollCapture={onScroll}>
        <div className='flex flex-col w-full max-w-4xl px-4 pt-12 pb-20 mx-auto'>
          <Link url='/'>
            <LinkBack>Home</LinkBack>
          </Link>
          <h1 className='font-serif text-4xl text-cyan-300'>Bazaar</h1>
          <p>Under construction</p>

          <Cheatcodes />
        </div>
      </div>

      <animated.aside
        className='fixed bottom-0 left-0 w-screen pointer-events-none'
        style={{
          height: '50vh',
          transform: scroll
            .interpolate({
              range: [0, dimension],
              output: [0, 100],
            })
            .interpolate((s) => `translate3d(0, ${s}%,0)`),
        }}
      >
        <animated.aside className={css.car}>
          <SpriteCar />
        </animated.aside>
        <SpriteMountain />
      </animated.aside>
    </Shell>
  )
}

export default Bazaar
