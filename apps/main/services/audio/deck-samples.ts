export const DECK_SAMPLE_URLS = {
  button: '/talks/sfx/button',
  insert: '/talks/sfx/vhs-insert',
} as const

export type DeckSampleName = keyof typeof DECK_SAMPLE_URLS

export const deckSampleExtension = (): string => {
  if (typeof document === 'undefined') return 'm4a'
  const probe = document.createElement('audio')
  return probe.canPlayType('audio/webm; codecs=opus') ? 'webm' : 'm4a'
}

export const deckSampleUrl = (name: DeckSampleName): string =>
  `${DECK_SAMPLE_URLS[name]}.${deckSampleExtension()}`
