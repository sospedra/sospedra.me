import { range } from 'es-toolkit'
import type React from 'react'
import { createFrameRoute, frameMax } from './service'

const Preload: React.FC = () => {
  return (
    <>
      {range(1, frameMax + 1).map((frame) => (
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
