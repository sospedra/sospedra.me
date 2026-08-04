import cn from 'clsx'
import Link from 'services/link'
import type { Copy } from './crossword-copy'
import type { CrosswordLocale, CrosswordPuzzle } from './crossword-data'
import css from './crossword-masthead.module.css'
import cw from './crosswords.module.css'

export const CrosswordMasthead = ({
  changeLocale,
  complete,
  copy,
  hasSpanish,
  hydrated,
  locale,
  publicationDate,
  puzzle,
  solvedEntryIds,
}: {
  changeLocale: (nextLocale: CrosswordLocale) => void
  complete: boolean
  copy: Copy
  hasSpanish: boolean
  hydrated: boolean
  locale: CrosswordLocale
  publicationDate: string
  puzzle: CrosswordPuzzle
  solvedEntryIds: ReadonlySet<string>
}) => {
  const filingStatus = !hydrated
    ? copy.progressLoading
    : complete
      ? copy.allFiled
      : copy.clueProgress(solvedEntryIds.size, puzzle.entries.length)

  return (
    <header className={css.masthead}>
      <div className={css.headerUtility}>
        <Link
          url='/'
          className={cn(css.homeLink, cw.homeLink)}
          aria-label={copy.home}
        >
          <span aria-hidden='true'>↩</span>
          <span>{copy.home}</span>
        </Link>
      </div>
      <div className={css.brandBlock}>
        <p>{copy.edition(`${puzzle.width} × ${puzzle.height}`)}</p>
        <h1>
          {copy.brand}
          <span className={cw.srOnly}> — {copy.dailyCrossword}</span>
        </h1>
        <span className={css.publicationLine}>
          <time dateTime={puzzle.publicationDate}>{publicationDate}</time>
        </span>
      </div>
      <div className={css.filingProgress}>
        <span aria-hidden='true'>
          {hydrated
            ? `${solvedEntryIds.size} / ${puzzle.entries.length}`
            : '— / —'}
        </span>
        <progress
          max={puzzle.entries.length}
          value={hydrated ? solvedEntryIds.size : undefined}
          aria-label={filingStatus}
        />
      </div>
      {hasSpanish && (
        <fieldset className={cn(css.localeSwitch, cw.localeSwitch)}>
          <legend className={cw.srOnly}>{copy.language}</legend>
          <button
            type='button'
            data-active={locale === 'en'}
            aria-pressed={locale === 'en'}
            aria-label={copy.english}
            onClick={() => changeLocale('en')}
          >
            EN
          </button>
          <button
            type='button'
            data-active={locale === 'es'}
            aria-pressed={locale === 'es'}
            aria-label={copy.spanish}
            onClick={() => changeLocale('es')}
          >
            ES
          </button>
        </fieldset>
      )}
    </header>
  )
}
