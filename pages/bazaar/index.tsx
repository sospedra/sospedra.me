import { NextPage } from 'next'
import { useCallback, UIEvent, useEffect, useState } from 'react'
import { animated, useSpring } from 'react-spring'
import SpriteMountain from 'components/Sprite/Mountain'
import Shell from 'components/Shell'

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
      <div
        className='relative w-full h-screen overflow-y-auto text-white '
        onScrollCapture={onScroll}
      >
        <ul className='flex flex-col w-full max-w-4xl px-4 pt-12 pb-20 mx-auto'>
          {Array(50)
            .fill(0)
            .map((_, i) => (
              <li className='h-40 text-center border border-current' key={i}>
                {i}
              </li>
            ))}
        </ul>
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
        <SpriteMountain />
      </animated.aside>
    </Shell>
  )
}

export default Bazaar
