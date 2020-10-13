import { NextApiRequest, NextApiResponse } from 'next'
import { subDays, format } from 'date-fns'
import got from 'got'

const RATE_THRESHOLD = 0.86
const TELEGRAM_TOKEN = process.env.SOSPEDRA_BOT
const CHAT_ID = '-259122205'

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
    await got(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      searchParams: {
        chat_id: CHAT_ID,
        text: `
          💰 EUR/USD hits ${today.toFixed(4)} today!
${
  today > yesterday ? '🐃 It is increasing' : '🐻 It is going down'
}. Yesterday rate was ${yesterday.toFixed(4)}.
        `,
      },
    })
  }

  res.send(200)
}
