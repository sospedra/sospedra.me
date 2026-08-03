export type VisitorLocation = {
  located: boolean
  lat?: number
  lon?: number
  city?: string
  country?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const finiteOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const stringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const visitorLocationFrom = (payload: unknown): VisitorLocation | null => {
  if (!isRecord(payload) || typeof payload.located !== 'boolean') return null
  return {
    located: payload.located,
    lat: finiteOrUndefined(payload.lat),
    lon: finiteOrUndefined(payload.lon),
    city: stringOrUndefined(payload.city),
    country: stringOrUndefined(payload.country),
  }
}

let request: Promise<VisitorLocation | null> | null = null

// One lookup per session: the answer is stable for the visitor, and a failed
// attempt clears the slot so a later consumer can retry.
export const fetchVisitorLocation = (): Promise<VisitorLocation | null> => {
  request ??= fetch('/api/geo', { cache: 'no-store' })
    .then(async (response) =>
      response.ok ? visitorLocationFrom(await response.json()) : null,
    )
    .catch(() => {
      request = null
      return null
    })
  return request
}
