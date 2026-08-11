import { type NextRequest, NextResponse } from 'next/server'
import {
  DEFAULT_LOCALE,
  isPaperLocale,
  localeFromCountry,
  localeFromHeader,
  localesOf,
  paperPath,
  type ReaderLocale,
} from 'services/markdown/paper.locales'

const LANG_COOKIE = 'paper-lang'

const savedLocale = (value: string | undefined): ReaderLocale | null => {
  if (!value) return null
  if (value === DEFAULT_LOCALE) return DEFAULT_LOCALE
  return isPaperLocale(value) ? value : null
}

/** Manual pick first, then the request IP country, then the browser list. */
const readerLocale = (request: NextRequest): ReaderLocale =>
  savedLocale(request.cookies.get(LANG_COOKIE)?.value) ??
  localeFromCountry(request.headers.get('x-vercel-ip-country')) ??
  localeFromHeader(request.headers.get('accept-language')) ??
  DEFAULT_LOCALE

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split('/')[2] ?? ''
  const available = localesOf(slug)
  if (available.length === 0) return

  const locale = readerLocale(request)
  if (locale === DEFAULT_LOCALE) return
  if (!available.includes(locale)) return

  const response = NextResponse.redirect(
    new URL(paperPath(slug, locale), request.url),
    307,
  )
  response.headers.set('Vary', 'accept-language')
  return response
}

export const config = {
  matcher: '/papers/:slug',
}
