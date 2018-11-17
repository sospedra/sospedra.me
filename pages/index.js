import React from 'react'
import Head from 'next/head'
import NoSSR from 'react-no-ssr'

import Title from '../components/Title'
import Claim from '../components/Claim'
import Sprite from '../components/Sprite'
import Loading from '../components/Loading'

const Home = (props) => (
  <div className='root'>
    <Head>
      <title>Rub&eacute;n Sospedra</title>
    </Head>

    <NoSSR onSSR={<Loading />}>
      <main>
        <Title />
        <Claim />
      </main>

      <Sprite />
    </NoSSR>

    <style jsx>{`
      .root {
        display: flex;
        height: 100%;
        justify-content: center;
        width: 100%;
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

export default Home
