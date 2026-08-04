import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import css from './answer-console.module.css'
import type { GeoGameState } from './game-state'
import type { GeoLocale, GeoMessages } from './geo-messages'
import shell from './geo-shell.module.css'
import type { LocalizedOption } from './model'
import {
  buildGeoAutocompleteIndex,
  isMeaningfulGeoAnswerInput,
  rankGeoAutocompleteIndex,
  resolveExactGeoOptionId,
} from './text-answer'

const ANSWER_MAX_LENGTH = 64
const AUTOCOMPLETE_MAX_RESULTS = 8
const AUTOCOMPLETE_MIN_CHARACTERS = 1

export function TextAnswerConsole({
  copy,
  lexicon,
  locale,
  onAnswer,
  options,
  placeholder,
  state,
}: {
  copy: GeoMessages
  lexicon: LocalizedOption[]
  locale: GeoLocale
  onAnswer: (answer: { optionId: string | null; submittedText: string }) => void
  options: LocalizedOption[]
  placeholder: string
  state: GeoGameState
}) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const listboxId = useId()
  const active = state.phase === 'question'
  const lexiconIndex = useMemo(
    () => buildGeoAutocompleteIndex(lexicon, locale),
    [lexicon, locale],
  )
  const candidates = useMemo(
    () =>
      rankGeoAutocompleteIndex(value, lexiconIndex, {
        maxResults: AUTOCOMPLETE_MAX_RESULTS,
        minimumCharacters: AUTOCOMPLETE_MIN_CHARACTERS,
      }),
    [lexiconIndex, value],
  )
  const expanded = active && focused && !dismissed && candidates.length > 0
  const meaningful = isMeaningfulGeoAnswerInput(value, locale)

  useEffect(() => {
    if (!active) return
    window.requestAnimationFrame(() =>
      inputRef.current?.focus({ preventScroll: true }),
    )
  }, [active])

  const transmit = (answer: string) => {
    const submittedText = answer.trim()
    if (!submittedText || !active) return
    onAnswer({
      optionId: resolveExactGeoOptionId(submittedText, options, locale),
      submittedText,
    })
  }

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!value.trim()) return

    const exactCurrentOption = resolveExactGeoOptionId(value, options, locale)
    if (exactCurrentOption) {
      transmit(value)
      return
    }

    const candidate = expanded ? candidates[activeIndex] : null
    transmit(candidate?.label ?? value)
  }

  const handleAnswerKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const canCycle = candidates.length > 0 && !dismissed
    const keyActions: Record<string, (() => void) | false> = {
      ArrowDown:
        canCycle &&
        (() => setActiveIndex((index) => (index + 1) % candidates.length)),
      ArrowUp:
        canCycle &&
        (() =>
          setActiveIndex(
            (index) => (index - 1 + candidates.length) % candidates.length,
          )),
      Escape: expanded && (() => setDismissed(true)),
    }

    const action = keyActions[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  return (
    <aside
      className={css.answerConsole}
      data-mode='text'
      aria-label={copy.answerInput}
    >
      <form className={css.chatForm} onSubmit={submitForm}>
        <label
          id={`${inputId}-label`}
          className={shell.srOnly}
          htmlFor={inputId}
        >
          {copy.answerInput}
        </label>
        <div className={css.commandLine}>
          <span className={css.commandPrefix} aria-hidden='true'>
            TX&gt;
          </span>
          <input
            ref={inputRef}
            id={inputId}
            className={css.answerInput}
            type='text'
            value={value}
            disabled={!active}
            maxLength={ANSWER_MAX_LENGTH}
            autoCapitalize='words'
            autoComplete='off'
            enterKeyHint='send'
            spellCheck={false}
            placeholder={placeholder}
            role='combobox'
            aria-autocomplete='list'
            aria-labelledby={`${inputId}-label geo-question-title`}
            aria-controls={expanded ? listboxId : undefined}
            aria-expanded={expanded}
            aria-activedescendant={
              expanded ? `${listboxId}-option-${activeIndex}` : undefined
            }
            aria-describedby={`${inputId}-hint`}
            onBlur={() => setFocused(false)}
            onFocus={() => {
              setFocused(true)
              setDismissed(false)
            }}
            onChange={(event) => {
              setValue(event.target.value)
              setActiveIndex(0)
              setDismissed(false)
            }}
            onKeyDown={handleAnswerKeyDown}
          />
          <button
            type='submit'
            className={css.sendButton}
            disabled={!active || value.trim().length === 0}
          >
            <span>{copy.sendAnswer}</span>
            <span aria-hidden='true'>↗</span>
          </button>
        </div>

        <span id={`${inputId}-hint`} className={css.answerHint}>
          {copy.answerHint}
        </span>

        {expanded && (
          <div
            id={listboxId}
            className={css.autocompleteList}
            role='listbox'
            aria-label={copy.autocompleteResults}
          >
            {candidates.map((candidate, index) => (
              <button
                id={`${listboxId}-option-${index}`}
                key={candidate.optionId}
                type='button'
                role='option'
                aria-selected={index === activeIndex}
                tabIndex={-1}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => transmit(candidate.label)}
              >
                <span>{candidate.label}</span>
                <span className={css.autocompleteArrow} aria-hidden='true'>
                  ↗
                </span>
              </button>
            ))}
          </div>
        )}

        {active &&
          focused &&
          meaningful &&
          candidates.length === 0 &&
          !dismissed && (
            <span className={css.noAutocompleteResults} role='status'>
              {copy.noAutocompleteResults}
            </span>
          )}
      </form>
      <span className={css.streakReadout}>
        {copy.streak} <strong>×{state.currentStreak}</strong>
      </span>
    </aside>
  )
}
