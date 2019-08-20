import * as React from 'react'
import Link from 'next/link'
import Meta from '../components/Meta'

const AboutPage: React.FunctionComponent = () => (
  <React.Fragment>
    <Meta title="About | Next.js + TypeScript Example" />
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
