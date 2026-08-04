'use client'

import clsx from 'clsx'
import { Fragment, useRef, useState } from 'react'
import { PLANS, type PlanMode } from 'services/plans'
import { toTime } from 'services/time'
import { useInterval } from 'services/use-interval'
import css from './countdown.module.css'

const TICK_MS = 1000
const PIPS_LEAD_MS = 5000

export function Countdown(props: { mode: PlanMode; done: () => void }) {
  const pips = useRef<HTMLAudioElement>(null)
  const plan = PLANS[props.mode]
  const [status, setStatus] = useState({ index: 0, countdown: plan[0].time })

  useInterval(() => {
    if (status.countdown > 0) {
      if (status.countdown === PIPS_LEAD_MS) {
        pips.current?.play().catch(() => undefined)
      }
      setStatus({ ...status, countdown: status.countdown - TICK_MS })
      return
    }

    const next = plan[status.index + 1]
    if (next) {
      setStatus({ index: status.index + 1, countdown: next.time })
      return
    }

    props.done()
  }, TICK_MS)

  return (
    <div>
      <audio preload='auto' ref={pips}>
        <source src='/pips.aac' type='audio/aac' />
      </audio>

      <p className='font-mono text-center text-8xl'>
        {toTime(status.countdown)}
      </p>
      <div className='flex flex-row items-center justify-between w-full mt-4'>
        {plan.map((segment, position) => (
          <Fragment key={segment.id}>
            <div
              className={clsx(
                'inline-block w-2 h-2 border-2 border-solid',
                css.bullet,
                segment.type === 'work'
                  ? 'rotate-45 skew-x-6 skew-y-6'
                  : 'rounded-full',
                position <= status.index
                  ? 'bg-white border-white'
                  : 'border-gray-500',
                position === status.index && css.bulletActive,
              )}
            />
            {position !== plan.length - 1 && (
              <div
                className={clsx(
                  'relative inline-block w-full mx-1 bg-gray-500 rounded',
                  css.dash,
                  position < status.index && css.dashDone,
                )}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
