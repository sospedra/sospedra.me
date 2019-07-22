import React from 'react'
import Head from 'next/head'

import Title from '../components/Title'
import Claim from '../components/Claim'
import Sprite from '../components/Sprite'
import { useTransition, Link } from '../service/transition'

const Home = (props, ref) => {
  const { unmount, hasRequestedUnmount } = useTransition()

  if (hasRequestedUnmount) {
    window.onanimationend = () => {
      unmount()
      window.onanimationend = null
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className='root' ref={ref}>
      <Head>
        <title>Rub&eacute;n Sospedra</title>
      </Head>

      <main>
        <Title />
        <Claim />
        <Link href="/blog">Blog</Link>
      </main>

      <Sprite />

      <style jsx>{`
      .root {
        display: flex;
        height: 100vh;
        justify-content: center;
        width: 100vw;
        top: 100vh;
        position: absolute;
      }

      main {
        align-items: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
    `}</style>
    </div>
  )
}

export default React.forwardRef(Home)
