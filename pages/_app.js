import React from 'react'
import App, { Container } from 'next/app'
import Router from 'next/router'

import { pageview } from '../service/analytics'
import { Provider as TransitionProvider } from '../components/Transition'

export default class SospedrameApp extends App {
  static async getInitialProps ({ Component, router, ctx }) {
    let pageProps = {}

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx)
    }

    return { pageProps }
  }

  componentDidMount () {
    Router.events.on('routeChangeComplete', pageview)
  }

  render () {
    const { Component, pageProps, router } = this.props

    return (
      <Container>
        <TransitionProvider>
          <Component {...pageProps} key={router.route} />
        </TransitionProvider>

        <style jsx global>{`
          html, body, #__next {
            height: 100%;
          }

          html, body {
            background: linear-gradient(to bottom, #430840 0%,#690b63 50%);
            font-family: "Open Sans", "lucida grande", "Segoe UI", arial, verdana, "lucida sans unicode", tahoma, sans-serif;
            margin: 0;
            overflow: hidden;
            padding: 0;
            position: fixed;
            width: 100%;
          }

          @font-face {
            font-family: "lazer84";
            src:
              url("/static/fonts/lazer84.woff") format("woff"), /* chrome, firefox */
              url("/static/fonts/lazer84.ttf") format("truetype"), /* chrome, firefox, opera, Safari, Android, iOS 4.2+ */
              url("/static/fonts/lazer84.svg#lazer84") format("svg"); /* iOS 4.1- */
            font-style: normal;
            font-weight: normal;
          }
        `}</style>
      </Container>
    )
  }
}
