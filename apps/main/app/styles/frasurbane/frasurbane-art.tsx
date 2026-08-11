import type { ReactNode } from 'react'
import css from './frasurbane.module.css'

export const Astrolabe = ({ draw = false }: { draw?: boolean }) => (
  <svg
    viewBox='0 0 320 320'
    className={css.astrolabe}
    data-draw={draw ? 'true' : undefined}
    aria-hidden='true'
  >
    <circle
      cx='160'
      cy='160'
      r='152'
      fill='none'
      strokeWidth='1.4'
      pathLength='1'
    />
    <circle
      cx='160'
      cy='160'
      r='118'
      fill='none'
      strokeWidth='0.9'
      strokeDasharray='2 7'
    />
    <circle
      cx='160'
      cy='160'
      r='74'
      fill='none'
      strokeWidth='0.9'
      pathLength='1'
    />
    <circle
      cx='160'
      cy='160'
      r='30'
      fill='none'
      strokeWidth='0.7'
      pathLength='1'
    />
    <line x1='24' y1='250' x2='296' y2='70' strokeWidth='0.9' pathLength='1' />
    <line x1='160' y1='8' x2='160' y2='312' strokeWidth='0.5' pathLength='1' />
    <line x1='8' y1='160' x2='312' y2='160' strokeWidth='0.5' pathLength='1' />
    <circle cx='236' cy='110' r='7' />
    <circle cx='84' cy='210' r='4' />
    <circle cx='160' cy='160' r='2.5' />
  </svg>
)

const BURST_POINTS = Array.from({ length: 32 }, (_, i) => {
  const angle = (Math.PI * i) / 16
  const radius = i % 2 === 0 ? 155 : 52
  return `${(160 + radius * Math.cos(angle)).toFixed(1)},${(160 + radius * Math.sin(angle)).toFixed(1)}`
}).join(' ')

export const Burst = () => (
  <svg viewBox='0 0 320 320' className={css.burst} aria-hidden='true'>
    <polygon points={BURST_POINTS} />
  </svg>
)

export const Orbit = () => (
  <svg viewBox='0 0 120 90' className={css.orbit} aria-hidden='true'>
    <circle
      cx='74'
      cy='45'
      r='34'
      fill='none'
      strokeWidth='1'
      strokeDasharray='3 5'
    />
    <circle cx='74' cy='45' r='18' fill='none' strokeWidth='1' />
    <circle cx='74' cy='11' r='4' />
    <circle cx='92' cy='45' r='2.5' />
    <line x1='0' y1='45' x2='40' y2='45' strokeWidth='1' />
  </svg>
)

const ROSETTE_DOTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (Math.PI * i) / 6
  return { cx: 30 + 22 * Math.cos(angle), cy: 30 + 22 * Math.sin(angle) }
})

export const Rosette = () => (
  <svg viewBox='0 0 60 60' className={css.rosette} aria-hidden='true'>
    <circle cx='30' cy='30' r='13' fill='none' strokeWidth='1.4' />
    {ROSETTE_DOTS.map((dot) => (
      <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r='3' />
    ))}
  </svg>
)

const SUN_RAYS = Array.from({ length: 14 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 14
  const x1 = 60 + 30 * Math.cos(angle)
  const y1 = 60 + 30 * Math.sin(angle)
  const x2 = 60 + (i % 2 === 0 ? 52 : 44) * Math.cos(angle + 0.18)
  const y2 = 60 + (i % 2 === 0 ? 52 : 44) * Math.sin(angle + 0.18)
  return { x1, y1, x2, y2 }
})

export const SwirlSun = () => (
  <svg viewBox='0 0 120 120' className={css.swirlSun} aria-hidden='true'>
    <circle cx='60' cy='60' r='24' fill='none' strokeWidth='2.4' />
    <path d='M60 44q10 4 6 16t-14 6' fill='none' strokeWidth='2' />
    {SUN_RAYS.map((ray) => (
      <line
        key={`${ray.x2}-${ray.y2}`}
        x1={ray.x1}
        y1={ray.y1}
        x2={ray.x2}
        y2={ray.y2}
        strokeWidth='2.2'
        strokeLinecap='round'
      />
    ))}
  </svg>
)

