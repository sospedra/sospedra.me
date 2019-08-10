import React, { useEffect, useRef } from 'react'
import Head from 'next/head'
import { useSpring, useChain, animated } from 'react-spring'

import Title from '../components/Title'
import Claim from '../components/Claim'
import Sprite from '../components/Sprite'
import Satellite from '../components/Satellite'
import { useTransition, Link } from '../service/transition'
import { useCamera } from '../service/camera'

const rootStyles = {
  display: "flex",
  height: "100vh",
  justifyContent: "center",
  width: "100vw",
  position: "absolute",
  opacity: 0,
}

const Home = (props) => {
  const rootRef = useRef()
  const root = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    delay: 1000,
    ref: rootRef,
  })
  const { unmount, hasRequestedUnmount } = useTransition()
  const { setCamera, registerOnFinish, cameraRef } = useCamera();

  useEffect(() => {
    setCamera({ row: 5, column: 0 })
  }, [setCamera])

  useEffect(() => {
    if (hasRequestedUnmount) {
      registerOnFinish(unmount)
      setCamera({ row: 0, column: 0 })
    }
  }, [hasRequestedUnmount])
  
  useChain([cameraRef, rootRef], [0, 0.5])

  return (
    <React.Fragment>
      <Satellite animate={hasRequestedUnmount} />
      
      <animated.div style={{ ...rootStyles, ...root }}>
        <Head>
          <title>Rub&eacute;n Sospedra</title>
        </Head>

        <main>
          <Title />
          <Claim />
          <Link href="/blog">Blog</Link>
        </main>

        <Sprite />
      </animated.div>

      <style jsx>{`
          main {
            align-items: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
      `}</style>
    </React.Fragment>
  )
}

export default Home
