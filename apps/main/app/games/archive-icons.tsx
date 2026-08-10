import type { ReactNode } from 'react'
import type { ArchiveId } from './catalogue'
import { LifeIcon, MinesIcon, RubiksIcon, SnakeIcon } from './classic-icons'
import { BoomboxIcon, CrosswordsIcon, MeridianIcon } from './daily-icons'
import { CameraIcon, CimsIcon } from './toy-icons'

export const ARCHIVE_ICONS = {
  geo: MeridianIcon,
  crosswords: CrosswordsIcon,
  boombox: BoomboxIcon,
  snake: SnakeIcon,
  mines: MinesIcon,
  rubiks: RubiksIcon,
  life: LifeIcon,
  cims: CimsIcon,
  camera: CameraIcon,
} satisfies Record<ArchiveId, () => ReactNode>
