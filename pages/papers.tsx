import React from 'react'
import Head from 'next/head'
import Link, { LinkStyle } from 'components/Link'
import Time from 'components/Time'
import { getAllPosts, Post } from 'service/api'

const Papers: React.FC<{
  allPosts: Post[]
}> = (props) => {
  return (
    <>
      <Head>
        <title>Papers ~ sospedra.me</title>
      </Head>

      <main className='w-full max-w-2xl p-4 mx-auto text-white'>
        <h1 className='pb-4 text-3xl'>Papers</h1>
        <ul>
          {props.allPosts.map((post) => (
            <li key={post.slug}>
              <Link as={`/papers/${post.slug}`} url='/papers/[slug]' instant>
                <LinkStyle className='pb-1 text-2xl'>
                  CSS Variables for React Devs
                </LinkStyle>
              </Link>
              <p className='my-2 text-sm'>
                <Time time={post.date} /> ~{' '}
                <span aria-label='time' role='img'>
                  ⌛️
                </span>
              </p>
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
    'title',
    'date',
    'slug',
    'author',
    'coverImage',
    'excerpt',
  ])

  return {
    props: { allPosts },
  }
}

export default Papers
