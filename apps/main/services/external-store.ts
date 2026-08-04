'use client'

import { useSyncExternalStore } from 'react'

export type ExternalStore<T> = {
  get: () => T
  set: (next: T) => void
  subscribe: (listener: () => void) => () => void
}

export const createExternalStore = <T>(initial: T): ExternalStore<T> => {
  let value = initial
  const listeners = new Set<() => void>()

  return {
    get: () => value,
    set: (next: T) => {
      if (Object.is(next, value)) return
      value = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

// Selector results must be primitives or stable references: the selected value is the snapshot React compares with Object.is to skip re-renders.
export const useStoreSelector = <T, Slice>(
  store: ExternalStore<T>,
  select: (value: T) => Slice,
): Slice =>
  useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  )
