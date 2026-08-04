import {
  PRESENTATION,
  type StationBadge,
  type StationPresentation,
} from './presentation.ts'
import stationData from './stations.json'

export type { StationBadge }

export type StationRecord = {
  id: string
  name: string
  icyName: string
  streamUrl: string
  format: 'MP3'
  bitrateKbps: number | null
  verifiedAt: string
  verification: {
    httpStatus: number
    contentType: string
    working: true
  }
}

export type RealStation = StationRecord & {
  tagline: string
  badge: StationBadge
}

const RECORDS = stationData as StationRecord[]
const recordsById = new Map(RECORDS.map((record) => [record.id, record]))

const toStation = ({
  id,
  tagline,
  badge,
}: StationPresentation): RealStation => {
  const record = recordsById.get(id)
  if (!record)
    throw new Error(`RealPlayer station "${id}" has no corpus entry.`)
  return { ...record, tagline, badge }
}

// scripts/w98/verify-realplayer-streams.ts enforces corpus/presentation sync in CI
export const REAL_STATIONS: RealStation[] = PRESENTATION.map(toStation)

export const stationById = (id: string): RealStation | undefined =>
  REAL_STATIONS.find((station) => station.id === id)

export const STATIONS_VERIFIED_AT = RECORDS.reduce(
  (latest, record) => (record.verifiedAt > latest ? record.verifiedAt : latest),
  RECORDS[0]?.verifiedAt ?? '',
)
