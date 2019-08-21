import * as React from 'react'
import Link from 'next/link'
import Head from 'next/head'

const AboutPage: React.FunctionComponent = () => (
  <React.Fragment>
    <Head>
      <title>About ~ sospedra.me</title>
    </Head>

    <h1>About</h1>
    <p>This is the about page</p>
    <p>
      <Link href="/">
        <a>Go home</a>
      </Link>
    </p>
  </React.Fragment>
)

export default AboutPage
