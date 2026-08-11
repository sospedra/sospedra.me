import type { ReactNode } from 'react'
import css from './stickers.module.css'

export type StickerKind =
  | 'wordmark'
  | 'stack'
  | 'block'
  | 'cloud'
  | 'barcode'
  | 'ok'
  | 'smiley'
  | 'bolt'
  | 'flower'
  | 'eye'
  | 'cherry'
  | 'burst'

export const SLAP_POOL: StickerKind[] = [
  'ok',
  'smiley',
  'bolt',
  'flower',
  'eye',
  'cherry',
  'burst',
  'cloud',
]

const Smiley = () => (
  <svg viewBox='0 0 96 96' className={css.icon} aria-hidden='true'>
    <circle
      cx='48'
      cy='48'
      r='38'
      fill='#ffd23f'
      stroke='#fffdf6'
      strokeWidth='12'
      paintOrder='stroke'
    />
    <circle
      cx='48'
      cy='48'
      r='38'
      fill='none'
      stroke='#17130e'
      strokeWidth='4'
    />
    <circle cx='35' cy='40' r='5' fill='#17130e' />
    <circle cx='61' cy='40' r='5' fill='#17130e' />
    <path
      d='M30 56q18 16 36 0'
      fill='none'
      stroke='#17130e'
      strokeWidth='5'
      strokeLinecap='round'
    />
  </svg>
)

const Bolt = () => (
  <svg viewBox='0 0 96 96' className={css.icon} aria-hidden='true'>
    <path
      d='M54 8 22 54h20l-8 34 40-50H52l10-30z'
      fill='#7cc7ff'
      stroke='#fffdf6'
      strokeWidth='13'
      strokeLinejoin='round'
      paintOrder='stroke'
    />
    <path
      d='M54 8 22 54h20l-8 34 40-50H52l10-30z'
      fill='none'
      stroke='#17130e'
      strokeWidth='4'
      strokeLinejoin='round'
    />
  </svg>
)

const PETALS = [0, 72, 144, 216, 288]

const Flower = () => (
  <svg viewBox='0 0 96 96' className={css.icon} aria-hidden='true'>
    <g stroke='#fffdf6' strokeWidth='12' paintOrder='stroke'>
      {PETALS.map((angle) => (
        <ellipse
          key={angle}
          cx='48'
          cy='27'
          rx='14'
          ry='19'
          fill='#ff8ac2'
          transform={`rotate(${angle} 48 48)`}
        />
      ))}
    </g>
    {PETALS.map((angle) => (
      <ellipse
        key={angle}
        cx='48'
        cy='27'
        rx='14'
        ry='19'
        fill='none'
        stroke='#17130e'
        strokeWidth='3.5'
        transform={`rotate(${angle} 48 48)`}
      />
    ))}
    <circle
      cx='48'
      cy='48'
      r='12'
      fill='#ffd23f'
      stroke='#17130e'
      strokeWidth='3.5'
    />
  </svg>
)

const Eye = () => (
  <svg viewBox='0 0 120 72' className={css.icon} aria-hidden='true'>
    <path
      d='M8 36Q60 -8 112 36 60 80 8 36z'
      fill='#fffdf6'
      stroke='#fffdf6'
      strokeWidth='12'
      strokeLinejoin='round'
      paintOrder='stroke'
    />
    <path
      d='M8 36Q60 -8 112 36 60 80 8 36z'
      fill='none'
      stroke='#17130e'
      strokeWidth='4'
      strokeLinejoin='round'
    />
    <circle
      cx='60'
      cy='36'
      r='16'
      fill='#7cc7ff'
      stroke='#17130e'
      strokeWidth='4'
    />
    <circle cx='60' cy='36' r='6' fill='#17130e' />
    <circle cx='66' cy='30' r='3' fill='#fffdf6' />
  </svg>
)

