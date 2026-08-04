import { range } from 'es-toolkit'
import type React from 'react'
import { createFrameRoute } from './scroll-frames'

// first paint needs only the opening frames; the rest stream on scroll
const PRELOADED_FRAMES = 12

const Preload: React.FC = () => {
  return (
    <>
      {range(1, PRELOADED_FRAMES + 1).map((frame) => (
        <link
          key={createFrameRoute(frame)}
          rel='preload'
          as='image'
          type='image/jpeg'
          href={createFrameRoute(frame)}
        />
      ))}
    </>
  )
}

export default Preload
