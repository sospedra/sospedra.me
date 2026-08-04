import cn from 'clsx'
import { range } from 'es-toolkit'
import type React from 'react'
import Icon from 'services/icon/icon'

// fixed UTC: server html and client hydration must render the same date
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const Time: React.FC<{ time: string }> = (props) => {
  return (
    <time dateTime={props.time}>{dateFormat.format(new Date(props.time))}</time>
  )
}

const MINUTES_PER_SLICE = 3
const WHOLE_BOX_SLICES = 5

const readingLabel = (minutes: number) =>
  `${Math.max(1, Math.round(minutes))} minute read`

export const Reading: React.FC<{ minutes: number; className?: string }> = (
  props,
) => {
  const label = readingLabel(props.minutes)
  const slices = Math.max(Math.round(props.minutes / MINUTES_PER_SLICE), 1)
  return (
    <span
      className={props.className ?? 'inline-flex flex-wrap'}
      role='img'
      title={label}
      aria-label={label}
    >
      {slices > WHOLE_BOX_SLICES ? (
        <Icon name='pizza-box' />
      ) : (
        range(slices).map((slice) => <Icon name='pizza' key={slice} />)
      )}
    </span>
  )
}

const Meta: React.FC<{
  time: string
  minutes: number
  className: string
  update?: string
}> = (props) => {
  return (
    <div>
      {props.update ? (
        <p>
          Last update on <Time time={props.update} />
        </p>
      ) : null}
      <div className={cn('flex items-center font-bold', props.className)}>
        <Time time={props.time} />
        <span aria-hidden='true' className='mx-2 mt-1 text-xs opacity-75'>
          ▼
        </span>
        <Reading minutes={props.minutes} />
      </div>
    </div>
  )
}

export default Meta
