import App from 'next/app'
import 'service/style/global.css'
import Providers from 'app/providers'

class SospedraApp extends App {
  render() {
    const { Component, pageProps } = this.props

    return (
      <Providers>
        <Component {...pageProps} />
      </Providers>
    )
  }
}

export default SospedraApp
