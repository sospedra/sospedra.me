import { animated, useSpring } from '@react-spring/web'
import cn from 'clsx'
import Icon from 'components/Icon'
import type React from 'react'
import { useState } from 'react'
import { useMeasure, usePrevious } from 'service/screen'

type TreeProps = {
  name: string
  bold: boolean
  children?: React.ReactNode
  defaultOpen?: boolean
  route?: string
}

export const TreeParent: React.FC<TreeProps> = function TreeParent(props) {
  const [isOpen, setOpen] = useState(props.defaultOpen || false)
  const [prevDefault, setPrevDefault] = useState(props.defaultOpen)
  const previous = usePrevious(isOpen)
  const { ref, height: viewHeight } = useMeasure()
  const { height, opacity, transform } = useSpring({
    height: isOpen ? viewHeight : 0,
    opacity: isOpen ? 1 : 0,
    transform: `translate3d(${isOpen ? 0 : 20}px,0,0)`,
  })

  // render-phase adjust: a defaultOpen flip (new ?e= query) forces the node open
  if (props.defaultOpen !== prevDefault) {
    setPrevDefault(props.defaultOpen)
    if (props.defaultOpen) setOpen(true)
  }

  return (
    <div className='relative pt-1 overflow-x-hidden text-white truncate align-middle'>
      <button
        type='button'
        className={cn(
          'cursor-pointer align-text-top outline-hidden focus:outline-hidden',
          props.bold ? 'font-bold text-cyan-400' : 'font-normal',
        )}
        onClick={() => setOpen(!isOpen)}
      >
        <Icon
          className='w-4 h-4 mr-3'
          name={`${isOpen ? 'minus' : 'plus'}.svg`}
        />
        <span className='align-middle'>{props.name}</span>
      </button>

      <animated.div
        className='pl-4 ml-2 overflow-hidden border-l-2 border-white/25 border-dashed'
        style={{
          willChange: 'transform, opacity, height',
          opacity,
          height: isOpen && previous === isOpen ? 'auto' : height,
        }}
      >
        <animated.div style={{ transform }} ref={ref}>
          {props.children}
        </animated.div>
      </animated.div>
    </div>
  )
}

export const TreeChild: React.FC<TreeProps> = function TreeChild(props) {
  return (
    <div className='relative pt-1 overflow-x-hidden text-white truncate align-middle'>
      <a
        target='_blank'
        href={props.route?.replace('/public', '')}
        rel='noopener'
      >
        <Icon
          className='w-4 h-4 mr-3 align-text-top opacity-25'
          name='close.svg'
        />

        <span className='align-middle'>{props.name}</span>
      </a>
    </div>
  )
}
