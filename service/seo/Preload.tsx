import React from 'react'

const Preload: React.FC<{}> = () => {
  return (
    <>
      <link
        rel='preconnect dns-prefetch'
        href='https://www.google-analytics.com'
      />

      <link
        rel='preload'
        as='font'
        href='/fonts/wotfard.woff2'
        type='font/woff2'
        crossOrigin='anonymous'
      />
      <link
        rel='preload'
        as='font'
        href='/fonts/vcr.woff2'
        type='font/woff2'
        crossOrigin='anonymous'
      />
      <link
        rel='preload'
        as='font'
        href='/fonts/inconsolata.woff2'
        type='font/woff2'
        crossOrigin='anonymous'
      />
      <link
        rel='preload'
        as='font'
        href='/fonts/lazer84.woff2'
        type='font/woff2'
        crossOrigin='anonymous'
      />
    </>
  )
}

export default Preload
