'use client'

import cn from 'clsx'
import type { CSSProperties } from 'react'
import css from './celebration.module.css'
import { CELEBRATION_TONES, confettiPieces } from './celebration-pieces'

export const ConfettiBurst = ({
  className,
  tones = CELEBRATION_TONES,
}: {
  className?: string
  tones?: readonly string[]
}) => (
  <div className={cn(css.confettiBurst, className)} aria-hidden='true'>
    {confettiPieces(tones).map((piece) => (
      <span
        key={piece.id}
        className={css.confettiPiece}
        style={
          {
            '--cf-x': `${piece.x}rem`,
            '--cf-peak': `${piece.peak}rem`,
            '--cf-fall': `${piece.fall}rem`,
            '--cf-spin': `${piece.spin}deg`,
            '--cf-delay': `${piece.delay}ms`,
            '--cf-duration': `${piece.duration}ms`,
            '--cf-tone': piece.tone,
            '--cf-w': `${piece.width}rem`,
            '--cf-h': `${piece.height}rem`,
          } as CSSProperties
        }
      />
    ))}
  </div>
)
