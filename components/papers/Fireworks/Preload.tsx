import React from 'react'
import { createFrameRoute, frameMax } from './service'

const Preload: React.FC = React.memo(function Preload() {
  return (
    <>
      {Array(frameMax)
        .fill(0)
        .map((_, index) => (
          <link
            key={index}
            rel='preload'
            as='image'
            type='image/jpeg'
            href={createFrameRoute(index + 1)}
          />
        ))}
    </>
  )
})

export default Preload
