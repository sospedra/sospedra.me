import cn from 'clsx'
import fx from './fx-quiet.module.css'
import css from './neon-marquee.module.css'

export function NeonRamen() {
  return (
    <div className={css.marquee} aria-hidden='true'>
      <div className={cn(css.steam, fx.steam)}>
        <i />
        <i />
        <i />
      </div>
      <i className={cn(css.cable, css.cableA)} />
      <i className={cn(css.cable, css.cableB)} />
      <i className={cn(css.cable, css.cableC)} />
      <div className={css.neonFrame}>
        <svg
          className={cn(css.neonSign, fx.neonSign)}
          viewBox='0 0 460 152'
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path d='M22 34 Q58 26 94 32' />
          <path d='M20 62 Q60 54 96 60 Q90 104 46 128' />
          <g className={cn(css.neonLoose, fx.neonLoose)}>
            <path d='M124 88 Q170 80 214 86' />
            <path className={css.neonCore} d='M124 88 Q170 80 214 86' />
          </g>
          <path d='M262 30 Q272 78 226 126' />
          <path d='M232 62 Q272 90 306 122' />
          <path d='M332 44 Q344 48 352 58' />
          <path d='M330 122 Q378 114 408 50' />
          <path className={css.neonDrip} d='M46 128 l6 9 l-9 4 l7 10' />
          <path className={css.neonDrip} d='M306 122 l7 8 l-9 3 l7 10' />
          <path className={css.neonCore} d='M22 34 Q58 26 94 32' />
          <path
            className={css.neonCore}
            d='M20 62 Q60 54 96 60 Q90 104 46 128'
          />
          <path className={css.neonCore} d='M262 30 Q272 78 226 126' />
          <path className={css.neonCore} d='M232 62 Q272 90 306 122' />
          <path className={css.neonCore} d='M332 44 Q344 48 352 58' />
          <path className={css.neonCore} d='M330 122 Q378 114 408 50' />
        </svg>
        <svg
          className={cn(css.neonAccent, fx.neonAccent)}
          viewBox='0 0 140 12'
          aria-hidden='true'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path d='M5 8 Q70 2 135 6' />
        </svg>
      </div>
    </div>
  )
}
