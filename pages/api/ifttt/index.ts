import { NextApiRequest, NextApiResponse } from 'next'
import { emitOnTelegram } from 'service/telegram'

export default async function ifttt(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'POST': {
        await emitOnTelegram(JSON.stringify(req.body))
        return res.end()
      }

      default:
        return res.status(405).send('Method not allowed')
    }
  } catch (ex) {
    console.log(ex)
    return res.status(500).send(ex)
  }
}
