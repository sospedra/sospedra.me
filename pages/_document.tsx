import Document, { Html, Head, Main, NextScript } from 'next/document'
import Format from 'service/seo/Format'
import Icons from 'service/seo/Icons'
import Preload from 'service/seo/Preload'
import Social from 'service/seo/Social'

export default class SospedraDocument extends Document {
  render() {
    return (
      <Html lang='en'>
        <Head>
          <Format />
          <Preload />
          <Icons />
          <Social />
        </Head>

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
