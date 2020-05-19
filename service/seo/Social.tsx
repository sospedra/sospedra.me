import React from 'react'

const URL = 'https://sospedra.me'
const IMAGE = '/sospedra.png'

const Social: React.FC<{}> = () => {
  return (
    <>
      <meta name='author' content='Rubén Sospedra' />

      <meta property='og:image' content={IMAGE} />
      <meta property='og:profile:firstName' content='Rubén' />
      <meta property='og:profile:lastName' content='Sospedra' />
      <meta property='og:profile:username' content='sospedra' />
      <meta property='og:type' content='website' />
      <meta property='og:url' content={URL} />

      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:creator' content='@sospedra_r' />
      <meta name='twitter:url' content={URL} />
      <meta name='twitter:site' content='@sospedra_r' />

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: `{
            "@context": "http://schema.org",
            "@type": "Person",
            "email": "mailto:hello@sospedra.me",
            "image": "profile.jpg",
            "jobTitle": "Software engineer",
            "name": "Rubén Sospedra",
            "url": "https://www.sospedra.me"
          }
          `,
        }}
      />
    </>
  )
}

export default Social
