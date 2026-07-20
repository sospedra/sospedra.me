import { connection } from 'next/server'
import { sendMessage } from 'service/telegram'

const RATE_THRESHOLD = 0.85
const DAY_MS = 24 * 60 * 60 * 1000

const fetchRate = async (date: Date) => {
  const day = date.toISOString().slice(0, 10)
  const response = await fetch(
    `https://api.exchangeratesapi.io/${day}?base=USD&symbols=EUR`,
  )
  if (!response.ok) {
    throw new Error(`exchange api failed: ${response.status}`)
  }
  const payload: { rates: { EUR: number } } = await response.json()
  return payload.rates.EUR
}

export async function GET() {
  // the fetch must run per request, never at build
  await connection()

  try {
    const now = new Date()
    const [today, yesterday] = await Promise.all([
      fetchRate(now),
      fetchRate(new Date(now.getTime() - DAY_MS)),
    ])

    if (today >= RATE_THRESHOLD) {
      const text = `
    💰 EUR/USD hits ${today.toFixed(4)} today!
${
  today > yesterday ? '🐃 It is increasing' : '🐻 It is going down'
}. Yesterday rate was ${yesterday.toFixed(4)}.
  `
      await sendMessage({ text })
    }

    return new Response(null, { status: 200 })
  } catch (ex) {
    return new Response(String(ex), { status: 500 })
  }
}
