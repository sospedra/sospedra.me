import css from './games.module.css'

export function CimsIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        <linearGradient id='games-cims-shell' x1='.15' y1='0' x2='.85' y2='1'>
          <stop stopColor='#8fa3b4' />
          <stop offset='.42' stopColor='#4c5f72' />
          <stop offset='1' stopColor='#1d2833' />
        </linearGradient>
        <radialGradient id='games-cims-glass' cx='.42' cy='.3' r='.85'>
          <stop stopColor='#1c5a45' />
          <stop offset='.6' stopColor='#0a2b22' />
          <stop offset='1' stopColor='#03110f' />
        </radialGradient>
        <linearGradient id='games-cims-ridge' x1='0' y1='0' x2='0' y2='1'>
          <stop stopColor='#c8ffb0' />
          <stop offset='.5' stopColor='#4fe08a' />
          <stop offset='1' stopColor='#126e5c' />
        </linearGradient>
      </defs>
      <ellipse cx='64' cy='108' rx='41' ry='9' fill='rgb(4 12 22 / 26%)' />
      <rect
        x='14'
        y='24'
        width='100'
        height='70'
        rx='11'
        fill='url(#games-cims-shell)'
        stroke='#cfe2f2'
        strokeWidth='2'
      />
      <rect
        x='24'
        y='33'
        width='80'
        height='46'
        rx='7'
        fill='url(#games-cims-glass)'
        stroke='#0d1a20'
        strokeWidth='2'
      />
      <path
        d='M27 74l14-19 9 11 12-24 13 20 9-9 15 21Z'
        fill='url(#games-cims-ridge)'
      />
      <path
        d='M27 74l14-19 9 11 12-24 13 20 9-9 15 21'
        fill='none'
        stroke='#e6ffd8'
        strokeWidth='2'
        strokeLinejoin='round'
      />
      <g fill='none' stroke='rgb(146 255 196 / 42%)' strokeWidth='1.5'>
        <path d='M27 64c18 6 60 6 76-2M27 70c20 6 58 6 76-1' />
      </g>
      <circle cx='90' cy='43' r='6' fill='#ffd782' />
      <rect
        x='24'
        y='33'
        width='80'
        height='9'
        rx='4'
        fill='rgb(233 255 246 / 14%)'
      />
      <g>
        <circle
          cx='36'
          cy='87'
          r='5'
          fill='#25323d'
          stroke='#9fb6c8'
          strokeWidth='2'
        />
        <circle cx='36' cy='87' r='1.6' fill='#dff0ff' />
        <circle
          cx='92'
          cy='87'
          r='4'
          fill='#4fe08a'
          stroke='#0f2a24'
          strokeWidth='1.5'
        />
      </g>
      <rect
        x='50'
        y='84'
        width='28'
        height='6'
        rx='3'
        fill='#26333f'
        stroke='#93aabd'
        strokeWidth='1.5'
      />
    </svg>
  )
}

export function CameraIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        <linearGradient id='games-camera-body' x1='.1' y1='0' x2='.9' y2='1'>
          <stop stopColor='#f6f1e2' />
          <stop offset='.55' stopColor='#cdc4b1' />
          <stop offset='1' stopColor='#6f6a5f' />
        </linearGradient>
        <linearGradient id='games-camera-top' x1='0' y1='0' x2='0' y2='1'>
          <stop stopColor='#4b5563' />
          <stop offset='1' stopColor='#1f262f' />
        </linearGradient>
        <radialGradient id='games-camera-glass' cx='.36' cy='.3' r='.8'>
          <stop stopColor='#d8fbff' />
          <stop offset='.45' stopColor='#39a7c4' />
          <stop offset='1' stopColor='#10283a' />
        </radialGradient>
      </defs>
      <ellipse cx='64' cy='109' rx='40' ry='8' fill='rgb(4 12 22 / 26%)' />
      <rect
        x='30'
        y='90'
        width='62'
        height='16'
        rx='2'
        fill='#f7f8fb'
        stroke='#b8c0cc'
        strokeWidth='2'
      />
      <rect x='36' y='94' width='50' height='9' rx='1' fill='#2b3b52' />
      <rect
        x='20'
        y='36'
        width='88'
        height='58'
        rx='9'
        fill='url(#games-camera-body)'
        stroke='#fffaf0'
        strokeWidth='2'
      />
      <path
        d='M29 36h70a9 9 0 0 1 9 9v9H20v-9a9 9 0 0 1 9-9Z'
        fill='url(#games-camera-top)'
      />
      <rect
        x='26'
        y='24'
        width='26'
        height='14'
        rx='4'
        fill='#2b333d'
        stroke='#8f9aa8'
        strokeWidth='2'
      />
      <rect x='31' y='28' width='16' height='6' rx='2' fill='#9fd8e8' />
      <circle
        cx='94'
        cy='45'
        r='5.5'
        fill='#ff5f6d'
        stroke='#ffd9dd'
        strokeWidth='2'
      />
      <circle
        cx='64'
        cy='68'
        r='24'
        fill='#20262e'
        stroke='#b9c3d0'
        strokeWidth='2'
      />
      <circle
        cx='64'
        cy='68'
        r='16'
        fill='url(#games-camera-glass)'
        stroke='#0e1a26'
        strokeWidth='2'
      />
      <circle cx='57' cy='61' r='4.5' fill='rgb(255 255 255 / 76%)' />
      <g>
        <rect x='26' y='62' width='7' height='7' fill='#ff7a3d' />
        <rect x='26' y='69' width='7' height='7' fill='#ffd23d' />
        <rect x='26' y='76' width='7' height='7' fill='#4fd08a' />
        <rect x='26' y='83' width='7' height='7' fill='#5aa9ff' />
      </g>
      <rect
        x='90'
        y='74'
        width='14'
        height='10'
        rx='2'
        fill='#39424e'
        stroke='#a4b0be'
        strokeWidth='1.5'
      />
    </svg>
  )
}
