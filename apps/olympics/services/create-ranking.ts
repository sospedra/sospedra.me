import type { Medal } from './medals'
import type { SportRecord } from './records'

export const createRanking = (medals: Medal[], records: SportRecord[]) => {
  const ranking = medals.map((medal) => {
    const byNoc = records.filter(({ noc }) => noc === medal.noc.toUpperCase())
    const wr = byNoc.filter(({ type }) => type === 'WR').length
    const or = byNoc.length - wr
    const fromMedals = medal.gold * 3 + medal.silver * 2 + medal.bronze

    return {
      medal,
      noc: medal.noc,
      records: { wr, or },
      score: fromMedals + wr * 3 + or * 2,
    }
  })

  return ranking.toSorted((a, b) => b.score - a.score)
}
