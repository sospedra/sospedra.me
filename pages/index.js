import Head from 'next/head'
import Link from 'next/link'

import './styles.global'
import Home from './home'

import css from 'next/css'

export default () => (
  <div {...css({
    backgroundColor: 'cadetblue',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  })}>
    <Head>
      <title>Rubén Sospedra && Javascript hacker</title>
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />
    </Head>

    <Link href='/menu'>Menu</Link>
    <Home />
  </div>
)
