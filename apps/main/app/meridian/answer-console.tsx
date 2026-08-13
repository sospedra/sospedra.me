import { useEffect } from 'react'
import { tapHaptic } from 'services/haptics'
import { isEditableTarget } from 'services/hotkeys'
import css from './answer-console.module.css'
import { correctOptionFor, selectedOptionFor } from './answer-feedback'
import type { GeoGameState } from './game-state'
import type { GeoLocale, GeoMessages } from './geo-messages'
import type { LocalizedOption } from './model'

const CHOICE_DIGITS = ['1', '2', '3', '4'] as const

type KeyState = 'correct' | 'missed' | undefined

const keyStateFor = (
  optionId: string,
  correctId: string | null,
  selectedId: string | null,
): KeyState => {
  if (optionId === correctId) return 'correct'
  if (optionId === selectedId) return 'missed'
  return undefined
}

export function ChoiceConsole({
  copy,
  locale,
  onChoose,
  onKeystroke,
  options,
  state,
}: {
  copy: GeoMessages
  locale: GeoLocale
  onChoose: (optionId: string) => void
  onKeystroke: () => void
  options: LocalizedOption[]
  state: GeoGameState
}) {
  const active = state.phase === 'question'
  const feedback = state.phase === 'feedback' ? state.lastAnswer : null
  const correctId = correctOptionFor(feedback)
  const selectedId = selectedOptionFor(feedback)

  useEffect(() => {
    if (!active) return
    const transmitDigit = (event: KeyboardEvent) => {
      const digitIndex = CHOICE_DIGITS.indexOf(
        event.key as (typeof CHOICE_DIGITS)[number],
      )
      const blocked =
        digitIndex === -1 ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target)
      if (blocked) return
      const option = options[digitIndex]
      if (!option) return
      event.preventDefault()
      onKeystroke()
      onChoose(option.id)
    }
    window.addEventListener('keydown', transmitDigit)
    return () => window.removeEventListener('keydown', transmitDigit)
  }, [active, onChoose, onKeystroke, options])

  return (
    <aside
      className={css.answerConsole}
      data-mode='choice'
      aria-label={copy.answerInput}
    >
      <fieldset className={css.choiceGrid} aria-labelledby='geo-question-title'>
        {options.map((option, index) => (
          <button
            key={option.id}
            type='button'
            className={css.choiceKey}
            disabled={!active}
            data-state={keyStateFor(option.id, correctId, selectedId)}
            aria-keyshortcuts={CHOICE_DIGITS[index]}
            onPointerDown={() => {
              tapHaptic()
              onKeystroke()
            }}
            onClick={() => onChoose(option.id)}
          >
            <span className={css.choiceDigit} aria-hidden='true'>
              {CHOICE_DIGITS[index]}
            </span>
            <span className={css.choiceLabel}>{option.label[locale]}</span>
          </button>
        ))}
      </fieldset>
      <span className={css.consoleRail}>
        <span className={css.answerHint}>{copy.answerHint}</span>
        <span className={css.streakReadout}>
          {copy.streak} <strong>×{state.currentStreak}</strong>
        </span>
      </span>
    </aside>
  )
}
