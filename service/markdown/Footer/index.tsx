import cn from 'clsx'
import type React from 'react'
import neonCss from 'service/style/neon.module.css'
import css from './footer.module.css'

const createXSearch = (url: string) => {
  const href = `https://sospedra.me${url}`
  return `https://x.com/search?q=${encodeURIComponent(href)}`
}

const createGithubLink = (slug: string) => {
  return `https://github.com/sospedra/sospedra.me/blob/master/content/papers/${slug}/index.mdx`
}

const Footer: React.FC<{
  slug: string
}> = (props) => {
  return (
    <>
      <p className={css.signature} title='僕と戦う'>
        r
      </p>
      <footer className='flex items-center'>
        <a
          href={createXSearch(`/papers/${props.slug}`)}
          className={cn('text-cyan-400', neonCss.neon)}
          rel='noopener noreferrer'
          target='_blank'
        >
          Discuss on X
        </a>
        <span className='mx-2 mt-1 text-xs font-bold opacity-75'>▼</span>
        <a
          href={createGithubLink(props.slug)}
          className={cn('text-cyan-400', neonCss.neon)}
          rel='noopener noreferrer'
          target='_blank'
        >
          Edit on GitHub
        </a>
      </footer>
    </>
  )
}

export default Footer
