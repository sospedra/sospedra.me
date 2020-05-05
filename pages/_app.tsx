import React from 'react'
import App from 'next/app'
import 'service/style/global.css'
import { Provider as TransitionProvider } from 'service/transition'
import { ThemeProvider } from 'service/theme'
import Background from 'components/Background'

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props

    return (
      <ThemeProvider>
        <TransitionProvider>
          <div
            className='fixed top-0 left-0 w-screen h-screen overflow-y-auto'
            style={{
              overscrollBehavior: 'contain',
            }}
          >
            <Component {...pageProps} />
          </div>
          <Background />
        </TransitionProvider>
      </ThemeProvider>
    )
  }
}

export default MyApp
