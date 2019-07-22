import React from 'react'
import App, { Container } from 'next/app'
import Router from 'next/router'
import NoSSR from 'react-no-ssr'

import { pageview } from '../service/analytics'
import { TransitionProvider } from '../service/transition'
import Loading from '../components/Loading'

export default class SospedrameApp extends App {
  static async getInitialProps ({ Component, ctx }) {
    let pageProps = {}

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx)
    }

    return { pageProps }
  }

  anchorAtBottom = React.createRef(null)
  
  componentDidMount () {
    Router.events.on('routeChangeComplete', pageview)
    setTimeout(() => {
      this.anchorAtBottom.current.scrollIntoView({ behavior: "auto" })
    }, 1000)
  }

  render () {
    const { Component, pageProps, router } = this.props

    return (
      <Container onLoad={() => console.log('load')}>
        <div className="canvas">
          <TransitionProvider>
            <NoSSR onSSR={<Loading />}>
              <Component {...pageProps} key={router.route} ref={this.anchorAtBottom} />
            </NoSSR>
          </TransitionProvider>
        </div>

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

          .canvas {
            background: linear-gradient(to bottom, #430840 0%,#690b63 50%);
            font-family: "Open Sans", "lucida grande", "Segoe UI", arial, verdana, "lucida sans unicode", tahoma, sans-serif;
            margin: 0;
            padding: 0;
            width: 200vw;
            height: 200vh;
          }
        `}</style>
      </Container>
    )
  }
}
