'use client'

import { useState } from 'react'
import { PLANS, type PlanMode } from 'services/plans'
import { timelineAt } from 'services/session'
import type { Session } from 'services/use-session'
import { Countdown } from 'ui/countdown'
import { Join } from 'ui/join'
import { Start } from 'ui/start'

type SoloPlan = { mode: PlanMode; epoch: number }
type ActivePlan = { mode: PlanMode; epoch: number; done: () => void }

export function Timer(props: { session: Session }) {
  const { runtime } = props.session
  const [solo, setSolo] = useState<SoloPlan | null>(null)
  const [endedEpoch, setEndedEpoch] = useState(0)

  const active = activePlan(props.session, solo, setSolo, endedEpoch)
  const body = timerBody(props.session, active, setSolo, setEndedEpoch)

  return (
    <div className='mb-10 w-full'>
      <div className='swap-in' key={bodyKey(runtime.phase, active)}>
        {body}
      </div>
    </div>
  )
}

const bodyKey = (phase: string, active: ActivePlan | null): string =>
  `${phase}-${active === null ? 'idle' : 'running'}`

const activePlan = (
  session: Session,
  solo: SoloPlan | null,
  setSolo: (plan: SoloPlan | null) => void,
  endedEpoch: number,
): ActivePlan | null => {
  const { runtime, finishPlan } = session
  const snapshot = runtime.snapshot
  if (runtime.phase === 'solo')
    return solo ? { ...solo, done: () => setSolo(null) } : null
  if (runtime.phase === 'gate') return null
  if (!snapshot?.plan || snapshot.planEpoch === endedEpoch) return null
  const expired =
    timelineAt(PLANS[snapshot.plan], Date.now() - snapshot.planEpoch) === null
  if (runtime.phase === 'seated' && expired) return null
  return {
    mode: snapshot.plan,
    epoch: snapshot.planEpoch,
    done: runtime.phase === 'host' ? finishPlan : () => undefined,
  }
}

const timerBody = (
  session: Session,
  active: ActivePlan | null,
  setSolo: (plan: SoloPlan) => void,
  setEndedEpoch: (epoch: number) => void,
) => {
  const { runtime, startPlan } = session
  if (runtime.phase === 'gate') return <Join session={session} />
  if (active !== null) {
    const done =
      runtime.phase === 'seated'
        ? () => setEndedEpoch(runtime.snapshot?.planEpoch ?? 0)
        : active.done
    return <Countdown done={done} epoch={active.epoch} mode={active.mode} />
  }
  if (runtime.phase === 'seated') {
    return (
      <p className='text-center text-[11px] tracking-[0.3em] text-ash uppercase'>
        the keeper tends the fire
      </p>
    )
  }
  const onSelect =
    runtime.phase === 'host'
      ? startPlan
      : (mode: PlanMode) => setSolo({ mode, epoch: Date.now() })
  return <Start onSelect={onSelect} />
}
