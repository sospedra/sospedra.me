const TELEGRAM_TOKEN = process.env.SOSPEDRA_BOT
const CHAT_ID = '-259122205'

const callTelegram = async (
  method: 'sendMessage',
  params: Record<string, string>,
) => {
  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`)
  url.search = new URLSearchParams(params).toString()
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`telegram ${method} failed: ${response.status}`)
  }
  return response
}

export const sendMessage = ({ text }: { text: string }) => {
  return callTelegram('sendMessage', { chat_id: CHAT_ID, text })
}
