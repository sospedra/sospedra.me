import type { Metadata } from 'next'
import ScavengerView from './scavenger-view'

export const metadata: Metadata = {
  title: 'Side projects',
  description:
    "The scavenger's CD wallet. Thirteen side projects pressed to disc: flip the sleeves, pull one out, read the liner notes.",
  alternates: { canonical: '/scavenger' },
}

export default function ScavengerPage() {
  return <ScavengerView />
}
