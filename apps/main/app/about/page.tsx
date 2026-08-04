import type { Metadata } from 'next'
import { yearsSinceCareerStart } from 'services/career'
import AboutView from './about-view'

export const metadata: Metadata = {
  title: 'About',
  description: 'javascript hacker ▼ principal engineer',
  alternates: { canonical: '/about' },
}

export default async function AboutPage() {
  const years = await yearsSinceCareerStart()
  return <AboutView years={years} />
}
