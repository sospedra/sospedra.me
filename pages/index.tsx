import * as React from 'react'
import { NextPage } from 'next'
import Link from 'next/link'
import { animated, useSpring } from 'react-spring'
import Meta from '../components/Meta'

const IndexPage: NextPage = () => {
  const animation = useSpring({
    from: { transform: "translate(-100vw)" },
    to: { transform: "translate(0)" }
  })

  return (
    <animated.div style={{...animation}}>
      <Meta title="Home | Next.js + TypeScript Example" />
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
