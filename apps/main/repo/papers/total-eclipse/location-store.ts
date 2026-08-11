'use client'

import { createExternalStore, useStoreSelector } from 'services/external-store'
import { countryByCode, ECLIPSE_COUNTRIES } from './eclipse-countries.ts'
import { greatCircleKm } from './local-format.ts'

export type EclipseLocation = {
  /** 'default' until the IP resolves; a pick always wins over the IP. */
  source: 'default' | 'ip' | 'picked'
  latitude: number
  longitude: number
  /** City or site name when one is known. */
  label: string | null
  /** Country code among the nine, best effort for the verdict line. */
  country: string
  zone: string
}

const allSites = ECLIPSE_COUNTRIES.flatMap((country) =>
  country.sites.map((site) => ({
    ...site,
    country: country.code,
    zone: site.zone ?? country.zone,
  })),
)

export const nearestSite = (latitude: number, longitude: number) =>
  allSites.reduce((best, site) =>
    greatCircleKm(latitude, longitude, site.latitude, site.longitude) <
    greatCircleKm(latitude, longitude, best.latitude, best.longitude)
      ? site
      : best,
  )

/** Zones only shape the clock readout, so the nearest named site decides. */
export const zoneForPoint = (latitude: number, longitude: number): string =>
  nearestSite(latitude, longitude).zone

const DEFAULT_LOCATION: EclipseLocation = {
  source: 'default',
  latitude: 40.4168,
  longitude: -3.7038,
  label: 'Madrid',
  country: 'ES',
  zone: 'Europe/Madrid',
}

export const locationStore =
  createExternalStore<EclipseLocation>(DEFAULT_LOCATION)

export const useEclipseLocation = (): EclipseLocation =>
  useStoreSelector(locationStore, (location) => location)

export const pickLocation = (
  latitude: number,
  longitude: number,
  label: string | null,
) => {
  const site = nearestSite(latitude, longitude)
  locationStore.set({
    source: 'picked',
    latitude,
    longitude,
    label,
    country: site.country,
    zone: site.zone,
  })
}

export const pickCountry = (code: string) => {
  const country = countryByCode(code)
  const [first] = country.sites
  locationStore.set({
    source: 'picked',
    latitude: first.latitude,
    longitude: first.longitude,
    label: first.name,
    country: country.code,
    zone: first.zone ?? country.zone,
  })
}

type GeoReply = {
  located: boolean
  lat?: number
  lon?: number
  city?: string
}

const fetchIpLocation = async (): Promise<EclipseLocation | null> => {
  const reply = await fetch('/api/geo')
    .then((response) => response.json() as Promise<GeoReply>)
    .catch(() => null)
  if (!reply?.located || reply.lat === undefined || reply.lon === undefined) {
    return null
  }
  const site = nearestSite(reply.lat, reply.lon)
  return {
    source: 'ip',
    latitude: reply.lat,
    longitude: reply.lon,
    label: reply.city ?? null,
    country: site.country,
    zone: site.zone,
  }
}

let ipRequested = false

/** One shot per session; never clobbers a pick the reader already made. */
export const resolveFromIp = async () => {
  if (ipRequested) return
  ipRequested = true
  const located = await fetchIpLocation()
  if (!located || locationStore.get().source === 'picked') return
  locationStore.set(located)
}

/** The "my location" option: an explicit ask beats an earlier pick. */
export const forceIpLocation = async () => {
  ipRequested = true
  const located = await fetchIpLocation()
  if (located) locationStore.set(located)
}
