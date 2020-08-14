import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { animated, useSpring } from 'react-spring'
import { useScroll } from 'service/scroll'
import Link, { LinkBack } from 'components/Link'
import Shell from 'components/Shell'
import SpriteMountain from 'components/Sprite/Mountain'
import SpriteCar from 'components/Sprite/Car'
import Cheatcodes from 'components/Cheatcodes'
import Constellation, { useConstellation } from 'components/Constellation'
import css from './bazaar.module.css'

const Bazaar: NextPage = () => {
  const [dimension, setDimension] = useState(300)
  const nextConstellation = useConstellation()
  const [{ scroll }, set] = useSpring(() => ({ scroll: 0 }))
  const scrollRef = useScroll<HTMLDivElement>(
    (event: Event) => {
      // @ts-ignore
      const { scrollTop } = event.target
      if (scrollTop >= 0 && scrollTop <= dimension) {
        set({
          scroll: Math.min(scrollTop, dimension),
        })
      }
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
      <div ref={scrollRef} className={css.bazaar}>
        <div className='flex flex-col w-full max-w-xl px-4 pt-12 pb-20 mx-auto'>
          <Link url='/'>
            <LinkBack>Home</LinkBack>
          </Link>
          <h1 className='font-serif text-4xl text-cyan-300'>Bazaar</h1>
          <p>Under construction</p>

          <Cheatcodes />

          <ul className={css.list}>
            <li>
              <h3>the stack</h3>
              <p>this is the stack that is recommend, hand-picked babys</p>
              <Constellation name={nextConstellation()} />
            </li>
            <li>
              <h3>cheatcodes</h3>
              <p>this is the stack that is recommend, hand-picked babys</p>
              <Constellation name={nextConstellation()} />
            </li>
            <li>
              <h3>which key code</h3>
              <p>this is the stack that is recommend, hand-picked babys</p>
              <Constellation name={nextConstellation()} />
            </li>
            <li>
              <h3>spg</h3>
              <p>this is the stack that is recommend, hand-picked babys</p>
              <Constellation name={nextConstellation()} />
            </li>
            <li>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Curabitur convallis nulla vitae pharetra condimentum. Cras ut
                est consectetur, blandit augue vel, elementum dolor. Vestibulum
                est elit, convallis ac diam sed, aliquam pretium ante. Nullam at
                felis et neque commodo faucibus. Suspendisse mi sem, pulvinar at
                justo eget, laoreet finibus lacus. Quisque bibendum egestas
                varius. Duis placerat eget ante eget ultrices. Ut dapibus
                pharetra venenatis. Suspendisse in sollicitudin dui. Duis
                hendrerit urna ac ligula mattis ullamcorper. Proin iaculis
                tellus accumsan elit porttitor, rutrum laoreet lorem sagittis.
                Sed eget risus eget arcu ornare mattis. Mauris volutpat
                sollicitudin interdum. Nulla sodales ultrices metus, at posuere
                metus rutrum et. Etiam vehicula lacus nec tincidunt vehicula.
                Proin suscipit vestibulum metus sit amet aliquam.
              </p>
              <Constellation name={nextConstellation()} />
            </li>
          </ul>
        </div>
      </div>

      <animated.aside
        className={css.darksky}
        style={{
          opacity: scroll
            .interpolate({
              range: [0, dimension],
              output: [0.2, 1],
            })
            .interpolate((o) => o),
        }}
      />

      <animated.aside
        className='fixed bottom-0 left-0 w-screen pointer-events-none'
        style={{
          height: '50vh',
          transform: scroll
            .interpolate({
              range: [0, dimension],
              output: [0, 100],
            })
            .interpolate((s) => `translate3d(0, ${s}%, 0)`),
        }}
      >
        <div className={css.car}>
          <SpriteCar />
        </div>
        <SpriteMountain />
      </animated.aside>
    </Shell>
  )
}

export default Bazaar
