import React from 'react'
import App from 'next/app'
import '../service/style/global.css'
import { Provider as TransitionProvider } from '../service/transition'
import { ThemeProvider } from '../service/theme'
import Layout from '../components/Layout'
import Background from '../components/Background'

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props

    return (
      <ThemeProvider>
        <TransitionProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <Background />
        </TransitionProvider>
      </ThemeProvider>
    )
  }
}

export default MyApp
