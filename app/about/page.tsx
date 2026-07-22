import type { Metadata } from 'next'
import AboutView from './about-view'

export const metadata: Metadata = {
  title: 'About',
  description: 'javascript hacker ▼ principal engineer',
  alternates: { canonical: '/about' },
}

// cached: the career age bakes at build, new Date() is banned at prerender
const getYearsSince = async (start: number) => {
  'use cache'
  return new Date().getUTCFullYear() - start
}

export default async function AboutPage() {
  const years = await getYearsSince(2013)
  return <AboutView years={years} />
}
