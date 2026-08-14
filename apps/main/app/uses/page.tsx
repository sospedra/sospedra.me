import type { Metadata } from 'next'
import { yearsSinceCareerStart } from 'services/career'
import { routeViewport } from 'services/chrome'
import RamenView from './ramen-view'

export const metadata: Metadata = {
  title: 'Uses',
  description:
    'The exact hardware and software I work with, served as a late-night ramen menu: the bowls, the broth, the toppings. Prices in verdict-yen. Highly opinionated.',
  alternates: { canonical: '/uses' },
}

export const viewport = routeViewport('/uses')

export default async function UsesPage() {
  const level = await yearsSinceCareerStart()
  return <RamenView level={level} />
}
