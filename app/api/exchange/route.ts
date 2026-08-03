import { connection } from 'next/server'
import { isRecord } from 'services/is-record'
import { DAY_MS, utcDayString } from 'services/time'
import { sendMessage } from './telegram'

const RATE_THRESHOLD = 0.85

const eurRateFrom = (payload: unknown): number | null => {
  if (!isRecord(payload) || !isRecord(payload.rates)) return null
  const eur = payload.rates.EUR
  return typeof eur === 'number' && Number.isFinite(eur) ? eur : null
}

const fetchRate = async (date: Date): Promise<number | null> => {
  const day = utcDayString(date)
  const response = await fetch(
    `https://api.exchangeratesapi.io/${day}?base=USD&symbols=EUR`,
    { signal: AbortSignal.timeout(10_000) },
  ).catch(() => null)
  if (!response?.ok) return null

  const payload: unknown = await response.json().catch(() => null)
  return eurRateFrom(payload)
}

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
