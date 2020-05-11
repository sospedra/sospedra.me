import React from 'react'
import cn from 'classnames'
import { parseISO, format } from 'date-fns'
import Icon from 'components/sospedra/Icon'

export const Time: React.FC<{ time: string }> = (props) => {
  const date = parseISO(props.time)
  return <time dateTime={props.time}>{format(date, 'LLLL	d, yyyy')}</time>
}

export const Reading: React.FC<{ minutes: number }> = (props) => {
  const slices = Math.max(Math.round(props.minutes / 5), 1)
  const pizza = slices > 5 ? ['pizza-box.png'] : Array(slices).fill('pizza.svg')
  return (
    <div className='inline-flex flex-wrap'>
      {pizza.map((name, idx) => (
        <Icon name={name} key={idx} />
      ))}
    </div>
  )
}

const Meta: React.FC<{ time: string; minutes: number; className: string }> = (
  props,
) => {
  return (
    <div
      className={cn('flex items-center font-bold', {
        [props.className]: !!props.className,
      })}
    >
      <Time time={props.time} />
      <span className='mx-2 mt-1 text-xs opacity-75'>▼</span>
      <Reading minutes={props.minutes} />
    </div>
  )
}

export default Meta
