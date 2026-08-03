import { connection } from 'next/server'
import { fetchJson } from 'services/http'
import { DAY_MS, utcDayString } from 'services/time'
import * as z from 'zod/mini'
import { sendMessage } from './telegram'

const RATE_THRESHOLD = 0.85

const eurRateSchema = z.object({ rates: z.object({ EUR: z.number() }) })

const fetchRate = (date: Date): Promise<number | null> =>
  fetchJson(
    `https://api.exchangeratesapi.io/${utcDayString(date)}?base=USD&symbols=EUR`,
    eurRateSchema,
  )
    .then((payload) => payload.rates.EUR)
    .catch(() => null)

export async function GET() {
  // the fetch must run per request, never at build
  await connection()

  const now = new Date()
  const [today, yesterday] = await Promise.all([
    fetchRate(now),
    fetchRate(new Date(now.getTime() - DAY_MS)),
  ])
  if (today === null || yesterday === null) {
    return Response.json({ ok: false }, { status: 502 })
  }
  if (today < RATE_THRESHOLD) {
    return Response.json({ ok: true, notified: false })
  }

  const text = `
    💰 EUR/USD hits ${today.toFixed(4)} today!
${
  today > yesterday ? '🐃 It is increasing' : '🐻 It is going down'
}. Yesterday rate was ${yesterday.toFixed(4)}.
  `
  const outcome = await sendMessage({ text })
  if (outcome !== 'sent') {
    return Response.json({ ok: false, outcome }, { status: 502 })
  }
  return Response.json({ ok: true, notified: true })
}
