import cn from 'clsx'
import Icon, { type IconName } from 'components/Icon'
import type React from 'react'

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

const Reading: React.FC<{ minutes: number }> = (props) => {
  const slices = Math.max(Math.round(props.minutes / 3), 1)
  const pizza: IconName[] =
    slices > 5 ? ['pizza-box.png'] : Array(slices).fill('pizza.svg')
  const label = `${Math.max(1, Math.round(props.minutes))} minute read`
  return (
    <div
      className='inline-flex flex-wrap'
      role='img'
      title={label}
      aria-label={label}
    >
      {pizza.map((name, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: identical static slices
        <Icon name={name} key={idx} />
      ))}
    </div>
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
        <span className='mx-2 mt-1 text-xs opacity-75'>▼</span>
        <Reading minutes={props.minutes} />
      </div>
    </div>
  )
}

export default Meta
