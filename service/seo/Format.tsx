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
      <link rel='manifest' href='/manifest.webmanifest' />
    </>
  )
}

export default Format
