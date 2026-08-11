'use client'

import { useRef } from 'react'
import { playKeyClick } from './key-click'
import { audioContextClass, ensureRunning } from './kit'

export const useKeyClick = (volume?: number) => {
  const contextRef = useRef<AudioContext | null>(null)

  return () => {
    const ContextClass = audioContextClass()
    if (ContextClass === null) return
    contextRef.current ??= new ContextClass()
    ensureRunning(contextRef.current)
    playKeyClick(contextRef.current, volume)
  }
}
