import React, { memo, useState } from 'react'
import { animated, useSpring } from 'react-spring'
import { useMeasure, usePrevious } from 'service/screen'
import Icon from 'components/Icon'

type TreeProps = {
  name: string
  children?: React.ReactNode
  defaultOpen?: boolean
  route?: string
}

export const TreeParent: React.FC<TreeProps> = memo(function TreeParent(props) {
  const [isOpen, setOpen] = useState(props.defaultOpen || false)
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
        className={
          'cursor-pointer align-text-top outline-none focus:outline-none'
        }
        onClick={() => setOpen(!isOpen)}
      >
        <Icon
          className='w-4 h-4 mr-3'
          name={`${isOpen ? 'minus' : 'plus'}.svg`}
        />
        <span className='align-middle'>{props.name}</span>
      </button>

      <animated.div
        className='pl-4 ml-2 overflow-hidden border-l-2 border-white border-opacity-25 border-dashed'
        style={{
          willChange: 'transform, opacity, height',
          opacity,
          height: isOpen && previous === isOpen ? 'auto' : height,
        }}
      >
        <animated.div
          style={{ transform }}
          ref={ref}
          children={props.children}
        />
      </animated.div>
    </div>
  )
})

export const TreeChild: React.FC<TreeProps> = memo(function TreeChild(props) {
  return (
    <div className='relative pt-1 overflow-x-hidden text-white truncate align-middle'>
      <a target='_blank' href={props.route?.replace('/public', '')}>
        <Icon
          className='w-4 h-4 mr-3 align-text-top opacity-25'
          name='close.svg'
        />

        <span className='align-middle'>{props.name}</span>
      </a>
    </div>
  )
})
