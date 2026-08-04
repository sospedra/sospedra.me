'use client'

import { useState } from 'react'
import type { PlanMode } from 'services/plans'
import { Countdown } from 'ui/countdown'
import { Start } from 'ui/start'

export function Timer() {
  const [status, setStatus] = useState<'idle' | PlanMode>('idle')

  return (
    <div className='w-full mb-12'>
      {status === 'idle' ? (
        <Start onSelect={setStatus} />
      ) : (
        <Countdown done={() => setStatus('idle')} mode={status} />
      )}
    </div>
  )
}
