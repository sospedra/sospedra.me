import { NextApiRequest, NextApiResponse } from 'next'
import { igToTw } from './igToTw'

export default async function ifttt(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'POST': {
        await igToTw(req.body)
        return res.end()
      }

      default:
        return res.status(405).send('Method not allowed')
    }
  } catch (ex) {
    return res.status(500).send(ex)
  }
}
