import records from '../data/records.json'

export type SportRecord = {
  type: 'WR' | 'OR'
  noc: string
}

export const loadRecords = (): SportRecord[] =>
  records.map((record) => ({
    noc: record.noc,
    type: record.type === 'WR' ? 'WR' : 'OR',
  }))
