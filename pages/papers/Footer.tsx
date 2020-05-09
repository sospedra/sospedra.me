import React from 'react'
import cn from 'classnames'
import { useRouter } from 'next/router'
import neonCss from 'service/style/neon.module.css'

const createTwitterSearch = (url: string) => {
  const href = `https://sospedra.me${url}`
  return `https://mobile.twitter.com/search?q=${encodeURIComponent(href)}`
}

const createGithubLink = (slug: string) => {
  return `https://github.com/sospedra/sospedra.me/blob/master/_papers/${slug}.md`
}

const Footer: React.FC<{
  slug: string
}> = (props) => {
  const { asPath } = useRouter()

  return (
    <footer>
      <a
        href={createTwitterSearch(asPath)}
        className={cn('text-cyan-400', {
          [neonCss.neon]: true,
        })}
        rel='noopener noreferrer'
        target='_blank'
      >
        Discuss on Twitter
      </a>
      <span className='mx-2 font-bold'>~</span>
      <a
        href={createGithubLink(props.slug)}
        className={cn('text-cyan-400', {
          [neonCss.neon]: true,
        })}
        rel='noopener noreferrer'
        target='_blank'
      >
        Edit on GitHub
      </a>
    </footer>
  )
}

export default Footer
