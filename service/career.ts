const CAREER_START_YEAR = 2013

// cached: the age bakes at build, new Date() is banned at prerender
export const yearsSinceCareerStart = async () => {
  'use cache'
  return new Date().getUTCFullYear() - CAREER_START_YEAR
}
