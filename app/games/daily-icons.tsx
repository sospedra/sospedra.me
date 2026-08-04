import css from './games.module.css'

export function MeridianIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        <radialGradient id='games-geo-ocean' cx='.34' cy='.25' r='.78'>
          <stop stopColor='#b9edff' />
          <stop offset='.34' stopColor='#4ba8df' />
          <stop offset='.78' stopColor='#2355a3' />
          <stop offset='1' stopColor='#15284d' />
        </radialGradient>
        <linearGradient id='games-geo-land' x1='.1' y1='0' x2='.9' y2='1'>
          <stop stopColor='#d7f59c' />
          <stop offset='.55' stopColor='#65c783' />
          <stop offset='1' stopColor='#21776c' />
        </linearGradient>
      </defs>
      <ellipse cx='64' cy='107' rx='42' ry='9' fill='rgb(4 12 22 / 25%)' />
      <ellipse
        cx='64'
        cy='63'
        rx='55'
        ry='21'
        fill='none'
        stroke='rgb(172 224 255 / 58%)'
        strokeWidth='3'
        transform='rotate(-17 64 63)'
      />
      <circle
        cx='64'
        cy='61'
        r='39'
        fill='url(#games-geo-ocean)'
        stroke='#c8edff'
        strokeWidth='2'
      />
      <g fill='url(#games-geo-land)' stroke='#d9f6b4' strokeWidth='1'>
        <path d='m36 38 13-8 11 5 2 9-8 5-4 13-10-2-7-11Z' />
        <path d='m74 28 15 6 8 12-9 5-2 10-12 2-7-8 5-8-6-9Z' />
        <path d='m71 71 12-7 13 7-3 9-8 4-4 12-9-4-5-11Z' />
        <path d='m38 73 12-5 9 7-4 8-14 4-8-6Z' />
      </g>
      <g fill='none' stroke='rgb(222 244 255 / 38%)' strokeWidth='1.5'>
        <ellipse cx='64' cy='61' rx='17' ry='39' />
        <path d='M28 51c20 8 52 8 72 0M27 70c22 9 53 9 74 0' />
      </g>
      <path
        d='m102 30 8-18 8 18-8 15Z'
        fill='#ff7b92'
        stroke='#ffe0e7'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
      <circle cx='110' cy='29' r='2.5' fill='#fff2f5' />
      <path
        d='M64 11v10M64 101v10M14 61h10M104 61h10'
        stroke='#d8f0ff'
        strokeWidth='2'
        strokeLinecap='round'
      />
    </svg>
  )
}

export function CrosswordsIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        <linearGradient
          id='games-crossword-paper'
          x1='.1'
          y1='0'
          x2='.9'
          y2='1'
        >
          <stop stopColor='#fffef4' />
          <stop offset='1' stopColor='#c7d1dd' />
        </linearGradient>
        <linearGradient id='games-crossword-pencil' x1='0' y1='0' x2='1' y2='0'>
          <stop stopColor='#f2d15e' />
          <stop offset='.7' stopColor='#e58a56' />
          <stop offset='1' stopColor='#ec6f8b' />
        </linearGradient>
      </defs>
      <ellipse cx='63' cy='108' rx='43' ry='8' fill='rgb(4 12 22 / 24%)' />
      <path
        d='M27 19h71l10 13v76H27Z'
        fill='url(#games-crossword-paper)'
        stroke='#34415b'
        strokeWidth='3'
        strokeLinejoin='round'
      />
      <path d='M98 19v15h10' fill='#aebbc9' stroke='#34415b' strokeWidth='2' />
      <g stroke='#34415b' strokeWidth='2'>
        <path d='M39 38h54v54H39Z' fill='white' />
        <path d='M57 38v54M75 38v54M39 56h54M39 74h54' />
      </g>
      <g fill='#26344c'>
        <path d='M40 39h16v16H40ZM76 39h16v16H76ZM58 57h16v16H58ZM40 75h16v16H40ZM76 75h16v16H76Z' />
      </g>
      <g fill='#52627b' fontFamily='var(--font-code)' fontSize='5'>
        <text x='59' y='44'>
          1
        </text>
        <text x='41' y='62'>
          2
        </text>
        <text x='77' y='62'>
          3
        </text>
      </g>
      <path
        d='m18 93 76-36 5 10-76 37-9 1Z'
        fill='url(#games-crossword-pencil)'
        stroke='#4d4150'
        strokeWidth='2'
        strokeLinejoin='round'
      />
      <path d='m14 105 4-12 5 11Z' fill='#e7d4b7' stroke='#4d4150' />
    </svg>
  )
}

