const INKS = [
  { id: 'ink-blue', color: '#0078bf' },
  { id: 'ink-pink', color: '#ff48b0' },
  { id: 'ink-red', color: '#f15060' },
  { id: 'ink-teal', color: '#00838a' },
] as const

const SMEARS = [
  { id: 'smear-a', scale: 26, frequency: '0.004 0.09' },
  { id: 'smear-b', scale: 60, frequency: '0.003 0.07' },
  { id: 'smear-c', scale: 110, frequency: '0.002 0.05' },
] as const

// alpha = 1 - luminance, so paper drops out and strokes become ink;
// the gamma pass crushes paper haze without eating fine hatching
const InkFilters = () => (
  <svg className='sr-only' aria-hidden='true' focusable='false'>
    <defs>
      {INKS.map((ink) => (
        <filter
          key={ink.id}
          id={ink.id}
          x='0%'
          y='0%'
          width='100%'
          height='100%'
          colorInterpolationFilters='sRGB'
        >
          <feColorMatrix
            type='matrix'
            values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.36 -0.44 -0.2 0 1'
            result='inverted'
          />
          <feComposite
            in='inverted'
            in2='SourceAlpha'
            operator='arithmetic'
            k1='1'
            k2='0'
            k3='0'
            k4='0'
          />
          <feComponentTransfer result='cut'>
            <feFuncA type='gamma' amplitude='1.08' exponent='1.7' offset='0' />
          </feComponentTransfer>
          <feFlood floodColor={ink.color} />
          <feComposite in2='cut' operator='in' />
        </filter>
      ))}
      {SMEARS.map((smear) => (
        <filter key={smear.id} id={smear.id} colorInterpolationFilters='sRGB'>
          <feTurbulence
            type='fractalNoise'
            baseFrequency={smear.frequency}
            numOctaves='2'
            seed='7'
          />
          <feDisplacementMap
            in='SourceGraphic'
            scale={smear.scale}
            xChannelSelector='R'
            yChannelSelector='G'
          />
        </filter>
      ))}
    </defs>
  </svg>
)

export default InkFilters
