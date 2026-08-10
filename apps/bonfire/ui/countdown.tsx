'use client'

import clsx from 'clsx'
import { Fragment, useEffect, useRef, useState } from 'react'
import { PLANS, type PlanMode, type Segment } from 'services/plans'
import { timelineAt } from 'services/session'
import { toTime } from 'services/time'
import { useInterval } from 'services/use-interval'
import css from './countdown.module.css'

const TICK_MS = 1000
const PIPS_LEAD_MS = 5000

const phaseLabel = (plan: Segment[], index: number): string => {
  const segment = plan[index]
  if (segment.type === 'rest') return 'rest'
  const workDone = plan.slice(0, index + 1).filter((s) => s.type === 'work')
  const workTotal = plan.filter((s) => s.type === 'work')
  return `work ${workDone.length} of ${workTotal.length}`
}

export function Countdown(props: {
  mode: PlanMode
  epoch: number
  done: () => void
}) {
  const pips = useRef<HTMLAudioElement>(null)
  const doneFired = useRef(false)
  const plan = PLANS[props.mode]
  const [nowMs, setNowMs] = useState(() => Date.now())

  useInterval(() => setNowMs(Date.now()), TICK_MS)

  const timeline = timelineAt(plan, nowMs - props.epoch)
  const ending = timeline !== null && timeline.remaining <= PIPS_LEAD_MS

  useEffect(() => {
    if (ending) pips.current?.play().catch(() => undefined)
  }, [ending])

  useEffect(() => {
    if (timeline !== null || doneFired.current) return
    doneFired.current = true
    props.done()
  })

  if (timeline === null) return null
  const status = { index: timeline.index, countdown: timeline.remaining }

  return (
    <div>
      <audio preload='auto' ref={pips}>
        <source src='/pips.aac' type='audio/aac' />
      </audio>

      <p
        className={clsx(
          'text-center text-[11px] tracking-[0.3em] uppercase',
          plan[status.index].type === 'work' ? 'text-ember' : 'text-ash',
        )}
      >
        {phaseLabel(plan, status.index)}
      </p>
      <p
        className={clsx(
          'text-center font-display text-8xl font-light tracking-tight',
          css.digits,
          ending && css.digitsEnding,
        )}
      >
        {toTime(status.countdown)
          .split('')
          .map((char, slot) => (
            <span
              className={
                char === ':' ? undefined : 'inline-block w-[1ch] text-center'
              }
              // biome-ignore lint/suspicious/noArrayIndexKey: slots are positional by design
              key={slot}
            >
              {char}
            </span>
          ))}
      </p>
      <div className='mt-4 flex w-full flex-row items-center justify-between'>
        {plan.map((segment, position) => (
          <Fragment key={segment.id}>
            <div
              className={clsx(
                'inline-block h-2 w-2 border-2 border-solid',
                css.bullet,
                segment.type === 'work'
                  ? 'rotate-45 skew-x-6 skew-y-6'
                  : 'rounded-full',
                position <= status.index
                  ? 'border-ember bg-ember'
                  : 'border-white/25',
                position === status.index && css.bulletActive,
              )}
            />
            {position !== plan.length - 1 && (
              <div
                className={clsx(
                  'relative mx-1 inline-block w-full rounded bg-white/15',
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
