import { fetchJson } from 'services/http'
import * as z from 'zod/mini'

export type VisitorLocation = {
  located: boolean
  lat?: number
  lon?: number
  city?: string
  country?: string
}

const finiteOrUndefined = z.catch(z.optional(z.number()), undefined)
const stringOrUndefined = z.catch(
  z.optional(z.string().check(z.minLength(1))),
  undefined,
)

const visitorLocationSchema = z.object({
  located: z.boolean(),
  lat: finiteOrUndefined,
  lon: finiteOrUndefined,
  city: stringOrUndefined,
  country: stringOrUndefined,
})

let request: Promise<VisitorLocation | null> | null = null

// One lookup per session: the answer is stable for the visitor, and a failed
// attempt clears the slot so a later consumer can retry.
export const fetchVisitorLocation = (): Promise<VisitorLocation | null> => {
  request ??= fetchJson('/api/geo', visitorLocationSchema, {
    cache: 'no-store',
  }).catch(() => {
    request = null
    return null
  })
  return request
}
