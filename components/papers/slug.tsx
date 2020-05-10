import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import ErrorPage from 'next/error'
import { Post } from 'service/api'
import Footer from 'components/sospedra/Footer'
import Shell from 'components/sospedra/Shell'
import Meta from 'components/sospedra/Meta'
import Link, { LinkBack } from 'components/sospedra/Link'
import markdownCSS from './markdown.module.css'

const Paper: React.FC<{
  post: Post
}> = ({ post }) => {
  const router = useRouter()

  useEffect(() => {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })
  }, [])

  if (!router.isFallback && !post?.slug) {
    return <ErrorPage statusCode={404} />
  }

  if (router.isFallback) {
    return <p>Loading…</p>
  }

  return (
    <Shell
      title={post.title}
      image={post.ogImage.url}
      description={post.excerpt}
      className='w-full max-w-2xl px-4 pt-12 pb-20 mx-auto text-gray-200'
    >
      <Link url='/papers'>
        <LinkBack>Papers</LinkBack>
      </Link>

      <article>
        <h1 className='font-serif text-4xl text-cyan-300'>{post.title}</h1>
        <Meta
          className='mt-2 mb-12'
          time={post.timeStamp}
          minutes={post.readingMinutes}
        />
        <div
          className={`${markdownCSS['markdown']} mb-8`}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
      <Footer slug={post.slug} />
    </Shell>
  )
}

export default Paper
