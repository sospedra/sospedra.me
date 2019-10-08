import * as React from 'react'
import Head from 'next/head'
import Link from '../components/Link'

const AboutPage: React.FunctionComponent = () => (
  <React.Fragment>
    <Head>
      <title>Blog ] sospedra.me</title>
    </Head>

    <h1>Blog</h1>
    <p>This is the blog directory</p>

    <p>
      <Link href="/">
        <a>Go home</a>
      </Link>
    </p>
  </React.Fragment>
)

export default AboutPage
