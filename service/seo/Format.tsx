import React from 'react'

const Format: React.FC<{}> = () => {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `<!-- ah, I see you're a man of culture as well. -->`,
        }}
      />

      <meta charSet='utf-8' />
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <meta name='msapplication-tap-highlight' content='no' />
      <link rel='manifest' href='/manifest.webmanifest' />
      <link
        rel='alternate'
        type='application/rss+xml'
        title='Rubén Sospedra Papers'
        href='http://sospedra.me/rss.xml'
      />
    </>
  )
}

export default Format
