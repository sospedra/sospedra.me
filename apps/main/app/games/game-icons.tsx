import type { ReactNode } from 'react'
import type { GameId } from './catalogue'
import { LifeIcon, MinesIcon, RubiksIcon, SnakeIcon } from './classic-icons'
import { BoomboxIcon, CrosswordsIcon, MeridianIcon } from './daily-icons'

export const GAME_ICONS = {
  geo: MeridianIcon,
  crosswords: CrosswordsIcon,
  boombox: BoomboxIcon,
  snake: SnakeIcon,
  mines: MinesIcon,
  rubiks: RubiksIcon,
  life: LifeIcon,
} satisfies Record<GameId, () => ReactNode>
