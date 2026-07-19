const TELEGRAM_TOKEN = process.env.SOSPEDRA_BOT
const CHAT_ID = '-259122205'
const PROSOQUE_ID = '@prosoque'

type ChatID = typeof CHAT_ID | typeof PROSOQUE_ID

const callTelegram = async (
  method: 'sendMessage' | 'sendPhoto',
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

export const sendMessage = ({
  text,
  chatID = CHAT_ID,
}: {
  text: string
  chatID?: ChatID
}) => {
  return callTelegram('sendMessage', { chat_id: chatID, text })
}

export const sendPhoto = ({
  caption,
  photo,
  chatID = CHAT_ID,
}: {
  caption: string
  photo: string
  chatID?: ChatID
}) => {
  return callTelegram('sendPhoto', { chat_id: chatID, caption, photo })
}
