import type { CimsSnapshot } from './cims-store.ts'
import { padDigits } from './easing.ts'

export type TourNames = {
  mountains: readonly { title: string; elev: number; cap: string }[]
  cities: readonly { name: string }[]
}

const targetName = (snap: CimsSnapshot, names: TourNames): string =>
  snap.target.kind === 'mountain'
    ? names.mountains[snap.target.index].title
    : names.cities[snap.target.index].name

export const titleMain = (snap: CimsSnapshot, names: TourNames): string => {
  const arrow = snap.enRoute ? '→ ' : ''
  if (snap.target.kind === 'city') return arrow + targetName(snap, names)
  const mountain = names.mountains[snap.target.index]
  return `${arrow}${mountain.title} · ${mountain.elev} M`
}

export const stepTitle = (snap: CimsSnapshot, names: TourNames): string =>
  snap.target.kind === 'mountain'
    ? `${padDigits(snap.target.index + 1, 2)} · ${targetName(snap, names)}`
    : `CIUTAT · ${targetName(snap, names)}`

export const captionText = (snap: CimsSnapshot, names: TourNames): string => {
  if (snap.enRoute) {
    return `EN ROUTE → ${targetName(snap, names)} · ${snap.distanceKm} KM`
  }
  if (snap.target.kind === 'city') return `CIUTAT · ${targetName(snap, names)}`
  return names.mountains[snap.target.index].cap
}

export const seqText = (snap: CimsSnapshot, mountainCount: number): string =>
  `${padDigits(snap.seqIndex + 1, 2)}/${padDigits(mountainCount, 2)}`
