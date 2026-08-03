import 'server-only'
import { serverEnv } from 'services/env.server'
import { http } from 'services/http'

const CHAT_ID = '-259122205'

export type TelegramSendOutcome = 'sent' | 'missing-token' | 'upstream-error'

const callTelegram = async (url: URL): Promise<TelegramSendOutcome> => {
  try {
    await http(url)
    return 'sent'
  } catch {
    return 'upstream-error'
  }
}

export const sendMessage = ({
  text,
}: {
  text: string
}): Promise<TelegramSendOutcome> => {
  const token = serverEnv.telegramBotToken
  if (!token) return Promise.resolve('missing-token')

  const url = new URL(`https://api.telegram.org/bot${token}/sendMessage`)
  url.search = new URLSearchParams({ chat_id: CHAT_ID, text }).toString()
  return callTelegram(url)
}
