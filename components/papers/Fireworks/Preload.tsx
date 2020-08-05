import React from 'react'
import Head from 'next/head'
import { createFrameRoute, frameMax } from './service'

const Preload: React.FC<{}> = React.memo(() => {
  return (
    <Head>
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
    </Head>
  )
})

export default Preload
