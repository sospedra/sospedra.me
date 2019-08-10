import React, { useEffect } from 'react'
import Head from 'next/head'

import { Link } from '../service/transition'
import { useCamera } from '../service/camera'

const Blog = (props) => {
  const { setCamera, registerOnFinish } = useCamera();

  useEffect(() => {
    setCamera({ row: 0, column: 0 })
  }, [setCamera])

  return (
    <div>
      <Head>
        <title>Blog &mdash; Rub&eacute;n Sospedra</title>
      </Head>

      <h4>A sexy blog</h4>
      <Link href='/' onClick={(e, t) => t.unmount()}>index</Link>
      <style jsx>{`
      h4 {
        color: white;
      }
    `}</style>
    </div>
  )
}

export default Blog
