import React from 'react'
import App from 'next/app'
import 'service/style/global.css'
import { Provider as TransitionProvider } from 'service/transition'
import { ThemeProvider } from 'service/theme'
import { Mousetrap } from 'service/mousetrap'
import { Markdown } from 'service/markdown/Provider'
import EasterEgg from 'service/easteregg'

class SospedraApp extends App {
  render() {
    const { Component, pageProps } = this.props

    return (
      <ThemeProvider>
        <TransitionProvider>
          <Mousetrap>
            <EasterEgg>
              <Markdown>
                <Component {...pageProps} />
              </Markdown>
            </EasterEgg>
          </Mousetrap>
        </TransitionProvider>
      </ThemeProvider>
    )
  }
}

export default SospedraApp
