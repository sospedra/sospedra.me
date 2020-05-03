import React from 'react'
import App from 'next/app'
import { Provider as TransitionProvider } from '../service/transition'
import Layout from '../components/Layout'
import Background from '../components/Background'
import '../service/style/global.css'

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props

    return (
      <div id='theme' className='dark'>
        <TransitionProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <Background />
        </TransitionProvider>

        <style jsx global>{`
          @font-face {
            font-family: 'lazer84';
            src: url('/fonts/lazer84.woff') format('woff'),
              /* chrome, firefox */ url('/fonts/lazer84.ttf') format('truetype'),
              /* chrome, firefox, opera, Safari, Android, iOS 4.2+ */
                url('/fonts/lazer84.svg#lazer84') format('svg'); /* iOS 4.1- */
            font-style: normal;
            font-weight: normal;
          }
        `}</style>
      </div>
    )
  }
}

export default MyApp
