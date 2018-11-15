import Document, { Head, Main, NextScript } from 'next/document'

export default class MyDocument extends Document {
  static getInitialProps ({ renderPage }) {
    return renderPage()
  }

  render () {
    return (
      <html>
        <Head>
          <meta charSet='UTF-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <link rel='icon' sizes='192x192' href='/static/touch-icon.png' />
          <link rel='apple-touch-icon' href='/static/touch-icon.png' />
          <link rel='mask-icon' href='/static/favicon-mask.svg' color='#49B882' />
          <link rel='icon' href='/static/favicon.ico' />
          <meta property='og:url' content='https://sospedra.me' />
          <meta property='og:title' content='Rubén Sospedra' />
          <meta
            property='og:description'
            content='Rubén Sospedra ) javascript hacker'
          />
          <meta name='twitter:site' content='https://sospedra.me' />
          <meta name='twitter:card' content='summary_large_image' />
          <meta name='twitter:image' content='static/og.png' />
          <meta property='og:image' content='static/og.png' />
          <meta property='og:image:width' content='1200' />
          <meta property='og:image:height' content='630' />
          <meta
            name='description'
            content='Rubén Sospedra ) javascript hacker'
          />
          <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.0/normalize.min.css' />
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </html>
    )
  }
}
