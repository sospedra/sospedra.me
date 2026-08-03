const ENDPOINT = 'https://backend.smartgames.media/api/game/crossword/last'

/* The API gates on the caller's origin; send the one it accepts. */
const HEADERS = {
  accept: 'application/vnd.api+json',
  'accept-language': 'en-US,en;q=0.9,es;q=0.8',
  'content-type': 'application/vnd.api+json',
  origin: 'https://www.eldiario.es',
}

export class SpanishFeedError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`spanish crossword feed answered ${status}`)
    this.name = 'SpanishFeedError'
    this.status = status
  }
}

/* Hole policy: one attempt, ten-second timeout. A transient failure throws,
   so the caller never caches it as a missing edition. */
export const fetchSpanishDailyPayload = async (): Promise<unknown> => {
  const response = await fetch(ENDPOINT, {
    headers: HEADERS,
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new SpanishFeedError(response.status)
  return response.json()
}
