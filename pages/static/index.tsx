import React, { memo, useState } from 'react'
import { animated, useSpring } from 'react-spring'
import cn from 'classnames'
import { useMeasure, usePrevious } from 'service/screen'
import Icon from 'components/Icon'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'

const description = 'List of all the public-available static assets'

const Tree = memo(
  ({
    children,
    name,
    className,
    defaultOpen = false,
  }: {
    name: string
    children?: React.ReactNode
    className?: string
    defaultOpen?: boolean
  }) => {
    const [isOpen, setOpen] = useState(defaultOpen || false)
    const previous = usePrevious(isOpen)
    const { ref, height: viewHeight } = useMeasure()
    const { height, opacity, transform } = useSpring({
      height: isOpen ? viewHeight : 0,
      opacity: isOpen ? 1 : 0,
      transform: `translate3d(${isOpen ? 0 : 20}px,0,0)`,
    })

    return (
      <div className='relative pt-1 overflow-x-hidden text-white truncate align-middle'>
        <button
          className={cn(
            'w-4 h-4 mr-3 cursor-pointer align-text-top outline-none focus:outline-none',
            {
              'opacity-100': children,
              'opacity-25': !children,
            },
          )}
          onClick={() => setOpen(!isOpen)}
        >
          <Icon
            className='w-4 h-4'
            name={`${children ? (isOpen ? 'minus' : 'plus') : 'close'}.svg`}
          />
        </button>

        <span className={`align-middle ${className}`}>{name}</span>

        <animated.div
          className='pl-4 ml-2 overflow-hidden border-l-2 border-white border-opacity-25 border-dashed'
          style={{
            willChange: 'transform, opacity, height',
            opacity,
            height: isOpen && previous === isOpen ? 'auto' : height,
          }}
        >
          <animated.div style={{ transform }} ref={ref} children={children} />
        </animated.div>
      </div>
    )
  },
)

const Static = () => (
  <Shell
    title='Static'
    className='relative w-full h-full max-w-xl px-4 pt-12 pb-20 mx-auto text-white'
    description={description}
    canonical='/static'
  >
    <Link url='/'>
      <LinkBack>Home</LinkBack>
    </Link>

    <h1 className='pt-8 text-4xl'>Static assets</h1>
    <p className='pb-10'>{description}</p>

    <Tree name='main' defaultOpen>
      <Tree name='hello' />
      <Tree name='subtree with children'>
        <Tree name='hello' />
        <Tree name='sub-subtree with children'>
          <Tree name='child 1' />
          <Tree name='child 2' />
          <Tree name='child 3' />
        </Tree>
        <Tree name='hello' />
      </Tree>
      <Tree name='world' />
    </Tree>
  </Shell>
)

export default Static
