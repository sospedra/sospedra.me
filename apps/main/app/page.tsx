import type { Metadata } from 'next'
import { routeViewport } from 'services/chrome'
import HomeView from './home/home-view'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export const viewport = routeViewport('/')

export default function HomePage() {
  return <HomeView />
}
