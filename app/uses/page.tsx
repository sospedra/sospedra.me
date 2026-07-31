import type { Metadata } from 'next'
import { yearsSinceCareerStart } from 'service/career'
import { USES_DESC } from 'service/descriptions'
import RamenView from './ramen-view'

export const metadata: Metadata = {
  title: 'Uses',
  description: USES_DESC,
  alternates: { canonical: '/uses' },
}

export default async function UsesPage() {
  const level = await yearsSinceCareerStart()
  return <RamenView level={level} />
}
