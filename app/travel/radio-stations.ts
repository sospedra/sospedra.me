import { groupBy } from 'es-toolkit'
import stationData from './radio-stations.json'

export type RadioStationFormat = 'AAC' | 'HLS' | 'MP3' | 'OGG'

export type RadioStation = {
  station: string
  destinationCode: string
  stationUuid: string | null
  city: string | null
  country: string
  latitude: number | null
  longitude: number | null
  streamUrl: string
  format: RadioStationFormat
  bitrateKbps: number | null
  homepage: string | null
  directorySource: 'Official station website' | 'Radio Browser'
  verifiedAt: string
  verification: {
    httpStatus: number
    contentType: string
    working: true
  }
}

export const RADIO_STATIONS = stationData as RadioStation[]

const stationsByDestination = groupBy(
  RADIO_STATIONS,
  (station) => station.destinationCode,
)

export const getRadioStations = (
  destinationCode: string,
): readonly RadioStation[] => stationsByDestination[destinationCode] ?? []
