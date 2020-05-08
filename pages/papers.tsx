import React from 'react'
import Head from 'next/head'
import Link from 'components/Link'
import { getAllPosts, Post } from 'service/api'
import glitchCss from 'service/style/glitch.module.css'
import neonCss from 'service/style/neon.module.css'
import Meta from 'components/Meta'

const getTitleCss = () => {
  const rand = Math.random()
  return rand < 0.9 ? neonCss.neon : glitchCss.glitch
}

const Papers: React.FC<{
  allPosts: Post[]
}> = (props) => {
  return (
    <>
      <Head>
        <title>Papers ~ sospedra.me</title>
      </Head>

      <main className='w-full max-w-2xl p-4 mx-auto overflow-y-auto text-white'>
        <h1 className='pb-4 text-3xl'>Papers</h1>
        <ul>
          {props.allPosts.map((post) => (
            <li key={post.slug}>
              <Link as={`/papers/${post.slug}`} url='/papers/[slug]' instant>
                <h2
                  data-text={post.title}
                  className={`font-serif text-2xl ${getTitleCss()}`}
                >
                  {post.title}
                </h2>
              </Link>
              <Meta
                className='my-2'
                time={post.timeStamp}
                minutes={post.readingMinutes}
              />
              <p>{post.excerpt}</p>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}

export async function getStaticProps() {
  const allPosts = getAllPosts([
    'excerpt',
    'readingMinutes',
    'slug',
    'timeStamp',
    'title',
  ])

  return {
    props: { allPosts },
  }
}

export default Papers
