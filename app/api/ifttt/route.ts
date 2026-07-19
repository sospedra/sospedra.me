import { igToTw } from 'service/ifttt/ig-to-tw'

export async function POST(req: Request) {
  try {
    await igToTw(await req.text())
    return new Response(null, { status: 200 })
  } catch (ex) {
    return new Response(String(ex), { status: 500 })
  }
}
