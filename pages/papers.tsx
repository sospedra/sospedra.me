import React from 'react'
import Head from 'next/head'
import Link from '../components/Link'

const Papers: React.FC<{}> = () => (
  <>
    <Head>
      <title>About ~ sospedra.me</title>
    </Head>

    <h1>About</h1>
    <p>This is the about page</p>
    <p>
      <Link href='/'>
        <a>Go home</a>
      </Link>
    </p>
  </>
)

export default Papers
