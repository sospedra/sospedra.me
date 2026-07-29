import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Metadata } from 'next'
import { Courier_Prime } from 'next/font/google'
import type { CrosswordChallengeFile } from './crossword-data'
import CrosswordsView from './crosswords-view'

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Crosswords',
  description:
    'A bilingual daily crossword with keyboard-first play in English and Spanish.',
  alternates: { canonical: '/crosswords' },
}

const CHALLENGES_DIR = join(process.cwd(), 'content/crosswords/challenges')

/* The daily rebuild re-runs this at build time. The newest editions ride
   along and the client picks by its own calendar, so no date input is needed
   here and the result caches statically. */
async function loadRecentChallenges(): Promise<CrosswordChallengeFile[]> {
  'use cache'

  const files = (await readdir(CHALLENGES_DIR))
    .filter((file) => file.endsWith('.json'))
    .sort()

  // The batch pre-generates months ahead; ship only editions up to the
  // build date plus one day so the newest published one is today's.
  const horizon = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const published = files.filter((file) => file.slice(0, 10) <= horizon)
  const picked = (published.length > 0 ? published : files).slice(-5)
  return Promise.all(
    picked.map(async (file) =>
      JSON.parse(await readFile(join(CHALLENGES_DIR, file), 'utf8')),
    ),
  )
}

export default async function CrosswordsPage() {
  const challenges = await loadRecentChallenges()
  return (
    <CrosswordsView
      challenges={challenges}
      letterFontClassName={courierPrime.className}
    />
  )
}
