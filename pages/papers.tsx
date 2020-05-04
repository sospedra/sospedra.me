import React from 'react'
import Head from 'next/head'
import Link from 'components/Link'
import { getAllPosts, Post } from 'service/api'

const Papers: React.FC<{
  allPosts: Post[]
}> = (props) => {
  return (
    <>
      <Head>
        <title>Papers ~ sospedra.me</title>
      </Head>

      <h1>Papers</h1>
      <ul>
        {props.allPosts.map((post) => (
          <li key={post.slug}>
            <Link as={`/papers/${post.slug}`} url='/papers/[slug]' instant>
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
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
