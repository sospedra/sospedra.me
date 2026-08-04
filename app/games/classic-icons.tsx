import css from './games.module.css'

export function SnakeIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        <linearGradient id='games-snake-body' x1='0' y1='0' x2='1' y2='1'>
          <stop stopColor='#d9ff88' />
          <stop offset='.5' stopColor='#55d98a' />
          <stop offset='1' stopColor='#147d72' />
        </linearGradient>
        <linearGradient id='games-snake-head' x1='.2' y1='0' x2='.8' y2='1'>
          <stop stopColor='#b9fff1' />
          <stop offset='1' stopColor='#3399a7' />
        </linearGradient>
      </defs>
      <ellipse cx='61' cy='103' rx='43' ry='10' fill='rgb(4 12 22 / 24%)' />
      <path
        d='M26 77c-12-20 1-47 27-49 23-2 40 14 35 31-4 14-19 18-29 10-8-7-4-18 5-20'
        fill='none'
        stroke='url(#games-snake-body)'
        strokeWidth='17'
        strokeLinecap='square'
        strokeLinejoin='round'
      />
      <path
        d='m80 43 25 10-6 24-28-4-7-20Z'
        fill='url(#games-snake-head)'
        stroke='#d6fffb'
        strokeWidth='2'
        strokeLinejoin='round'
      />
      <path d='m71 53 28 0-7 9-23 3Z' fill='rgb(10 52 67 / 38%)' />
      <circle cx='90' cy='51' r='3.5' fill='#101827' />
      <circle cx='91' cy='50' r='1.2' fill='white' />
      <path
        d='m103 63 12 3-11 3'
        fill='none'
        stroke='#ff6f98'
        strokeWidth='2.5'
        strokeLinecap='round'
      />
      <path
        d='m32 80-15 8 17 6'
        fill='none'
        stroke='#1b776d'
        strokeWidth='8'
        strokeLinejoin='round'
      />
    </svg>
  )
}

export function MinesIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        <radialGradient id='games-mine-shell' cx='.32' cy='.25' r='.72'>
          <stop stopColor='#d5e8ff' />
          <stop offset='.28' stopColor='#7186a8' />
          <stop offset='.72' stopColor='#263246' />
          <stop offset='1' stopColor='#0b111d' />
        </radialGradient>
        <linearGradient id='games-mine-spike' x1='0' y1='0' x2='1' y2='1'>
          <stop stopColor='#c9d6eb' />
          <stop offset='1' stopColor='#263246' />
        </linearGradient>
      </defs>
      <ellipse cx='63' cy='106' rx='40' ry='9' fill='rgb(4 12 22 / 28%)' />
      <g fill='url(#games-mine-spike)' stroke='#111a2a' strokeWidth='2'>
        <path d='m58 25 6-21 7 22Z' />
        <path d='m82 31 17-15-6 23Z' />
        <path d='m98 50 23-4-18 15Z' />
        <path d='m100 76 20 10-24 2Z' />
        <path d='m83 96 8 24-20-17Z' />
        <path d='m52 101-8 23-5-24Z' />
        <path d='m29 88-22 5 17-16Z' />
        <path d='m24 60-20-11 24-1Z' />
        <path d='m37 37-9-21 20 14Z' />
      </g>
      <circle
        cx='64'
        cy='65'
        r='39'
        fill='url(#games-mine-shell)'
        stroke='#a7b9d4'
        strokeWidth='2'
      />
      <path
        d='M38 49c12-18 40-22 56-4'
        fill='none'
        stroke='rgb(255 255 255 / 34%)'
        strokeWidth='5'
        strokeLinecap='round'
      />
      <circle cx='52' cy='58' r='6' fill='#111827' />
      <circle cx='78' cy='58' r='6' fill='#111827' />
      <path
        d='M47 80c10 9 25 9 35-1'
        fill='none'
        stroke='#111827'
        strokeWidth='5'
        strokeLinecap='round'
      />
      <circle cx='50' cy='55' r='1.8' fill='#e8f2ff' />
      <circle cx='76' cy='55' r='1.8' fill='#e8f2ff' />
    </svg>
  )
}

export function RubiksIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <ellipse cx='64' cy='108' rx='43' ry='9' fill='rgb(4 12 22 / 25%)' />
      <path
        d='m64 12 46 25-46 26-46-26Z'
        fill='#edf3ff'
        stroke='#202941'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      <path
        d='m18 37 46 26v52L18 89Z'
        fill='#e2526b'
        stroke='#202941'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      <path
        d='m64 63 46-26v52l-46 26Z'
        fill='#3979d9'
        stroke='#202941'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      <g fill='none' stroke='#27314a' strokeWidth='2.5' strokeLinejoin='round'>
        <path d='m33 45 46-25M48 54l46-25M33 29l46 26M49 20l46 26' />
        <path d='M33 45v52M48 54v52M18 54l46 26M18 71l46 26' />
        <path d='M79 54v52M94 45v52M64 80l46-26M64 97l46-26' />
      </g>
      <path d='m67 16 12 7-15 8-12-7Z' fill='#f4d34f' />
      <path d='m22 42 12 7v15l-12-7Z' fill='#ff855f' />
      <path d='m96 43 10-6v15l-10 6Z' fill='#61d59d' />
      <path
        d='m64 12 46 25-46 26-46-26Z'
        fill='none'
        stroke='rgb(255 255 255 / 40%)'
        strokeWidth='1'
      />
    </svg>
  )
}

export function LifeIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        <linearGradient id='games-life-board' x1='0' y1='0' x2='1' y2='1'>
          <stop stopColor='#1b3158' />
          <stop offset='1' stopColor='#07101f' />
        </linearGradient>
        <linearGradient id='games-life-cell' x1='0' y1='0' x2='0' y2='1'>
          <stop stopColor='#c8fff3' />
          <stop offset='1' stopColor='#55cfe1' />
        </linearGradient>
      </defs>
      <ellipse cx='64' cy='108' rx='44' ry='8' fill='rgb(4 12 22 / 24%)' />
      <path
        d='m64 13 49 28-49 74-49-28Z'
        fill='url(#games-life-board)'
        stroke='#8edbea'
        strokeWidth='2'
        strokeLinejoin='round'
      />
      <g fill='none' stroke='rgb(126 212 228 / 34%)' strokeWidth='1.5'>
        <path d='m27 80 49-59M40 88l49-59M52 96l49-59M27 63l49 28M39 48l49 28M52 33l49 28' />
      </g>
      <g fill='url(#games-life-cell)' stroke='#e4fffb' strokeWidth='1'>
        <path d='m51 39 12 7-12 14-12-7Z' />
        <path d='m64 46 12 7-12 14-12-7Z' />
        <path d='m76 54 12 7-12 14-12-7Z' />
        <path d='m52 68 12 7-12 14-12-7Z' />
        <path d='m64 75 12 7-12 14-12-7Z' />
      </g>
      <g fill='#74f1bc'>
        <circle cx='87' cy='39' r='3' />
        <circle cx='95' cy='55' r='2' />
        <circle cx='31' cy='78' r='2.5' />
      </g>
    </svg>
  )
}
