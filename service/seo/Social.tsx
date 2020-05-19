import React from 'react'

const TITLE = 'Rubén Sospedra'
const DESCRIPTION = 'Rubén Sospedra ▼ javascript hacker'
const URL = 'https://sospedra.me'
const IMAGE = '/sospedra.png'

const Social: React.FC<{}> = () => {
  return (
    <>
      <title>{TITLE}</title>
      <meta name='description' content={DESCRIPTION} />
      <meta name='image' content={IMAGE} />
      <meta name='author' content='Rubén Sospedra' />

      <meta property='og:description' content={DESCRIPTION} />
      <meta property='og:image' content={IMAGE} />
      <meta property='og:profile:firstName' content='Rubén' />
      <meta property='og:profile:lastName' content='Sospedra' />
      <meta property='og:profile:username' content='sospedra' />
      <meta property='og:title' content={TITLE} />
      <meta property='og:type' content='website' />
      <meta property='og:url' content={URL} />

      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:creator' content='@sospedra_r' />
      <meta name='twitter:description' content={DESCRIPTION} />
      <meta name='twitter:image' content={IMAGE} />
      <meta name='twitter:url' content={URL} />
      <meta name='twitter:site' content='@sospedra_r' />
      <meta name='twitter:title' content={TITLE} />
    </>
  )
}

export default Social
