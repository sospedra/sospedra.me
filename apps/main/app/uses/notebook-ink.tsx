import cn from 'clsx'
import fx from './fx-quiet.module.css'
import css from './notebook-ink.module.css'

export function NotebookDishEffect() {
  return (
    <>
      <svg
        className={cn(css.notebookFlourish, fx.notebookFlourish)}
        viewBox='0 0 256 256'
        aria-hidden='true'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d='M243.07324,157.43945c-1.2334-1.47949-23.18847-27.34619-60.46972-41.05859-1.67579-17.97412-8.25293-34.36328-18.93653-46.87158C149.41309,52.8208,128.78027,44,104,44,54.51074,44,22.10059,88.57715,20.74512,90.4751a3.99987,3.99987,0,0,0,6.50781,4.65234C27.5625,94.6958,58.68359,52,104,52c22.36816,0,40.89648,7.85107,53.584,22.70508,8.915,10.437,14.65625,23.9541,16.65528,38.894A133.54185,133.54185,0,0,0,136,108c-25.10742,0-46.09473,6.48486-60.69434,18.75391-12.65234,10.63379-19.91015,25.39355-19.91015,40.49463a43.61545,43.61545,0,0,0,12.69336,31.21923C76.98438,207.3208,89.40234,212,104,212c23.98047,0,44.37305-9.4668,58.97461-27.37744,12.74512-15.6333,20.05566-37.145,20.05566-59.01953,0-.1128-.001-.22559-.001-.33838,33.62988,13.48486,53.62207,36.96631,53.89746,37.2959a4.00015,4.00015,0,0,0,6.14648-5.1211ZM104,204c-27.89746,0-40.60449-19.05078-40.60449-36.75146C63.39551,142.56592,86.11621,116,136,116a124.37834,124.37834,0,0,1,38.97266,6.32617q.05712,1.63038.05761,3.27686C175.03027,177.07129,139.29785,204,104,204Z' />
      </svg>
      <svg
        className={cn(css.notebookHighlight, fx.notebookHighlight)}
        viewBox='0 0 144.75738 77.18431'
        preserveAspectRatio='none'
        aria-hidden='true'
        xmlns='http://www.w3.org/2000/svg'
      >
        <g transform='translate(-171.52826,-126.11624)'>
          <path d='M180.02826,169.45123c0,0 12.65228,-25.55115 24.2441,-25.66863c6.39271,-0.06479 -5.89143,46.12943 4.90937,50.63857c10.22345,4.2681 24.14292,-52.38336 37.86455,-59.80493c3.31715,-1.79413 -5.35094,45.88889 -0.78872,58.34589c5.19371,14.18125 33.36934,-58.38221 36.43049,-56.91633c4.67078,2.23667 -0.06338,44.42744 5.22574,47.53647c6.04041,3.55065 19.87185,-20.77286 19.87185,-20.77286' />
        </g>
      </svg>
    </>
  )
}

type NoiseFilterSpec = {
  id: string
  overscan: number
  scale: number
  seed?: number
}

const NOISE_FILTERS: NoiseFilterSpec[] = [
  { id: 'usesNotebookNoise', overscan: 20, scale: 3 },
  { id: 'usesNotebookNoiseAlt', overscan: 20, scale: 3, seed: 1010 },
  { id: 'usesNotebookNoisePress', overscan: 30, scale: 6 },
  { id: 'usesNotebookNoisePressAlt', overscan: 30, scale: 6, seed: 1010 },
]

function NoiseFilter({ id, overscan, scale, seed }: NoiseFilterSpec) {
  const span = `${100 + overscan * 2}%`
  return (
    <filter
      id={id}
      x={`-${overscan}%`}
      y={`-${overscan}%`}
      width={span}
      height={span}
    >
      <feTurbulence
        result='noise'
        numOctaves='8'
        baseFrequency='0.1'
        seed={seed}
        type='fractalNoise'
      />
      <feDisplacementMap
        in='SourceGraphic'
        in2='noise'
        scale={scale}
        xChannelSelector='R'
        yChannelSelector='G'
      />
    </filter>
  )
}

export function NotebookFilters() {
  return (
    <svg
      className={css.notebookFilters}
      width='0'
      height='0'
      aria-hidden='true'
      focusable='false'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        {NOISE_FILTERS.map((spec) => (
          <NoiseFilter key={spec.id} {...spec} />
        ))}
      </defs>
    </svg>
  )
}
