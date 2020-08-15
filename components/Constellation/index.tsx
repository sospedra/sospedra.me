import React, { useRef } from 'react'
import constellations from './constellations.json'

const createConstellationIterator = function* () {
  let iterator = 0
  const names = Object.keys(constellations)

  while (true) {
    iterator = iterator === 0 ? names.length - 1 : iterator - 1
    yield names[iterator] as keyof typeof constellations
  }
}

export const useConstellation = () => {
  const iterator = useRef(createConstellationIterator())
  return function next() {
    return iterator.current.next().value
  }
}

const Constellation: React.FC<{
  name: keyof typeof constellations
}> = (props) => {
  const constellation = constellations[props.name].map(([x, y, r]) => [
    x * 5,
    y * 5,
    r,
  ])
  return (
    <div className='absolute w-full pointer-events-none' style={{ zIndex: -1 }}>
      <svg
        aria-labelledby='title desc'
        role='img'
        xmlns='http://www.w3.org/2000/svg'
        width='120%'
        version='1'
        viewBox='0 0 500 500'
        pointerEvents='none'
      >
        <title id='title'>{props.name} constellation</title>
        <desc id='desc'>
          A set of twinkling stars representing the constellation of{' '}
          {props.name}.
        </desc>
        <filter id='blur'>
          <feGaussianBlur stdDeviation='1' />
        </filter>

        {constellation.map(([x, y, r]) => (
          <circle
            key={`${x}:${y}:${r}`}
            cx={x}
            cy={y}
            r={r}
            fill='white'
            filter='url(#blur)'
            shapeRendering='optimizeSpeed'
            vectorEffect='fixed-position'
          >
            <animate
              attributeName='opacity'
              values={y % 2 ? '0.5;0.9;0.5' : '0.3;0.7;0.3'}
              dur={x % 2 ? '3s' : '5s'}
              repeatCount='indefinite'
            />
          </circle>
        ))}
      </svg>
    </div>
  )
}

export default Constellation
