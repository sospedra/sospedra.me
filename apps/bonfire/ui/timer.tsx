'use client'

import { useState } from 'react'
import type { PlanMode } from 'services/plans'
import type { Session } from 'services/use-session'
import { Countdown } from 'ui/countdown'
import { Start } from 'ui/start'

type SoloPlan = { mode: PlanMode; epoch: number }

export function Timer(props: { session: Session }) {
  const { runtime, startPlan, finishPlan } = props.session
  const [solo, setSolo] = useState<SoloPlan | null>(null)

  const hosted = runtime.phase === 'host' ? runtime.snapshot : null
  const active =
    runtime.phase === 'host'
      ? hosted?.plan
        ? { mode: hosted.plan, epoch: hosted.planEpoch, done: finishPlan }
        : null
      : solo
        ? { ...solo, done: () => setSolo(null) }
        : null

  const onSelect =
    runtime.phase === 'host'
      ? startPlan
      : (mode: PlanMode) => setSolo({ mode, epoch: Date.now() })

  return (
    <div className='mb-10 w-full'>
      <div className='swap-in' key={active === null ? 'idle' : 'running'}>
        {active === null ? (
          <Start onSelect={onSelect} />
        ) : (
          <Countdown
            done={active.done}
            epoch={active.epoch}
            mode={active.mode}
          />
        )}
      </div>
    </div>
  )
}
