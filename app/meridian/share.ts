import { filter, join, map, pipe } from 'es-toolkit/fp'
import type {
  AnswerResult,
  DailyGeoChallenge,
  Locale,
  MapDistanceBand,
  RoundType,
} from './model'
import { calculateRunStatistics } from './stats'

const ROUND_LABELS: Record<Locale, Record<RoundType, string>> = {
  en: {
    shape: 'Shapes',
    flag: 'Flags',
    capital: 'Capitals',
    map: 'Map',
  },
  es: {
    shape: 'Formas',
    flag: 'Banderas',
    capital: 'Capitales',
    map: 'Mapa',
  },
}

const TITLES: Record<Locale, string> = {
  en: 'GEO DAILY',
  es: 'GEO DIARIO',
}

const MAP_SYMBOLS: Record<MapDistanceBand, string> = {
  'within-100': '🎯',
  'within-300': '🟢',
  'within-750': '🟡',
  'within-1500': '🟠',
  'within-3000': '🔴',
  miss: '⬛',
  expired: '⬛',
}

export const mapDistanceBandShareSymbol = (band: MapDistanceBand) =>
  MAP_SYMBOLS[band]

const answerSymbol = (roundType: RoundType, answer?: AnswerResult) => {
  if (!answer) return '⬛'
  if (roundType !== 'map') return answer.correct ? '🟩' : '⬛'
  if (answer.kind !== 'map-pin') return '⬛'
  return mapDistanceBandShareSymbol(answer.distanceBand)
}

export type ShareCardInput = {
  challenge: DailyGeoChallenge
  answers: readonly AnswerResult[]
  locale: Locale
  challengeNumber?: number
}

export const formatGeoShareCard = ({
  answers,
  challenge,
  challengeNumber,
  locale,
}: ShareCardInput) => {
  const identifier =
    challengeNumber ?? challenge.sequence ?? challenge.publicationDate
  const issue = typeof identifier === 'number' ? `#${identifier}` : identifier
  const labelWidth = Math.max(
    ...challenge.rounds.map((round) => ROUND_LABELS[locale][round.type].length),
  )
  const roundLines = challenge.rounds.map((round) => {
    const label = ROUND_LABELS[locale][round.type].padEnd(labelWidth + 2)
    const symbols = pipe(
      answers,
      filter((answer) => answer.roundId === round.id),
      map((answer) => answerSymbol(round.type, answer)),
      join(''),
    )
    return `${label}${symbols || '—'}`
  })
  const statistics = calculateRunStatistics(challenge, answers)
  const formattedScore = new Intl.NumberFormat(
    locale === 'en' ? 'en-US' : 'es-ES',
  ).format(statistics.totalScore)

  return [
    `${TITLES[locale]} ${issue} 🌍`,
    ...roundLines,
    `${statistics.correctAnswers}/${statistics.totalQuestions} · ${formattedScore}`,
  ].join('\n')
}
