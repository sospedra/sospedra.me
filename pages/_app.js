import React from 'react'
import App, { Container } from 'next/app'
import Router from 'next/router'
import NoSSR from 'react-no-ssr'

import { pageview } from '../service/analytics'
import { TransitionProvider } from '../service/transition'
import { CameraProvider } from '../service/camera'
import Loading from '../components/Loading'

export default class SospedrameApp extends App {
  static async getInitialProps ({ Component, ctx }) {
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
        <CameraProvider>
          <TransitionProvider>
            <NoSSR onSSR={<Loading />}>
              <Component {...pageProps} key={router.route} />
            </NoSSR>
          </TransitionProvider>
        </CameraProvider>

        <style jsx global>{`
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
