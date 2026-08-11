'use client'

import cn from 'clsx'
import type React from 'react'
import neonCss from 'services/style/neon.module.css'
import {
  DEFAULT_LOCALE,
  LOCALE_LABEL,
  localesOf,
  paperPath,
  type ReaderLocale,
} from './paper.locales.ts'

const COOKIE_MAX_AGE = 31_536_000

/** The proxy reads this cookie, so a manual pick survives the geo redirect. */
const remember = (locale: ReaderLocale) => {
  document.cookie = `paper-lang=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

const PaperLangs: React.FC<{ slug: string; locale: ReaderLocale }> = (
  props,
) => {
  const locales: ReaderLocale[] = [DEFAULT_LOCALE, ...localesOf(props.slug)]
  if (locales.length < 2) return null

  return (
    <nav aria-label='Language' className='mt-3 flex flex-wrap gap-x-3 text-xs'>
      {locales.map((locale) => (
        <a
          key={locale}
          href={paperPath(props.slug, locale)}
          hrefLang={locale}
          lang={locale}
          aria-current={locale === props.locale ? 'page' : undefined}
          onClick={() => remember(locale)}
          className={cn(
            locale === props.locale
              ? 'text-white'
              : cn('text-cyan-400', neonCss.neon),
          )}
        >
          {LOCALE_LABEL[locale]}
        </a>
      ))}
    </nav>
  )
}

export default PaperLangs
