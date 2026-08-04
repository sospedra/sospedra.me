import type { CSSProperties } from 'react'

// the one place a custom-property record becomes a style prop
export const cssVars = (
  values: Record<`--${string}`, string | number>,
): CSSProperties => values as CSSProperties
