import React from 'react'
import { GetStaticProps } from 'next'
import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import Head from 'next/head'
import { getPostBySlug, getAllPosts, Post } from 'service/api'
import markdownToHtml from 'service/markdown'
import Time from 'components/Time'
import Icon from 'components/Icon'
import markdownCSS from './markdown.module.css'

const Paper: React.FC<{
  post: Post
}> = ({ post }) => {
  const router = useRouter()

  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }

  if (router.isFallback) {
    return <p>Loading…</p>
  }

  return (
    <div className='w-full max-w-2xl p-4 mx-auto text-gray-200'>
      <Head>
        <title>{post.title} ~ Rubén Sospedra</title>
        <meta property='og:image' content={post.ogImage.url} />
      </Head>
      <article className='py-8'>
        <h1 className='font-serif text-4xl text-cyan-200'>{post.title}</h1>

        <p className='mt-2 mb-6 text-sm'>
          <Time time={post.date} /> ~ <Icon name='pizza.svg' />{' '}
          <Icon name='pizza.svg' />
        </p>

        <main
          className={`${markdownCSS['markdown']} markdown`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = getPostBySlug(params?.slug as string, [
    'title',
    'date',
    'slug',
    'author',
    'content',
    'ogImage',
    'coverImage',
  ])
  const content = await markdownToHtml(post.content || '')

  return {
    props: {
      post: {
        ...post,
        content,
      },
    },
  }
}

export async function getStaticPaths() {
  const posts = getAllPosts(['slug'])

  return {
    paths: posts.map((posts) => {
      return {
        params: {
          slug: posts.slug,
        },
      }
    }),
    fallback: false,
  }
}

export default Paper
