import got from 'got'

const TELEGRAM_TOKEN = process.env.SOSPEDRA_BOT
const CHAT_ID = '-259122205'
const PROSOQUE_ID = '@prosoque'

type ChatID = typeof CHAT_ID | typeof PROSOQUE_ID

export const sendMessage = ({
  text,
  chatID = CHAT_ID,
}: {
  text: string
  chatID?: ChatID
}) => {
  return got(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    searchParams: {
      chat_id: CHAT_ID,
      text,
    },
  })
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
  return got(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    searchParams: {
      chat_id: chatID,
      caption,
      photo,
    },
  })
}
