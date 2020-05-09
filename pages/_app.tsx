import React from 'react'
import App from 'next/app'
import 'service/style/global.css'
import { Provider as TransitionProvider } from 'service/transition'
import { ThemeProvider } from 'service/theme'

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props

    return (
      <ThemeProvider>
        <TransitionProvider>
          <Component {...pageProps} />
        </TransitionProvider>
      </ThemeProvider>
    )
  }
}

export default MyApp
