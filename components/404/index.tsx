import React, { useState } from 'react'
import Head from 'next/head'
import { useTransition } from 'service/transition'
import Link from 'components/Link'
import css from './404.module.css'

const Component404: React.FC<{}> = () => {
  const [vid, setVid] = useState('desk')
  const { navigate } = useTransition()

  return (
    <div className={css.notfound}>
      <Head>
        <meta name='robots' content='noindex' />
        <link
          as='video'
          href='/video/desk.webm'
          rel='preload'
          type='image/webm'
        />
        <link
          as='video'
          href='/video/pedro.webm'
          rel='preload'
          type='image/webm'
        />
        <link
          as='video'
          href='/video/kermit.webm'
          rel='preload'
          type='image/webm'
        />
      </Head>
      <div
        className={`${css.message} ${vid !== 'desk' && css.shake}`}
        style={{
          animationDuration:
            vid === 'kermit' ? '2s' : vid === 'pedro' ? '1s' : '0.5s',
        }}
      >
        <p>PAGE</p>
        <p>NOT</p>
        <p className='self-end'>FOUND</p>
        <p className='text-center'>404</p>
      </div>
      <button
        className={vid === 'static' ? 'cursor-wait' : 'cursor-pointer'}
        onClick={() => {
          if (vid === 'static') return
          if (vid === 'pedro') {
            setVid('static')
            setTimeout(() => navigate('/'), 1000)
            return
          }
          setVid(vid === 'desk' ? 'kermit' : 'pedro')
        }}
      >
        <video
          controls={false}
          autoPlay
          loop
          preload='auto'
          className={`${css.video} ${vid !== 'desk' && css.expand}`}
          key={vid}
        >
          <source src={`/video/${vid}.webm`} type='video/webm' />
          <source src={`/video/${vid}.mp4`} type='video/mp4' />
        </video>
      </button>
      <nav className={css.nav}>
        <Link url='/'>Take me to a safe place</Link>
        <Link url='/serve'>I was looking for a static asset</Link>
      </nav>
    </div>
  )
}

export default Component404
