import React, { useState, useEffect } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { animated, config, useSpring } from 'react-spring'
import Link from '../components/Link'
import SpriteCity from '../components/sprite/city'

const IndexPage: NextPage = () => {
  const [offset, setOffset] = useState(100)
  const { transform } = useSpring({
    transform: `translateY(${offset}vh)`,
    config: config.slow,
  })

  useEffect(() => {
    setOffset(0)
  }, [])

  return (
    <animated.div style={{ transform }}>
      <div className='root'>
        <Head>
          <title>Rub&eacute;n Sospedra ~ sospedra.me</title>
        </Head>

        <h1>
          <a href='https://twitter.com/sospedra_r' target='_blank'>
            Rub&eacute;n Sospedra
          </a>
        </h1>

        <h2>
          ｊａｖａｓｃｒｉｐｔ&nbsp;&nbsp;&nbsp;&nbsp;ｈａｃｋｅｒ
          <br />
          ｆｕｌｌｓｔａｃｋ ｅｎｇｉｎｅｅｒ
        </h2>

        <ul>
          <li>
            <Link href='/papers' onClick={() => setOffset(100)}>
              Papers
            </Link>
          </li>
        </ul>

        <SpriteCity />
      </div>

      <style jsx>{`
        .root {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
        }

        h1 {
          text-align: center;
        }

        h1 > a {
          color: #6df7ea;
          font-family: lazer84, monospace;
          font-size: calc(1.8em + 1vw);
          text-decoration: none;
          text-shadow: 1.9px 2px 0 #3f2d43;
          text-transform: uppercase;
        }

        h2 {
          color: #ea1195;
          font-size: calc(1em + 1vw);
          text-shadow: -1px 1px 0 #ffb9b9;
        }
      `}</style>
    </animated.div>
  )
}

export default IndexPage
