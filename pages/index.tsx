import * as React from 'react'
import { NextPage } from 'next'
import Link from 'next/link'
import Head from 'next/head'
import { animated, useSpring } from 'react-spring'

const IndexPage: NextPage = () => {
  const animation = useSpring({
    from: { transform: "translate(-100vw)" },
    to: { transform: "translate(0)" }
  })

  return (
    <animated.div style={{...animation}}>
      <Head>
        <title>Rub&eacute;n Sospedra ~ sospedra.me</title>
      </Head>

      <h1>Hello Next.js 👋</h1>
      <p>
        <Link href="/about">
          <a>About</a>
        </Link>
      </p>
    </animated.div>
  )
}

export default IndexPage
