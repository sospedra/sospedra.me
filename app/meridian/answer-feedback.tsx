import css from './answer-feedback.module.css'
import type { GeoSound } from './geo-audio'
import { formatScore } from './geo-format'
import type { GeoLocale, GeoMessages } from './geo-messages'
import type { AnswerResult, LocalizedOption } from './model'

export const selectedOptionFor = (
  answer: AnswerResult | null,
): string | null => {
  if (!answer || answer.kind === 'map-pin') return null
  return answer.selectedOptionId
}

export const correctOptionFor = (
  answer: AnswerResult | null,
): string | null => {
  if (!answer || answer.kind === 'map-pin') return null
  return answer.correctOptionId
}

export const isPerfectAnswer = (answer: AnswerResult | null): boolean =>
  answer?.kind === 'map-pin' && answer.distanceBand === 'within-100'

export type FeedbackResult =
  | 'correct'
  | 'expired'
  | 'incorrect'
  | 'passed'
  | 'perfect'

export const feedbackResult = (answer: AnswerResult): FeedbackResult => {
  if (answer.expired) return 'expired'
  if (answer.skipped) return 'passed'
  if (isPerfectAnswer(answer)) return 'perfect'
  return answer.correct ? 'correct' : 'incorrect'
}

export const feedbackHeadline = (
  answer: AnswerResult,
  copy: GeoMessages,
): string => {
  const headlines: Record<FeedbackResult, string> = {
    correct: copy.correct,
    expired: copy.expired,
    incorrect: copy.incorrect,
    passed: copy.passed,
    perfect: copy.perfect,
  }
  return headlines[feedbackResult(answer)]
}

export const FEEDBACK_GLYPHS: Record<FeedbackResult, string> = {
  correct: '✓',
  expired: '×',
  incorrect: '×',
  passed: '↷',
  perfect: '◎',
}

export const FEEDBACK_ATTRS: Record<FeedbackResult, string> = {
  correct: 'correct',
  expired: 'incorrect',
  incorrect: 'incorrect',
  passed: 'pass',
  perfect: 'perfect',
}

export const FEEDBACK_SOUNDS: Record<FeedbackResult, GeoSound> = {
  correct: 'correct',
  expired: 'timeout',
  incorrect: 'incorrect',
  passed: 'pass',
  perfect: 'perfect',
}

export const feedbackDetail = (
  answer: AnswerResult,
  copy: GeoMessages,
  locale: GeoLocale,
  submittedLabel: string | undefined,
): string => {
  if (answer.kind === 'map-pin') {
    if (answer.distanceKm === null) return ''
    return copy.distanceAway.replace(
      '{distance}',
      new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', {
        maximumFractionDigits: 0,
      }).format(answer.distanceKm),
    )
  }
  if (!submittedLabel) return ''
  return `${copy.yourAnswer}: ${submittedLabel}`
}

export function FeedbackBar({
  answer,
  copy,
  locale,
  options,
}: {
  answer: AnswerResult
  copy: GeoMessages
  locale: GeoLocale
  options: LocalizedOption[]
}) {
  const result = feedbackResult(answer)
  const correctOption = options.find(
    (option) => option.id === correctOptionFor(answer),
  )
  const selectedOption = options.find(
    (option) => option.id === selectedOptionFor(answer),
  )
  const submittedText =
    answer.kind === 'choice' ? answer.submittedText?.trim() : undefined
  const detail = feedbackDetail(
    answer,
    copy,
    locale,
    submittedText ?? selectedOption?.label[locale],
  )
  const correction = answer.correct ? null : correctOption

  return (
    <div className={css.feedbackBar} data-result={result}>
      <span className={css.feedbackIcon} aria-hidden='true'>
        {FEEDBACK_GLYPHS[result]}
      </span>
      <span className={css.feedbackCopy}>
        <strong>{feedbackHeadline(answer, copy)}</strong>
        <span>{detail}</span>
      </span>
      <span className={css.feedbackPoints}>
        <strong>
          {answer.score > 0 ? `+${formatScore(answer.score, locale)}` : '0'}
        </strong>
        <span>
          {answer.score > 0
            ? `×${answer.streakMultiplier.toFixed(1)} ${copy.multiplier}`
            : copy.noPoints}
        </span>
      </span>
      {correction && (
        <div className={css.feedbackCorrection}>
          <span>{copy.correctAnswer}</span>
          <strong>{correction.label[locale]}</strong>
        </div>
      )}
    </div>
  )
}
