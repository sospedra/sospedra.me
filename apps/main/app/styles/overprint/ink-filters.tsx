const SMEARS = [
  { id: 'smear-a', scale: 26, frequency: '0.004 0.09' },
  { id: 'smear-b', scale: 60, frequency: '0.003 0.07' },
  { id: 'smear-c', scale: 110, frequency: '0.002 0.05' },
] as const

// ink separations are baked into webp assets (tmp/ink.mts); only the
// scan-drag displacement stays live, one pass per column
const SmearFilters = () => (
  <svg className='sr-only' aria-hidden='true' focusable='false'>
    <defs>
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

export default SmearFilters
