#!/usr/bin/env node

import { OFFICIAL_COUNTRY_OPTIONS } from '../../app/meridian/country-lexicon.ts'
import type { Locale } from '../../app/meridian/model.ts'
import {
  rankGeoAutocompleteCandidates,
  resolveExactGeoOptionId,
} from '../../app/meridian/text-answer.ts'

const EXPECTED_COUNTRY_COUNT = 194
const locales: Locale[] = ['en', 'es']
const errors: string[] = []

const check = (condition: unknown, message: string) => {
  if (!condition) errors.push(message)
}

const normalizedLabel = (label: string, locale: Locale) =>
  label.normalize('NFC').trim().toLocaleLowerCase(locale)

check(
  OFFICIAL_COUNTRY_OPTIONS.length === EXPECTED_COUNTRY_COUNT,
  `Expected ${EXPECTED_COUNTRY_COUNT} official countries, found ${OFFICIAL_COUNTRY_OPTIONS.length}`,
)

const ids = OFFICIAL_COUNTRY_OPTIONS.map((option) => option.id)
check(new Set(ids).size === ids.length, 'Country option ids must be unique')
check(ids.includes('country-ps'), 'The State of Palestine must be present')
check(ids.includes('country-va'), 'The Holy See must be present')
check(
  !ids.includes('country-il'),
  'The editorially excluded IL code must be absent',
)

for (const option of OFFICIAL_COUNTRY_OPTIONS) {
  check(
    /^country-[a-z]{2}$/u.test(option.id),
    `Invalid country option id: ${option.id}`,
  )

  for (const locale of locales) {
    const label = option.label[locale]
    check(label.length > 0, `${option.id} is missing its ${locale} label`)
    check(
      label === label.normalize('NFC'),
      `${option.id} ${locale} label is not NFC-normalized`,
    )
    check(
      label === label.trim(),
      `${option.id} ${locale} label has surrounding whitespace`,
    )
    check(
      resolveExactGeoOptionId(label, OFFICIAL_COUNTRY_OPTIONS, locale) ===
        option.id,
      `${option.id} ${locale} label cannot be resolved exactly`,
    )
    check(
      rankGeoAutocompleteCandidates(label, OFFICIAL_COUNTRY_OPTIONS, locale, {
        maxResults: 1,
      })[0]?.optionId === option.id,
      `${option.id} ${locale} label is not the top autocomplete match`,
    )
  }
}

for (const locale of locales) {
  const idsByLabel = new Map<string, string[]>()
  for (const option of OFFICIAL_COUNTRY_OPTIONS) {
    const label = normalizedLabel(option.label[locale], locale)
    idsByLabel.set(label, [...(idsByLabel.get(label) ?? []), option.id])
  }

  for (const [label, matchingIds] of idsByLabel) {
    check(
      matchingIds.length === 1,
      `Ambiguous ${locale} label "${label}": ${matchingIds.join(', ')}`,
    )
  }
}

if (errors.length > 0) {
  console.error(`Country lexicon validation failed:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log(
    `Country lexicon validation passed: ${OFFICIAL_COUNTRY_OPTIONS.length} bilingual options`,
  )
}
