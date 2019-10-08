import React from 'react'
import App, { Container } from 'next/app'
import 'highlight.js/styles/github.css'
import { Provider as TransitionProvider } from '../service/transition'
import Layout from '../components/Layout'
import Background from '../components/Background'

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props

    return (
      <>
        <TransitionProvider>
          <Container>
            <Layout>
              <Component {...pageProps} />
            </Layout>
            <Background />
          </Container>
        </TransitionProvider>

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
      </>
    )
  }
}

export default MyApp