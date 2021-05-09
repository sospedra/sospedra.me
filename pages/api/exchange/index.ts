import { NextApiRequest, NextApiResponse } from 'next'
import { subDays, format } from 'date-fns'
import got from 'got'
import { sendMessage } from 'service/telegram'

const RATE_THRESHOLD = 0.85

const fechRate = async (date: Date) => {
  const day = format(date, 'yyyy-MM-dd')
  const response = await got(
    `https://api.exchangeratesapi.io/${day}?base=USD&symbols=EUR`,
  )
  const payload: { rates: { EUR: number } } = JSON.parse(response.body)
  return payload.rates.EUR
}

export default async function exchange(
  _: NextApiRequest,
  res: NextApiResponse,
) {
  const now = new Date()
  const [today, yesterday] = await Promise.all([
    fechRate(now),
    fechRate(subDays(now, 1)),
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