const Cherry = () => (
  <svg viewBox='0 0 96 96' className={css.icon} aria-hidden='true'>
    <g
      stroke='#fffdf6'
      strokeWidth='12'
      strokeLinejoin='round'
      paintOrder='stroke'
    >
      <path d='M36 64q16-38 34-46' fill='none' />
      <circle cx='34' cy='70' r='15' fill='#ff5a3c' />
      <circle cx='62' cy='62' r='15' fill='#ff5a3c' />
    </g>
    <path
      d='M36 64q16-38 34-46'
      fill='none'
      stroke='#2e7d3a'
      strokeWidth='5'
      strokeLinecap='round'
    />
    <path
      d='M70 18q14-4 16 10-14 4-16-10z'
      fill='#3fae5a'
      stroke='#17130e'
      strokeWidth='3'
    />
    <circle
      cx='34'
      cy='70'
      r='15'
      fill='none'
      stroke='#17130e'
      strokeWidth='4'
    />
    <circle
      cx='62'
      cy='62'
      r='15'
      fill='none'
      stroke='#17130e'
      strokeWidth='4'
    />
    <circle cx='29' cy='65' r='4' fill='#ffb3a0' />
    <circle cx='57' cy='57' r='4' fill='#ffb3a0' />
  </svg>
)

const BURST_POINTS = Array.from({ length: 24 }, (_, i) => {
  const angle = (Math.PI * i) / 12
  const radius = i % 2 === 0 ? 58 : 44
  const x = 60 + radius * Math.cos(angle)
  const y = 60 + radius * Math.sin(angle)
  return `${x.toFixed(1)},${y.toFixed(1)}`
}).join(' ')

const Burst = () => (
  <svg viewBox='0 0 120 120' className={css.icon} aria-hidden='true'>
    <polygon
      points={BURST_POINTS}
      fill='#17130e'
      stroke='#fffdf6'
      strokeWidth='10'
      strokeLinejoin='round'
      paintOrder='stroke'
    />
    <text x='60' y='54' textAnchor='middle' className={css.burstText}>
      GREAT
    </text>
    <text x='60' y='76' textAnchor='middle' className={css.burstText}>
      FLAVOR
    </text>
  </svg>
)

const Cloud = () => (
  <div className={css.cloud}>
    <svg viewBox='0 0 160 96' className={css.cloudShape} aria-hidden='true'>
      <path
        d='M38 78Q12 78 12 58q0-16 16-18 2-20 24-20 14 0 20 10 6-8 18-8 18 0 20 16 22 0 22 20t-24 20z'
        fill='#fffdf6'
        stroke='#fffdf6'
        strokeWidth='10'
        strokeLinejoin='round'
        paintOrder='stroke'
      />
      <path
        d='M38 78Q12 78 12 58q0-16 16-18 2-20 24-20 14 0 20 10 6-8 18-8 18 0 20 16 22 0 22 20t-24 20z'
        fill='none'
        stroke='#17130e'
        strokeWidth='4'
        strokeLinejoin='round'
      />
    </svg>
    <span className={css.cloudText}>good mood</span>
  </div>
)

const Wordmark = () => (
  <div className={css.wordmark}>
    <span className={css.wordmarkLine}>STUCK</span>
    <span className={css.wordmarkLine}>ON</span>
    <span className={css.wordmarkLine}>YOU©</span>
    <span className={css.wordmarkTag}>adhesive social club</span>
  </div>
)

const Stack = () => (
  <div className={css.stack}>
    <span className={css.stackTop}>GET</span>
    <span className={css.stackMid}>STUCK</span>
    <span className={css.stackLow}>IN</span>
  </div>
)

const Block = () => (
  <div className={css.block}>
    LOUD
    <br />
    LUNCH
    <br />
    ENERGY
  </div>
)

const Barcode = () => (
  <div className={css.barcode}>
    <span className={css.bars} aria-hidden='true' />
    <span className={css.barcodeText}>©1994 CLUB EDITION</span>
  </div>
)

const Ok = () => <div className={css.ok}>OK!</div>

export const STICKER_FACE: Record<StickerKind, ReactNode> = {
  wordmark: <Wordmark />,
  stack: <Stack />,
  block: <Block />,
  cloud: <Cloud />,
  barcode: <Barcode />,
  ok: <Ok />,
  smiley: <Smiley />,
  bolt: <Bolt />,
  flower: <Flower />,
  eye: <Eye />,
  cherry: <Cherry />,
  burst: <Burst />,
}

export const STICKER_LABEL: Record<StickerKind, string> = {
  wordmark: 'Stuck on you club wordmark sticker',
  stack: 'Get stuck in cutout sticker',
  block: 'Loud lunch energy sticker',
  cloud: 'Good mood cloud sticker',
  barcode: 'Club edition barcode sticker',
  ok: 'OK sticker',
  smiley: 'Smiley sticker',
  bolt: 'Lightning bolt sticker',
  flower: 'Flower sticker',
  eye: 'Eye sticker',
  cherry: 'Cherry sticker',
  burst: 'Great flavor burst sticker',
}
