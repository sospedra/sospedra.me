'use client'

import type React from 'react'
import type { AnomalyId } from 'service/system'
import { useSystem } from 'service/system'

export default function AnomalyTrigger(props: {
  anomaly: AnomalyId
  children: React.ReactNode
  className?: string
  label: string
}) {
  const { discover } = useSystem()

  return (
    <button
      type='button'
      className={props.className}
      onClick={() => discover(props.anomaly)}
      aria-label={props.label}
    >
      {props.children}
    </button>
  )
}
