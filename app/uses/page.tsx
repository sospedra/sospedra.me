import type { Metadata } from 'next'
import { USES_DESC } from 'service/descriptions'
import RamenView from './ramen-view'

export const metadata: Metadata = {
  title: 'Uses',
  description: USES_DESC,
  alternates: { canonical: '/uses' },
}

// cached: the level bakes at build, new Date() is banned at prerender
const getLevelSince = async (start: number) => {
  'use cache'
  return new Date().getUTCFullYear() - start
}

export default async function UsesPage() {
  const level = await getLevelSince(2013)
  return <RamenView level={level} />
}
