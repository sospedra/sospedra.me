import Document, {
  Html,
  Head,
  Main,
  NextScript,
  DocumentContext,
} from 'next/document'
import { GA_TRACKING_ID } from 'service/analytics'

export default class SospedrameDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx)
    return { ...initialProps }
  }

  render() {
    return (
      <Html>
        <Head>
          <meta charSet='UTF-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <link rel='icon' sizes='192x192' href='/touch-icon.png' />
          <link rel='apple-touch-icon' href='/touch-icon.png' />
          <link rel='mask-icon' href='/favicon-mask.svg' color='#49B882' />
          <link rel='icon' href='/favicon.ico' />
          <meta property='og:url' content='https://sospedra.me' />
          <meta property='og:title' content='Rubén Sospedra' />
          <meta
            property='og:description'
            content='Rubén Sospedra ) javascript hacker'
          />
          <meta name='twitter:site' content='https://sospedra.me' />
          <meta name='twitter:card' content='summary_large_image' />
          <meta name='twitter:image' content='/og.png' />
          <meta property='og:image' content='/og.png' />
          <meta property='og:image:width' content='1200' />
          <meta property='og:image:height' content='630' />
          <meta
            name='description'
            content='Rubén Sospedra ) javascript hacker'
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
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_TRACKING_ID}');
              `,
            }}
          />
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
