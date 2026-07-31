'use client'

import { readLocalJson, writeLocalJson } from 'lib/storage'
import type React from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import css from './system.module.css'

export const ANOMALIES = {
  konami: 'Green-line protocol',
  rubik: 'Operator calibration',
  manual: 'Manual verification',
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

export function SystemProvider(props: { children: React.ReactNode }) {
  const [anomalies, setAnomalies] = useState<AnomalyId[]>([])
  const [message, setMessage] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const stored = readLocalJson(STORAGE_KEY).value
    if (!Array.isArray(stored)) return
    const valid = stored.filter((id): id is AnomalyId => id in ANOMALIES)
    setAnomalies((current) => [...new Set([...valid, ...current])])
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const notify = useCallback((nextMessage: string) => {
    setMessage(nextMessage)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setMessage(''), 2600)
  }, [])

  const discover = useCallback(
    (id: AnomalyId) => {
      setAnomalies((current) => {
        if (current.includes(id)) return current
        const next = [...current, id]
        writeLocalJson(STORAGE_KEY, next)
        notify(`ANOMALY LOGGED / ${ANOMALIES[id]} ▼`)
        return next
      })
    },
    [notify],
  )

  const value = useMemo(
    () => ({ anomalies, discover, notify }),
    [anomalies, discover, notify],
  )

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