export function BoomboxIcon() {
  return (
    <svg
      className={css.iconGraphic}
      viewBox='0 0 128 128'
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        <linearGradient id='games-boombox-body' x1='0' y1='0' x2='0' y2='1'>
          <stop stopColor='#b7c4e2' />
          <stop offset='.5' stopColor='#55628c' />
          <stop offset='1' stopColor='#262e4d' />
        </linearGradient>
        <radialGradient id='games-boombox-cone' cx='.38' cy='.32' r='.75'>
          <stop stopColor='#4a5878' />
          <stop offset='.7' stopColor='#10182b' />
          <stop offset='1' stopColor='#060b16' />
        </radialGradient>
        <linearGradient id='games-boombox-tape' x1='0' y1='0' x2='0' y2='1'>
          <stop stopColor='#ffd97a' />
          <stop offset='1' stopColor='#e8933f' />
        </linearGradient>
      </defs>
      <ellipse cx='64' cy='107' rx='44' ry='9' fill='rgb(4 12 22 / 25%)' />
      <path
        d='M104 45 119 14'
        stroke='#c9d6ee'
        strokeWidth='3'
        strokeLinecap='round'
      />
      <circle cx='119' cy='13' r='3' fill='#ff7b92' stroke='#ffe0e7' />
      <path
        d='M44 43v-6c0-10 40-10 40 0v6'
        fill='none'
        stroke='#c9d6ee'
        strokeWidth='5'
        strokeLinecap='round'
      />
      <rect
        x='14'
        y='42'
        width='100'
        height='58'
        rx='8'
        fill='url(#games-boombox-body)'
        stroke='#1c2438'
        strokeWidth='3'
      />
      <path
        d='M20 47h88'
        stroke='rgb(255 255 255 / 30%)'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <circle
        cx='34'
        cy='71'
        r='16'
        fill='url(#games-boombox-cone)'
        stroke='#d5e0f4'
        strokeWidth='2.5'
      />
      <circle
        cx='34'
        cy='71'
        r='9'
        fill='none'
        stroke='rgb(255 255 255 / 20%)'
        strokeWidth='1.5'
      />
      <circle cx='34' cy='71' r='4' fill='#38445f' stroke='#8ea0c4' />
      <circle
        cx='94'
        cy='71'
        r='16'
        fill='url(#games-boombox-cone)'
        stroke='#d5e0f4'
        strokeWidth='2.5'
      />
      <circle
        cx='94'
        cy='71'
        r='9'
        fill='none'
        stroke='rgb(255 255 255 / 20%)'
        strokeWidth='1.5'
      />
      <circle cx='94' cy='71' r='4' fill='#38445f' stroke='#8ea0c4' />
      <rect
        x='53'
        y='55'
        width='22'
        height='16'
        rx='2.5'
        fill='url(#games-boombox-tape)'
        stroke='#1c2438'
        strokeWidth='2.5'
      />
      <circle cx='59.5' cy='63' r='3' fill='#2c1f0d' stroke='#ffe9b0' />
      <circle cx='68.5' cy='63' r='3' fill='#2c1f0d' stroke='#ffe9b0' />
      <path d='M59.5 68h9' stroke='#6b4a17' strokeWidth='1.5' />
      <g stroke='#1c2438'>
        <rect x='53' y='78' width='4.2' height='6' fill='#ea718d' />
        <rect x='58.9' y='78' width='4.2' height='6' fill='#f4d34f' />
        <rect x='64.8' y='78' width='4.2' height='6' fill='#61d59d' />
        <rect x='70.7' y='78' width='4.2' height='6' fill='#8275df' />
      </g>
      <path
        d='M55 90h18'
        stroke='rgb(13 20 38 / 60%)'
        strokeWidth='3'
        strokeLinecap='round'
      />
    </svg>
  )
}
