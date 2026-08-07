import { normalize } from './normalize.ts'

const FLAG_BY_KEYWORD: readonly (readonly [string, string])[] = [
  ['australia', '🇦🇺'],
  ['bundesliga', '🇩🇪'],
  ['champions league', '🇪🇺'],
  ['championship', '🇪🇺'],
  ['copa del rey', '🇪🇸'],
  ['coupe', '🇫🇷'],
  ['dfb pokal', '🇩🇪'],
  ['efl cup', '🇬🇧'],
  ['eurocopa', '🇪🇺'],
  ['europeo', '🇪🇺'],
  ['eurocup', '🇪🇺'],
  ['euroliga', '🇪🇺'],
  ['fa cup', '🇬🇧'],
  ['france', '🇫🇷'],
  ['francia', '🇫🇷'],
  ['italia', '🇮🇹'],
  ['la liga', '🇪🇸'],
  ['laliga', '🇪🇸'],
  ['liga endesa', '🇪🇸'],
  ['liga regular', '🇺🇸'],
  ['ligue', '🇫🇷'],
  ['playoffs', '🇺🇸'],
  ['portugal', '🇵🇹'],
  ['premier league', '🇬🇧'],
  ['primeira', '🇵🇹'],
  ['serie a', '🇮🇹'],
  ['supercopa', '🇪🇸'],
  ['taca', '🇵🇹'],
  ['us open', '🇺🇸'],
  ['wimbledon', '🇬🇧'],
]

export const competitionFlag = (competition: string): string | null => {
  const normalized = normalize(competition)
  const entry = FLAG_BY_KEYWORD.find(([keyword]) =>
    normalized.includes(keyword),
  )
  return entry?.[1] ?? null
}