const MotifAstrolabe = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <circle cx='24' cy='24' r='19' fill='none' />
    <circle cx='24' cy='24' r='11' fill='none' strokeDasharray='2 4' />
    <line x1='8' y1='36' x2='40' y2='12' />
    <circle cx='33' cy='17' r='2.4' className={css.motifFill} />
  </svg>
)

const MotifColumn = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <path d='M14 10h20M16 14h16M14 38h20M16 34h16' />
    <line x1='20' y1='14' x2='20' y2='34' />
    <line x1='24' y1='14' x2='24' y2='34' />
    <line x1='28' y1='14' x2='28' y2='34' />
  </svg>
)

const MotifArch = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <path d='M12 40V22q12-16 24 0v18' fill='none' />
    <path d='M8 40h32' />
    <path d='M16 40V23.5q8-11 16 0V40' fill='none' />
  </svg>
)

const MotifLaurel = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <path d='M24 40V12' fill='none' />
    <path
      d='M24 34q-9-2-11-10 9 1 11 10zM24 34q9-2 11-10-9 1-11 10zM24 24q-8-2-9-9 7 1 9 9zM24 24q8-2 9-9-7 1-9 9z'
      className={css.motifFill}
    />
  </svg>
)

const MotifCoffee = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <path d='M12 20h20v8a10 10 0 0 1-20 0z' fill='none' />
    <path d='M32 22h4a4 4 0 0 1 0 8h-4' fill='none' />
    <path d='M10 42h26' />
    <path d='M19 14q-2-3 0-6M26 14q-2-3 0-6' fill='none' />
  </svg>
)

const MotifGlobe = (
  <svg viewBox='0 0 48 48' aria-hidden='true'>
    <circle cx='24' cy='22' r='14' fill='none' />
    <ellipse cx='24' cy='22' rx='6' ry='14' fill='none' />
    <line x1='10' y1='22' x2='38' y2='22' />
    <path d='M15 34l-4 8M33 34l4 8M14 42h20' />
  </svg>
)

export type Motif = {
  numeral: string
  name: string
  note: string
  art: ReactNode
}

export const MOTIFS: Motif[] = [
  {
    numeral: 'I',
    name: 'astrolabe',
    note: 'measured the sky, decorated the study',
    art: MotifAstrolabe,
  },
  {
    numeral: 'II',
    name: 'column',
    note: 'held nothing but opinions',
    art: MotifColumn,
  },
  {
    numeral: 'III',
    name: 'arch',
    note: 'a doorway promoted to art',
    art: MotifArch,
  },
  {
    numeral: 'IV',
    name: 'laurel',
    note: 'victory, pressed and framed',
    art: MotifLaurel,
  },
  {
    numeral: 'V',
    name: 'coffee',
    note: 'the decade in a cup, twice daily',
    art: MotifCoffee,
  },
  {
    numeral: 'VI',
    name: 'globe',
    note: 'the world, at armchair scale',
    art: MotifGlobe,
  },
]

export const SPARKS = [
  { x: 6, y: 14, d: 0, s: 1.2 },
  { x: 90, y: 9, d: 500, s: 0.9 },
  { x: 13, y: 74, d: 1100, s: 1 },
  { x: 93, y: 58, d: 300, s: 1.35 },
  { x: 72, y: 88, d: 850, s: 0.8 },
  { x: 24, y: 38, d: 1400, s: 0.95 },
  { x: 47, y: 7, d: 1750, s: 1.1 },
  { x: 5, y: 50, d: 2100, s: 0.85 },
  { x: 95, y: 33, d: 400, s: 1 },
  { x: 58, y: 93, d: 1300, s: 1.2 },
  { x: 35, y: 85, d: 700, s: 0.75 },
  { x: 82, y: 76, d: 1900, s: 1.05 },
]
