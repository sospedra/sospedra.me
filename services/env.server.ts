import process from 'node:process'

/* The one server env home. The node: import fails any client bundle that
   reaches for it. Optional values degrade: a missing bot token turns the
   exchange alert into a no-op instead of failing the boot. */
export const serverEnv = {
  telegramBotToken: process.env.SOSPEDRA_BOT ?? null,
  meridianPublicationDate: process.env.MERIDIAN_PUBLICATION_DATE ?? null,
} as const
