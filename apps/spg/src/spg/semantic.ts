import { deburr } from './deburr.ts'

const RX_HTML_TAG = /<[^>]+>/g
const RX_HTML_ENTITY = /&[a-z]+;|&#\d+;/gi
const RX_PUNCTUATION = /[\p{P}\p{S}]/gu
const RX_WHITESPACE = /\s+/g

const SENTENCE_SEGMENTER = new Intl.Segmenter('en', { granularity: 'sentence' })

const collapseSpaces = (input: string) =>
  input.replace(RX_WHITESPACE, ' ').trim()

const stripMarkup = (input: string) =>
  input.replace(RX_HTML_TAG, ' ').replace(RX_HTML_ENTITY, ' ')

const stripPunctuation = (input: string) => input.replace(RX_PUNCTUATION, ' ')

export function semantic(extract: string): string[] {
  const plain = collapseSpaces(deburr(stripMarkup(extract)))

  return [...SENTENCE_SEGMENTER.segment(plain)]
    .map(({ segment }) => collapseSpaces(stripPunctuation(segment)))
    .filter((sentence) => sentence.length > 0)
}
