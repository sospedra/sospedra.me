import { normalize } from './normalize.ts'

const ICON_BY_KEYWORD: readonly (readonly [string, string])[] = [
  ['ajedrez', '/icons/chess.png'],
  ['baloncesto', '/icons/basketball.png'],
  ['balonmano', '/icons/handball.png'],
  ['beisbol', '/icons/baseball.png'],
  ['boxeo', '/icons/boxing.png'],
  ['ciclismo', '/icons/cycling.png'],
  ['eurocopa', '/icons/football.png'],
  ['f1', '/icons/car.png'],
  ['futbol', '/icons/football.png'],
  ['golf', '/icons/golf.png'],
  ['handball', '/icons/handball.png'],
  ['hockey', '/icons/hockey.png'],
  ['moto gp', '/icons/moto.png'],
  ['motogp', '/icons/moto.png'],
  ['olympic', '/icons/olympic.png'],
  ['open', '/icons/tennis.png'],
  ['ping', '/icons/ping-pong.png'],
  ['rugby', '/icons/rugby.png'],
  ['tenis de mesa', '/icons/ping-pong.png'],
  ['tenis', '/icons/tennis.png'],
  ['tennis', '/icons/tennis.png'],
  ['tour', '/icons/cycling.png'],
  ['vela', '/icons/sailing.png'],
  ['volley', '/icons/volleyball.png'],
  ['waterpolo', '/icons/waterpolo.png'],
]

const ICON_BY_ACRONYM: readonly (readonly [string, string])[] = [
  ['MMA', '/icons/boxing.png'],
  ['NBA', '/icons/basketball.png'],
  ['NFL', '/icons/american-football.png'],
]

export const FALLBACK_ICON = '/icons/other.png'

export const sportIcon = (input: string): string => {
  const sport = normalize(input)
  const byKeyword = ICON_BY_KEYWORD.find(([keyword]) => sport.includes(keyword))
  if (byKeyword) return byKeyword[1]
  const byAcronym = ICON_BY_ACRONYM.find(([acronym]) => input.includes(acronym))
  return byAcronym?.[1] ?? FALLBACK_ICON
}
