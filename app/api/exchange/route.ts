import { subDays, format } from 'date-fns'
import { sendMessage } from 'service/telegram'

// the fetch must run per request, never at build
export const dynamic = 'force-dynamic'

const RATE_THRESHOLD = 0.85

const fetchRate = async (date: Date) => {
  const day = format(date, 'yyyy-MM-dd')
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
  try {
    const now = new Date()
    const [today, yesterday] = await Promise.all([
      fetchRate(now),
      fetchRate(subDays(now, 1)),
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
