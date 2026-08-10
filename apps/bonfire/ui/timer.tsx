'use client'

import { useState } from 'react'
import type { PlanMode } from 'services/plans'
import { Countdown } from 'ui/countdown'
import { Start } from 'ui/start'

export function Timer() {
  const [status, setStatus] = useState<'idle' | PlanMode>('idle')
  const phase = status === 'idle' ? 'idle' : 'running'

  return (
    <div className='mb-10 w-full'>
      <div className='swap-in' key={phase}>
        {status === 'idle' ? (
          <Start onSelect={setStatus} />
        ) : (
          <Countdown done={() => setStatus('idle')} mode={status} />
        )}
      </div>
    </div>
  )
}
