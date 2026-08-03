import type { CSSProperties } from 'react'

export const formatTime = (milliseconds: number): string => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '00:00'
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const extensionStart = (fileName: string): number => {
  const dot = fileName.lastIndexOf('.')
  return dot >= 0 && dot < fileName.length - 1 ? dot : -1
}

export const extensionOf = (fileName: string): string => {
  const dot = extensionStart(fileName)
  return dot >= 0 ? fileName.slice(dot + 1).toUpperCase() : 'AUDIO'
}

export const stemOf = (fileName: string): string => {
  const dot = extensionStart(fileName)
  return dot >= 0 ? fileName.slice(0, dot) : fileName
}

export const cssVars = (
  values: Record<`--${string}`, string | number>,
): CSSProperties => values as CSSProperties
