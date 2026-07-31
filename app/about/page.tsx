import type { Metadata } from 'next'
import { yearsSinceCareerStart } from 'service/career'
import { ABOUT_DESC } from 'service/descriptions'
import AboutView from './about-view'

export const metadata: Metadata = {
  title: 'About',
  description: ABOUT_DESC,
  alternates: { canonical: '/about' },
}

export default async function AboutPage() {
  const years = await yearsSinceCareerStart()
  return <AboutView years={years} />
}
