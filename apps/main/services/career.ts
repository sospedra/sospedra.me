import { cacheLife } from 'next/cache'

const CAREER_START_YEAR = 2013

// cached: new Date() is banned at prerender; a day of staleness heals new year
export const yearsSinceCareerStart = async () => {
  'use cache'
  cacheLife('days')
  return new Date().getUTCFullYear() - CAREER_START_YEAR
}
