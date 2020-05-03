import React from 'react'
import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import Head from 'next/head'
import { getPostBySlug, getAllPosts, Post } from '../../service/api'
import markdownToHtml from '../../service/markdown'
import markdownStyles from './markdown-styles.module.css'
import { Time } from '../../components/Time'
import { GetStaticProps } from 'next'

const Paper: React.FC<{
  post: Post
}> = ({ post }) => {
  const router = useRouter()
  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }
  return (
    <>
      {router.isFallback ? (
        <h1>Loading…</h1>
      ) : (
        <>
          <article>
            <Head>
              <title>{post.title} ~ Rubén Sospedra</title>
              <meta property='og:image' content={post.ogImage.url} />
            </Head>
            <h1>{post.title}</h1>

            <img title={post.title} src={post.coverImage} />

            <Time dateString={post.date} />

            <main
              className={markdownStyles['markdown']}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </article>
        </>
      )}
    </>
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
