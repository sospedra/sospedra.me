import type { Metadata } from 'next'
import AboutView from './about-view'

export const metadata: Metadata = {
  title: 'About',
  description: 'javascript hacker ▼ fullstack engineer contractor',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return <AboutView />
}
