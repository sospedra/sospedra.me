import React from 'react'
import Head from 'next/head'

const Preload: React.FC<{ max: number }> = React.memo((props) => {
  return (
    <Head>
      {Array(props.max)
        .fill(0)
        .map((_, index) => (
          <link
            key={index}
            rel='preload'
            as='image'
            type='image/webp'
            href={`/papers/fireworks/${(index + 1)
              .toString()
              .padStart(3, '0')}.webp`}
          />
        ))}
    </Head>
  )
})

export default Preload
