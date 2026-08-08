'use client'

import { debounce, uniq } from 'es-toolkit'
import type React from 'react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { readLocalJson, writeLocalJson } from 'services/storage'
import css from './system.module.css'

export const ANOMALIES = {
  konami: 'Green-line protocol',
  rubik: 'Operator calibration',
  manual: 'Manual verification',
  ghost: 'Phantom process',
  '404': 'Lost broadcast',
} as const

export type AnomalyId = keyof typeof ANOMALIES

type SystemContextValue = {
  anomalies: AnomalyId[]
  discover: (id: AnomalyId) => void
  notify: (message: string) => void
}

const SystemContext = createContext<SystemContextValue>({
  anomalies: [],
  discover: () => {},
  notify: () => {},
})

const STORAGE_KEY = 'midnight-io:anomalies'
// WCAG 2.2.1: give the toast enough dwell time to be read
const NOTICE_DISMISS_MS = 6000

const isAnomalyId = (id: unknown): id is AnomalyId =>
  typeof id === 'string' && Object.hasOwn(ANOMALIES, id)

export function SystemProvider(props: { children: React.ReactNode }) {
  const [anomalies, setAnomalies] = useState<AnomalyId[]>([])
  const [message, setMessage] = useState('')
  const dismissRef = useRef(debounce(() => setMessage(''), NOTICE_DISMISS_MS))

  useEffect(() => {
    const stored = readLocalJson(STORAGE_KEY)
    if (stored.status !== 'ok' || !Array.isArray(stored.value)) return
    const valid = stored.value.filter(isAnomalyId)
    setAnomalies((current) => uniq([...valid, ...current]))
  }, [])

  useEffect(() => {
    return () => dismissRef.current.cancel()
  }, [])

  const notify = (nextMessage: string) => {
    setMessage(nextMessage)
    dismissRef.current()
  }

  const discover = (id: AnomalyId) => {
    if (anomalies.includes(id)) return
    const next = [...anomalies, id]
    setAnomalies(next)
    writeLocalJson(STORAGE_KEY, next)
    notify(`ANOMALY LOGGED / ${ANOMALIES[id]} ▼`)
  }

  const value = { anomalies, discover, notify }

  return (
    <SystemContext.Provider value={value}>
      {props.children}
      <div
        className={css.packet}
        data-visible={Boolean(message)}
        role='status'
        aria-live='polite'
        aria-atomic='true'
      >
        {message}
      </div>
    </SystemContext.Provider>
  )
}

export const useSystem = () => useContext(SystemContext)
