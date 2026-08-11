import cn from 'clsx'
import type React from 'react'
import { SITE_URL } from 'services/site'
import neonCss from 'services/style/neon.module.css'
import css from './footer.module.css'
import {
  DEFAULT_LOCALE,
  paperPath,
  type ReaderLocale,
} from './paper.locales.ts'

const REPO_URL = 'https://github.com/sospedra/sospedra.me'
const REPO_BRANCH = 'main'

const createXSearch = (url: string) => {
  const href = `${SITE_URL}${url}`
  return `https://x.com/search?q=${encodeURIComponent(href)}`
}

const createGithubLink = (slug: string, locale: ReaderLocale) => {
  const file = locale === DEFAULT_LOCALE ? 'index.mdx' : `index.${locale}.mdx`
  return `${REPO_URL}/blob/${REPO_BRANCH}/apps/main/repo/papers/${slug}/${file}`
}

const Footer: React.FC<{
  slug: string
  locale?: ReaderLocale
}> = (props) => {
  const locale = props.locale ?? DEFAULT_LOCALE

  return (
    <>
      <p className={css.signature} title='僕と戦う' aria-hidden='true'>
        r
      </p>
      <footer className='flex items-center'>
        <a
          href={createXSearch(paperPath(props.slug, locale))}
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
          href={createGithubLink(props.slug, locale)}
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
