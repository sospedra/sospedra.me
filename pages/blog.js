import React from 'react'
import Head from 'next/head'

const Blog = (props, ref) => (
  <div ref={ref}>
    <Head>
      <title>Blog &mdash; Rub&eacute;n Sospedra</title>
    </Head>

    <span>A sexy blog</span>
  </div>
)

export default React.forwardRef(Blog)
