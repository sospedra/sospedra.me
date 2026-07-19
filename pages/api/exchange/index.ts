import { NextApiRequest, NextApiResponse } from 'next'
import { subDays, format } from 'date-fns'
import { sendMessage } from 'service/telegram'

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

export default async function exchange(
  _: NextApiRequest,
  res: NextApiResponse,
) {
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

  res.send(200)
}
