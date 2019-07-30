import React, { useEffect } from 'react'
import Head from 'next/head'

import Title from '../components/Title'
import Claim from '../components/Claim'
import Sprite from '../components/Sprite'
import { useTransition, Link } from '../service/transition'
import { useCamera } from '../service/camera'

const Home = (props) => {
  const { unmount, hasRequestedUnmount } = useTransition()
  const { setCamera, registerOnFinish } = useCamera();

  useEffect(() => {
    setCamera({ row: 3, column: 0 })
  }, [setCamera])

  useEffect(() => {
    if (hasRequestedUnmount) {
      registerOnFinish(unmount)
      setCamera({ row: 2, column: 1 })
    }
  }, [hasRequestedUnmount])

  return (
    <div className='root'>
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
          top: 300vh;
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

export default Home
