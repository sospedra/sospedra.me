import {
  createExternalStore,
  type ExternalStore,
} from 'services/external-store'
import type { SurfaceMode } from './scene.ts'
import type { TourTarget } from './tour-machine.ts'

export type { TourTarget }

export type PeakLabel = { name: string; elev: number }

export type CimsSnapshot = {
  ready: boolean
  target: TourTarget
  seqIndex: number
  enRoute: boolean
  distanceKm: number
  autoOn: boolean
  surfaceMode: SurfaceMode
  exaggeration: number
  peakLabels: readonly PeakLabel[]
}

export type CimsStore = ExternalStore<CimsSnapshot>

export const INITIAL_EXAGGERATION = 2.8

export const createCimsStore = (): CimsStore =>
  createExternalStore<CimsSnapshot>({
    ready: false,
    target: { kind: 'mountain', index: 0 },
    seqIndex: 0,
    enRoute: false,
    distanceKm: 0,
    autoOn: true,
    surfaceMode: 'contour',
    exaggeration: INITIAL_EXAGGERATION,
    peakLabels: [],
  })
