import cn from 'clsx'
import type React from 'react'
import { SITE_URL } from 'services/site'
import neonCss from 'services/style/neon.module.css'
import css from './footer.module.css'

const REPO_URL = 'https://github.com/sospedra/sospedra.me'
const REPO_BRANCH = 'master'

const createXSearch = (url: string) => {
  const href = `${SITE_URL}${url}`
  return `https://x.com/search?q=${encodeURIComponent(href)}`
}

const createGithubLink = (slug: string) => {
  return `${REPO_URL}/blob/${REPO_BRANCH}/repo/papers/${slug}/index.mdx`
}

const Footer: React.FC<{
  slug: string
}> = (props) => {
  return (
    <>
      <p className={css.signature} title='僕と戦う' aria-hidden='true'>
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
        <span
          aria-hidden='true'
          className='mx-2 mt-1 text-xs font-bold opacity-75'
        >
          ▼
        </span>
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
