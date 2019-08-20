import React from 'react'
import App, { Container } from 'next/app'
import { Provider as TransitionProvider } from '../service/transition'
import Layout from '../components/Layout'
import Background from '../components/Background'

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props

    return (
      <TransitionProvider>
        <Container>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <Background />
        </Container>
      </TransitionProvider>
    )
  }
}

export default MyApp