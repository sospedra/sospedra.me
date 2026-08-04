import medals from '../data/medals.json'

export type Medal = {
  name: string
  noc: string
  gold: number
  silver: number
  bronze: number
  classicRank: number
}

// The Tokyo 2020 site is offline and the games ended on 2021-08-08.
// The dataset is final, so the app reads a committed snapshot.
// See scripts/recover-data.mts for the provenance.
export const loadMedals = (): Medal[] => medals
