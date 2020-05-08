import React from 'react'
import cn from 'classnames'
import Link, { LinkBack } from 'components/Link'
import { getAllPosts, Post } from 'service/api'
import glitchCss from 'service/style/glitch.module.css'
import neonCss from 'service/style/neon.module.css'
import Meta from 'components/Meta'
import Shell from 'components/Shell'

const DESCRIPTION =
  "Words are my own. It's dangerous to go unknowing, take some pills 💊"

const getTitleCss = () => {
  return Math.random() < 0.9 ? neonCss.neon : glitchCss.glitch
}

const Papers: React.FC<{
  allPosts: Post[]
}> = (props) => {
  return (
    <Shell
      title='Papers'
      className='w-full max-w-2xl px-4 pt-12 pb-20 mx-auto text-gray-200'
      description={`Personal blog by Rubén Sospedra. ${DESCRIPTION}`}
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>

      <h1 className='text-4xl'>Papers</h1>
      <p className='pb-10'>{DESCRIPTION}</p>

      <ul>
        {props.allPosts.map((post) => (
          <li key={post.slug} className='pt-2 pb-12'>
            <Link as={`/papers/${post.slug}`} url='/papers/[slug]' instant>
              <h2
                data-text={post.title}
                className={cn('font-serif text-3xl', {
                  [getTitleCss()]: true,
                })}
              >
                {post.title}
              </h2>
            </Link>
            <Meta
              className='mb-2'
              time={post.timeStamp}
              minutes={post.readingMinutes}
            />
            <p>{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </Shell>
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
