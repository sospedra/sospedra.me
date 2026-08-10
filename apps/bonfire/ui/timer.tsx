'use client'

import { useState } from 'react'
import type { PlanMode } from 'services/plans'
import { Countdown } from 'ui/countdown'
import { Start } from 'ui/start'

type SoloPlan = { mode: PlanMode; epoch: number }

export function Timer() {
  const [solo, setSolo] = useState<SoloPlan | null>(null)
  const phase = solo === null ? 'idle' : 'running'

  return (
    <div className='mb-10 w-full'>
      <div className='swap-in' key={phase}>
        {solo === null ? (
          <Start onSelect={(mode) => setSolo({ mode, epoch: Date.now() })} />
        ) : (
          <Countdown
            done={() => setSolo(null)}
            epoch={solo.epoch}
            mode={solo.mode}
          />
        )}
      </div>
    </div>
  )
}
