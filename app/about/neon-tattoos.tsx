import type React from 'react'
import css from './about.module.css'

// ignorant-style flash: wobbly single strokes on purpose, like a neon bar sign
const HeartTattoo: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 120 130'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path d='M40 30 Q35 15 46 9 M58 25 Q58 7 67 5 M77 30 Q84 17 76 9' />
    <path d='M60 118 Q20 88 16 58 Q14 34 34 32 Q52 30 60 48 Q68 30 86 32 Q106 34 104 58 Q100 88 60 118 Z' />
    <text x='60' y='82' textAnchor='middle'>
      js
    </text>
  </svg>
)

const SnakeTattoo: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 110 150'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path d='M78 18 Q104 34 84 48 Q40 66 40 84 Q40 104 74 106 Q98 110 84 128 Q70 142 46 136' />
    <path d='M78 18 Q68 6 80 5 Q92 6 88 16' />
    <circle cx='82' cy='11' r='1.5' fill='currentColor' stroke='none' />
    <path
      className={css.tattooTongue}
      d='M88 14 L100 10 M100 10 L106 4 M100 10 L107 12'
    />
  </svg>
)

const BoltTattoo: React.FC = () => (
  <svg
    aria-hidden='true'
    viewBox='0 0 90 130'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path d='M52 8 L24 66 L42 63 L28 122 L70 52 L48 56 L64 8 Z' />
    <path
      className={css.tattooSpark}
      d='M12 40 L4 34 M16 88 L6 92 M76 96 L86 102 M74 24 L84 18'
    />
  </svg>
)

export default function NeonTattoos() {
  return (
    <div aria-hidden='true' className={css.tattoos}>
      <span className={`${css.tattoo} ${css.tattooHeart}`}>
        <HeartTattoo />
      </span>
      <span className={`${css.tattoo} ${css.tattooSnake}`}>
        <SnakeTattoo />
      </span>
      <span className={`${css.tattoo} ${css.tattooBolt}`}>
        <BoltTattoo />
      </span>
    </div>
  )
}
