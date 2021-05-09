import got from 'got'

const TELEGRAM_TOKEN = process.env.SOSPEDRA_BOT
const CHAT_ID = '-259122205'

export const emitOnTelegram = (text: string) => {
  return got(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    searchParams: {
      chat_id: CHAT_ID,
      text,
    },
  })
}
